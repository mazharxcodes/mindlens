import { MindLensEventBus } from "../core/event-bus";
import { PerspectiveService } from "./perspective-service";
import {
  BiasSnapshot,
  MindLensEvent,
  PerspectiveIntervention,
  ProviderDiagnostics
} from "../core/types";
import { nowIso } from "../core/utils";

const CARD_ID = "mindlens-intervention-card";
const CARD_VISIBLE_CLASS = "mindlens-card-visible";
const STYLE_ID = "mindlens-intervention-style";
const COOLDOWN_MS = 30_000;
const SCORE_DELTA_TO_RESHOW = 0.05;
const QUIET_WINDOW_MS = 900;
const MAX_SCROLL_VELOCITY_FOR_SHOW = 1400;
const MIN_ACTIVE_VIEW_MS = 1200;
const PATTERN_COOLDOWN_MS = 3 * 60_000;
const PENDING_INTERVENTION_GRACE_MS = 8_000;

export class InterventionController {
  private currentIntervention: PerspectiveIntervention | null = null;
  private lastShownAtMs = 0;
  private lastShownScore = 0;
  private readonly dismissals = new Set<string>();
  private readonly recentPatternShows = new Map<string, number>();
  private isGenerating = false;
  private lastScrollAtMs = Date.now();
  private lastScrollVelocity = 0;
  private activeViewPostId: string | null = null;
  private activeViewStartedAtMs: number | null = null;
  private pendingSnapshot: BiasSnapshot | null = null;
  private pendingSnapshotCapturedAtMs = 0;
  private pendingTimerId: number | null = null;

  constructor(
    private readonly eventBus: MindLensEventBus,
    private readonly perspectiveService: PerspectiveService
  ) {
    this.injectStyles();
    this.eventBus.subscribe((event) => {
      void this.handleEvent(event);
    });
  }

  getCurrentIntervention(): PerspectiveIntervention | null {
    return this.currentIntervention;
  }

  getProviderDiagnostics(): ProviderDiagnostics {
    return this.perspectiveService.getDiagnostics();
  }

  async forceIntervention(
    snapshot: BiasSnapshot,
    options?: { bypassDismissals?: boolean }
  ): Promise<PerspectiveIntervention | null> {
    if (this.isGenerating) {
      return null;
    }

    this.isGenerating = true;
    this.pendingSnapshot = null;
    this.pendingSnapshotCapturedAtMs = 0;
    this.clearPendingTimer();
    this.removeCard();
    this.eventBus.emit({
      type: "provider_status_updated",
      createdAt: nowIso(),
      diagnostics: this.perspectiveService.getDiagnostics()
    });

    let intervention: PerspectiveIntervention;
    try {
      intervention = await this.perspectiveService.generate(snapshot);
    } catch (error) {
      this.isGenerating = false;
      this.eventBus.emit({
        type: "intervention_generation_failed",
        createdAt: nowIso(),
        provider: this.perspectiveService.getDiagnostics().configuredMode,
        error: error instanceof Error ? error.message : "Unknown generation failure."
      });
      this.eventBus.emit({
        type: "provider_status_updated",
        createdAt: nowIso(),
        diagnostics: this.perspectiveService.getDiagnostics()
      });
      return null;
    }

    this.isGenerating = false;
    this.eventBus.emit({
      type: "provider_status_updated",
      createdAt: nowIso(),
      diagnostics: this.perspectiveService.getDiagnostics()
    });

    if (!options?.bypassDismissals && this.dismissals.has(intervention.headline)) {
      return null;
    }

    this.currentIntervention = intervention;
    this.lastShownAtMs = Date.now();
    this.lastShownScore = snapshot.score;
    this.markPatternShown(snapshot);
    this.render(intervention);
    this.eventBus.emit({
      type: "intervention_shown",
      createdAt: nowIso(),
      intervention
    });

    return intervention;
  }

  private async handleEvent(event: MindLensEvent): Promise<void> {
    switch (event.type) {
      case "bias_updated":
        await this.handleBiasUpdated(event.snapshot);
        break;
      case "scroll_activity":
        this.lastScrollAtMs = Date.now();
        this.lastScrollVelocity = event.velocityPxPerSec;
        if (this.pendingSnapshot) {
          this.schedulePendingEvaluation();
        }
        break;
      case "post_view_started":
        this.activeViewPostId = event.postId;
        this.activeViewStartedAtMs = Date.now();
        if (this.pendingSnapshot) {
          this.schedulePendingEvaluation();
        }
        break;
      case "post_view_ended":
        if (this.activeViewPostId === event.postId) {
          this.activeViewPostId = null;
          this.activeViewStartedAtMs = null;
        }
        break;
      case "intervention_ignored":
        if (this.currentIntervention?.id === event.interventionId) {
          this.removeCard();
        }
        break;
      default:
        break;
    }
  }

  private async handleBiasUpdated(snapshot: BiasSnapshot): Promise<void> {
    if (!snapshot.shouldIntervene) {
      if (!this.shouldKeepPendingSnapshot()) {
        this.pendingSnapshot = null;
        this.pendingSnapshotCapturedAtMs = 0;
        this.clearPendingTimer();
      }
      return;
    }

    if (!this.pendingSnapshot || snapshot.score >= this.pendingSnapshot.score) {
      this.pendingSnapshot = snapshot;
      this.pendingSnapshotCapturedAtMs = Date.now();
    }

    if (!this.shouldPrepareIntervention(snapshot)) {
      return;
    }

    if (!this.isReadyMomentToShow()) {
      this.schedulePendingEvaluation();
      return;
    }

    await this.showIntervention(snapshot);
  }

  private shouldPrepareIntervention(snapshot: BiasSnapshot): boolean {
    const nowMs = Date.now();
    if (this.currentIntervention || this.isGenerating) {
      return false;
    }

    if (this.hasRecentlyShownSimilarPattern(snapshot)) {
      return false;
    }

    if (nowMs - this.lastShownAtMs < COOLDOWN_MS) {
      return snapshot.score - this.lastShownScore >= SCORE_DELTA_TO_RESHOW;
    }

    return true;
  }

  private isReadyMomentToShow(): boolean {
    const quietForMs = Date.now() - this.lastScrollAtMs;
    const activeViewDurationMs = this.activeViewStartedAtMs
      ? Date.now() - this.activeViewStartedAtMs
      : 0;

    return (
      quietForMs >= QUIET_WINDOW_MS &&
      this.lastScrollVelocity <= MAX_SCROLL_VELOCITY_FOR_SHOW &&
      activeViewDurationMs >= MIN_ACTIVE_VIEW_MS
    );
  }

  private schedulePendingEvaluation(): void {
    if (!this.pendingSnapshot) {
      return;
    }

    this.clearPendingTimer();
    this.pendingTimerId = window.setTimeout(() => {
      const snapshot = this.pendingSnapshot;
      if (!snapshot) {
        return;
      }

      if (!this.shouldKeepPendingSnapshot()) {
        this.pendingSnapshot = null;
        this.pendingSnapshotCapturedAtMs = 0;
        this.clearPendingTimer();
        return;
      }

      if (!this.shouldPrepareIntervention(snapshot)) {
        return;
      }

      if (!this.isReadyMomentToShow()) {
        this.schedulePendingEvaluation();
        return;
      }

      void this.showIntervention(snapshot);
    }, QUIET_WINDOW_MS);
  }

  private clearPendingTimer(): void {
    if (this.pendingTimerId !== null) {
      window.clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }
  }

  private shouldKeepPendingSnapshot(): boolean {
    return (
      Boolean(this.pendingSnapshot) &&
      Date.now() - this.pendingSnapshotCapturedAtMs <= PENDING_INTERVENTION_GRACE_MS
    );
  }

  private async showIntervention(snapshot: BiasSnapshot): Promise<void> {
    if (!this.shouldPrepareIntervention(snapshot) || !this.isReadyMomentToShow()) {
      return;
    }
    await this.forceIntervention(snapshot, { bypassDismissals: false });
  }

  private getPatternSignature(snapshot: BiasSnapshot): string {
    return [
      snapshot.dominantCategory ?? "general",
      snapshot.dominantSentiment ?? "neutral",
      snapshot.dominantTone ?? "balanced"
    ].join("|");
  }

  private hasRecentlyShownSimilarPattern(snapshot: BiasSnapshot): boolean {
    const lastShownAt = this.recentPatternShows.get(this.getPatternSignature(snapshot));
    return typeof lastShownAt === "number" && Date.now() - lastShownAt < PATTERN_COOLDOWN_MS;
  }

  private markPatternShown(snapshot: BiasSnapshot): void {
    this.recentPatternShows.set(this.getPatternSignature(snapshot), Date.now());
  }

  private render(intervention: PerspectiveIntervention): void {
    const existingCard = document.getElementById(CARD_ID);
    if (existingCard) {
      existingCard.remove();
    }

    const card = document.createElement("aside");
    card.id = CARD_ID;
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");
    card.innerHTML = `
      <div class="mindlens-card__eyebrow">MindLens</div>
      <div class="mindlens-card__headline">${intervention.headline}</div>
      <div class="mindlens-card__body">${intervention.body}</div>
      <div class="mindlens-card__actions">
        <button type="button" class="mindlens-card__button" data-action="expand">Reflect</button>
        <button type="button" class="mindlens-card__button mindlens-card__button--ghost" data-action="dismiss">Dismiss</button>
      </div>
    `;

    card.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const action = target.dataset.action;
      if (action === "dismiss") {
        this.dismissals.add(intervention.headline);
        this.removeCard();
        this.eventBus.emit({
          type: "intervention_dismissed",
          createdAt: nowIso(),
          interventionId: intervention.id
        });
      }

      if (action === "expand") {
        card.classList.toggle(CARD_VISIBLE_CLASS);
        const expanded = card.classList.contains(CARD_VISIBLE_CLASS);
        card
          .querySelector<HTMLElement>(".mindlens-card__body")
          ?.classList.toggle("mindlens-card__body--visible", expanded);
        target.textContent = expanded ? "Close" : "Reflect";

        if (expanded) {
          this.eventBus.emit({
            type: "intervention_expanded",
            createdAt: nowIso(),
            interventionId: intervention.id
          });
        }
      }
    });

    document.body.appendChild(card);
  }

  private removeCard(): void {
    document.getElementById(CARD_ID)?.remove();
    this.currentIntervention = null;
  }

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID} {
        position: fixed;
        right: 20px;
        bottom: 24px;
        z-index: 2147483646;
        width: min(340px, calc(100vw - 32px));
        padding: 14px 14px 12px;
        border: 1px solid rgba(34, 46, 58, 0.12);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(249, 246, 239, 0.98));
        box-shadow: 0 16px 40px rgba(16, 24, 40, 0.12);
        color: #1f2937;
        backdrop-filter: blur(10px);
        font-family: Georgia, "Times New Roman", serif;
        transform: translateY(12px);
        opacity: 0;
        animation: mindlens-card-enter 180ms ease forwards;
      }

      #${CARD_ID} .mindlens-card__eyebrow {
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8b6f47;
        margin-bottom: 6px;
      }

      #${CARD_ID} .mindlens-card__headline {
        font-size: 16px;
        line-height: 1.3;
        font-weight: 700;
        margin-bottom: 8px;
      }

      #${CARD_ID} .mindlens-card__body {
        display: none;
        font-size: 14px;
        line-height: 1.5;
        color: #455468;
      }

      #${CARD_ID} .mindlens-card__body--visible {
        display: block;
      }

      #${CARD_ID} .mindlens-card__actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      #${CARD_ID} .mindlens-card__button {
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        background: #243447;
        color: #ffffff;
        font-size: 13px;
        cursor: pointer;
      }

      #${CARD_ID} .mindlens-card__button--ghost {
        background: rgba(36, 52, 71, 0.08);
        color: #243447;
      }

      @keyframes mindlens-card-enter {
        from {
          transform: translateY(12px);
          opacity: 0;
        }

        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }
}
