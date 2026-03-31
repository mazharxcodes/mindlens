import { MindLensMetrics } from "./types";

const METRICS_STORAGE_KEY = "mindlens.metrics.v1";

const EMPTY_METRICS: MindLensMetrics = {
  totals: {
    interventionsShown: 0,
    interventionsExpanded: 0,
    interventionsDismissed: 0,
    interventionsIgnored: 0,
    generationFailures: 0,
    shownByProvider: {
      local: 0,
      ollama: 0,
      remote: 0
    }
  },
  averagePauseAfterShownMs: 0,
  lastInterventionAt: null,
  recentInterventions: []
};

export function createEmptyMetrics(): MindLensMetrics {
  return structuredClone(EMPTY_METRICS);
}

function normalizeMetrics(metrics?: Partial<MindLensMetrics>): MindLensMetrics {
  return {
    ...createEmptyMetrics(),
    ...metrics,
    totals: {
      ...createEmptyMetrics().totals,
      ...metrics?.totals,
      shownByProvider: {
        ...createEmptyMetrics().totals.shownByProvider,
        ...metrics?.totals?.shownByProvider
      }
    },
    recentInterventions:
      metrics?.recentInterventions?.map((record) => ({
        ...record,
        provider: record.provider ?? "local"
      })) ?? []
  };
}

export class MindLensStorage {
  async getMetrics(): Promise<MindLensMetrics> {
    if (!chrome.storage?.local) {
      return createEmptyMetrics();
    }

    try {
      const stored = await chrome.storage.local.get(METRICS_STORAGE_KEY);
      const metrics = stored[METRICS_STORAGE_KEY] as Partial<MindLensMetrics> | undefined;
      return normalizeMetrics(metrics);
    } catch {
      return createEmptyMetrics();
    }
  }

  async setMetrics(metrics: MindLensMetrics): Promise<void> {
    if (!chrome.storage?.local) {
      return;
    }

    try {
      await chrome.storage.local.set({
        [METRICS_STORAGE_KEY]: normalizeMetrics(metrics)
      });
    } catch {
      return;
    }
  }

  async resetMetrics(): Promise<MindLensMetrics> {
    const emptyMetrics = createEmptyMetrics();

    if (chrome.storage?.local) {
      try {
        await chrome.storage.local.set({
          [METRICS_STORAGE_KEY]: emptyMetrics
        });
      } catch {
        return emptyMetrics;
      }
    }

    return emptyMetrics;
  }
}
