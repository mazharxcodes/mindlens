import { MindLensEventBus } from "./event-bus";
import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, MindLensEvent, PerspectiveIntervention } from "./types";
import { nowIso } from "./utils";

const CARD_ID = "mindlens-intervention-card";
const CARD_VISIBLE_CLASS = "mindlens-card-visible";
const STYLE_ID = "mindlens-intervention-style";
const COOLDOWN_MS = 90_000;
const SCORE_DELTA_TO_RESHOW = 0.12;

export class InterventionController {
  private currentIntervention: PerspectiveIntervention | null = null;
  private lastShownAtMs = 0;
  private lastShownScore = 0;
  private readonly dismissals = new Set<string>();
  private isGenerating = false;

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

  private async handleEvent(event: MindLensEvent): Promise<void> {
    if (event.type !== "bias_updated") {
      return;
    }

    const snapshot = event.snapshot;
    if (!snapshot.shouldIntervene) {
      return;
    }

    if (!this.shouldShowIntervention(snapshot)) {
      return;
    }

    this.isGenerating = true;
    let intervention: PerspectiveIntervention;
    try {
      intervention = await this.perspectiveService.generate(snapshot);
    } catch {
      this.isGenerating = false;
      return;
    }
    this.isGenerating = false;

    if (this.dismissals.has(intervention.headline)) {
      return;
    }

    this.currentIntervention = intervention;
    this.lastShownAtMs = Date.now();
    this.lastShownScore = snapshot.score;
    this.render(intervention);
    this.eventBus.emit({
      type: "intervention_shown",
      createdAt: nowIso(),
      intervention
    });
  }

  private shouldShowIntervention(snapshot: BiasSnapshot): boolean {
    const nowMs = Date.now();
    if (this.currentIntervention || this.isGenerating) {
      return false;
    }

    if (nowMs - this.lastShownAtMs >= COOLDOWN_MS) {
      return true;
    }

    return snapshot.score - this.lastShownScore >= SCORE_DELTA_TO_RESHOW;
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
        card.querySelector<HTMLElement>(".mindlens-card__body")?.classList.toggle("mindlens-card__body--visible", expanded);
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
