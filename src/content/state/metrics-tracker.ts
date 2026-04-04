import { MindLensEventBus } from "../core/event-bus";
import { createEmptyMetrics, MindLensStorage } from "./storage";
import {
  InterventionMetricRecord,
  MindLensEvent,
  MindLensMetrics,
  PerspectiveIntervention
} from "../core/types";
import { nowIso } from "../core/utils";

type ActiveInterventionState = {
  intervention: PerspectiveIntervention;
  shownAtMs: number;
  hasMeaningfulInteraction: boolean;
  pauseAfterShownMs?: number;
  ignoreTimerId: number | null;
};

const RECENT_LIMIT = 25;
const MEANINGFUL_SCROLL_DELTA = 48;

export class MetricsTracker {
  private metrics: MindLensMetrics = createEmptyMetrics();
  private activeIntervention: ActiveInterventionState | null = null;
  private isReady = false;
  private persistTimerId: number | null = null;

  constructor(
    private readonly eventBus: MindLensEventBus,
    private readonly storage: MindLensStorage
  ) {
    this.eventBus.subscribe((event) => {
      this.handleEvent(event);
    });
  }

  async init(): Promise<void> {
    this.metrics = await this.storage.getMetrics();
    this.isReady = true;
    this.emitMetricsUpdated();
  }

  getMetrics(): MindLensMetrics {
    return this.metrics;
  }

  flush(): void {
    if (this.activeIntervention && !this.activeIntervention.hasMeaningfulInteraction) {
      this.markIgnored(this.activeIntervention);
    }

    if (this.persistTimerId !== null) {
      window.clearTimeout(this.persistTimerId);
      this.persistTimerId = null;
    }

    void this.storage.setMetrics(this.metrics);
  }

  private handleEvent(event: MindLensEvent): void {
    if (!this.isReady && event.type !== "metrics_updated") {
      return;
    }

    switch (event.type) {
      case "intervention_shown":
        this.handleInterventionShown(event.intervention);
        break;
      case "intervention_generation_failed":
        this.handleGenerationFailed();
        break;
      case "intervention_expanded":
        this.handleInterventionExpanded(event.interventionId);
        break;
      case "intervention_dismissed":
        this.handleInterventionDismissed(event.interventionId);
        break;
      case "scroll_activity":
        this.handleScrollActivity(event.deltaY);
        break;
      default:
        break;
    }
  }

  private handleInterventionShown(intervention: PerspectiveIntervention): void {
    if (this.activeIntervention && !this.activeIntervention.hasMeaningfulInteraction) {
      this.markIgnored(this.activeIntervention);
    }

    this.metrics.totals.interventionsShown += 1;
    this.metrics.totals.shownByProvider[intervention.provider] += 1;
    this.metrics.lastInterventionAt = intervention.createdAt;

    const activeIntervention: ActiveInterventionState = {
      intervention,
      shownAtMs: Date.now(),
      hasMeaningfulInteraction: false,
      ignoreTimerId: null
    };

    this.activeIntervention = activeIntervention;
    this.pushRecentRecord({
      interventionId: intervention.id,
      createdAt: intervention.createdAt,
      status: "shown",
      provider: intervention.provider,
      scoreAtTrigger: intervention.trigger.score,
      dominantCategory: intervention.trigger.dominantCategory,
      dominantSentiment: intervention.trigger.dominantSentiment,
      dominantTone: intervention.trigger.dominantTone
    });
    this.persistSoon();
    this.emitMetricsUpdated();
  }

  private handleInterventionExpanded(interventionId: string): void {
    if (this.activeIntervention?.intervention.id === interventionId) {
      const pauseAfterShownMs =
        this.activeIntervention.pauseAfterShownMs ?? Date.now() - this.activeIntervention.shownAtMs;
      if (typeof this.activeIntervention.pauseAfterShownMs !== "number") {
        this.activeIntervention.pauseAfterShownMs = pauseAfterShownMs;
        this.updateAveragePause(pauseAfterShownMs);
      }

      this.activeIntervention.hasMeaningfulInteraction = true;
      this.clearIgnoreTimer(this.activeIntervention);
      this.metrics.totals.interventionsExpanded += 1;
      this.updateRecentRecord(interventionId, "expanded", pauseAfterShownMs);
      this.persistSoon();
      this.emitMetricsUpdated();
    }
  }

  private handleGenerationFailed(): void {
    this.metrics.totals.generationFailures += 1;
    this.persistSoon();
    this.emitMetricsUpdated();
  }

  private handleInterventionDismissed(interventionId: string): void {
    if (this.activeIntervention?.intervention.id === interventionId) {
      const pauseAfterShownMs =
        this.activeIntervention.pauseAfterShownMs ?? Date.now() - this.activeIntervention.shownAtMs;
      if (typeof this.activeIntervention.pauseAfterShownMs !== "number") {
        this.activeIntervention.pauseAfterShownMs = pauseAfterShownMs;
        this.updateAveragePause(pauseAfterShownMs);
      }

      this.activeIntervention.hasMeaningfulInteraction = true;
      this.clearIgnoreTimer(this.activeIntervention);
      this.metrics.totals.interventionsDismissed += 1;
      this.updateRecentRecord(interventionId, "dismissed", pauseAfterShownMs);
      this.activeIntervention = null;
      this.persistSoon();
      this.emitMetricsUpdated();
    }
  }

  private handleScrollActivity(deltaY: number): void {
    if (!this.activeIntervention || Math.abs(deltaY) < MEANINGFUL_SCROLL_DELTA) {
      return;
    }

    if (typeof this.activeIntervention.pauseAfterShownMs === "number") {
      return;
    }

    const pauseAfterShownMs = Date.now() - this.activeIntervention.shownAtMs;
    this.activeIntervention.pauseAfterShownMs = pauseAfterShownMs;
    this.updateAveragePause(pauseAfterShownMs);
    this.updateRecentPause(this.activeIntervention.intervention.id, pauseAfterShownMs);
    this.persistSoon();
    this.emitMetricsUpdated();
  }

  private markIgnored(activeIntervention: ActiveInterventionState): void {
    activeIntervention.hasMeaningfulInteraction = true;
    this.clearIgnoreTimer(activeIntervention);

    const pauseAfterShownMs =
      activeIntervention.pauseAfterShownMs ?? Date.now() - activeIntervention.shownAtMs;

    if (typeof activeIntervention.pauseAfterShownMs !== "number") {
      this.updateAveragePause(pauseAfterShownMs);
    }

    this.metrics.totals.interventionsIgnored += 1;
    this.updateRecentRecord(activeIntervention.intervention.id, "ignored", pauseAfterShownMs);
    this.eventBus.emit({
      type: "intervention_ignored",
      createdAt: nowIso(),
      interventionId: activeIntervention.intervention.id,
      pauseAfterShownMs
    });
    this.activeIntervention = null;
    this.persistSoon();
    this.emitMetricsUpdated();
  }

  private updateAveragePause(pauseAfterShownMs: number): void {
    const totalPauseObservations =
      this.metrics.totals.interventionsExpanded +
      this.metrics.totals.interventionsDismissed +
      this.metrics.totals.interventionsIgnored;

    if (totalPauseObservations <= 0) {
      this.metrics.averagePauseAfterShownMs = pauseAfterShownMs;
      return;
    }

    const previousCount = Math.max(totalPauseObservations - 1, 0);
    const previousTotal = this.metrics.averagePauseAfterShownMs * previousCount;
    this.metrics.averagePauseAfterShownMs = Number(
      ((previousTotal + pauseAfterShownMs) / (previousCount + 1)).toFixed(0)
    );
  }

  private updateRecentRecord(
    interventionId: string,
    status: InterventionMetricRecord["status"],
    pauseAfterShownMs?: number
  ): void {
    const record = this.metrics.recentInterventions.find(
      (entry) => entry.interventionId === interventionId
    );

    if (!record) {
      return;
    }

    record.status = status;
    if (typeof pauseAfterShownMs === "number") {
      record.pauseAfterShownMs = pauseAfterShownMs;
    }
  }

  private updateRecentPause(interventionId: string, pauseAfterShownMs: number): void {
    const record = this.metrics.recentInterventions.find(
      (entry) => entry.interventionId === interventionId
    );

    if (record) {
      record.pauseAfterShownMs = pauseAfterShownMs;
    }
  }

  private pushRecentRecord(record: InterventionMetricRecord): void {
    this.metrics.recentInterventions.unshift(record);
    this.metrics.recentInterventions = this.metrics.recentInterventions.slice(0, RECENT_LIMIT);
  }

  private persistSoon(): void {
    if (this.persistTimerId !== null) {
      window.clearTimeout(this.persistTimerId);
    }

    this.persistTimerId = window.setTimeout(() => {
      this.persistTimerId = null;
      void this.storage.setMetrics(this.metrics);
    }, 250);
  }

  private emitMetricsUpdated(): void {
    this.eventBus.emit({
      type: "metrics_updated",
      createdAt: nowIso(),
      metrics: this.metrics
    });
  }

  private clearIgnoreTimer(activeIntervention: ActiveInterventionState): void {
    if (activeIntervention.ignoreTimerId !== null) {
      window.clearTimeout(activeIntervention.ignoreTimerId);
      activeIntervention.ignoreTimerId = null;
    }
  }
}
