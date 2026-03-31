import { MindLensMetrics } from "./types";

const METRICS_STORAGE_KEY = "mindlens.metrics.v1";

const EMPTY_METRICS: MindLensMetrics = {
  totals: {
    interventionsShown: 0,
    interventionsExpanded: 0,
    interventionsDismissed: 0,
    interventionsIgnored: 0
  },
  averagePauseAfterShownMs: 0,
  lastInterventionAt: null,
  recentInterventions: []
};

export function createEmptyMetrics(): MindLensMetrics {
  return structuredClone(EMPTY_METRICS);
}

export class MindLensStorage {
  async getMetrics(): Promise<MindLensMetrics> {
    if (!chrome.storage?.local) {
      return createEmptyMetrics();
    }

    const stored = await chrome.storage.local.get(METRICS_STORAGE_KEY);
    const metrics = stored[METRICS_STORAGE_KEY] as MindLensMetrics | undefined;

    return metrics ?? createEmptyMetrics();
  }

  async setMetrics(metrics: MindLensMetrics): Promise<void> {
    if (!chrome.storage?.local) {
      return;
    }

    await chrome.storage.local.set({
      [METRICS_STORAGE_KEY]: metrics
    });
  }

  async resetMetrics(): Promise<MindLensMetrics> {
    const emptyMetrics = createEmptyMetrics();

    if (chrome.storage?.local) {
      await chrome.storage.local.set({
        [METRICS_STORAGE_KEY]: emptyMetrics
      });
    }

    return emptyMetrics;
  }
}
