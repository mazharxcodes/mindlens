import { BiasDetector } from "./bias-detector";
import { PostEngagementTracker } from "./engagement-tracker";
import { MindLensEventBus } from "./event-bus";
import { InstagramFeedObserver } from "./feed-observer";
import { InterventionController } from "./intervention-controller";
import { LocalAnalysisEngine } from "./local-analysis-engine";
import { MetricsTracker } from "./metrics-tracker";
import { createProviders } from "./provider-registry";
import { ScrollActivityTracker } from "./scroll-tracker";
import { MindLensSettingsStore } from "./settings-store";
import { MindLensStorage } from "./storage";
import { BiasSnapshot } from "./types";
import { GetLiveStateRequestMessage, GetLiveStateResponseMessage } from "../shared/runtime";

async function bootstrapMindLens(): Promise<void> {
  const settingsStore = new MindLensSettingsStore();
  const settings = await settingsStore.getSettings();
  const providers = createProviders(settings);
  const eventBus = new MindLensEventBus();
  const biasDetector = new BiasDetector(eventBus, undefined, settings.interventionThreshold);
  const interventionController = new InterventionController(eventBus, providers.perspectiveService);
  const analysisEngine = new LocalAnalysisEngine(eventBus, providers.analysisService);
  const engagementTracker = new PostEngagementTracker(eventBus);
  const scrollTracker = new ScrollActivityTracker(eventBus);
  const metricsTracker = new MetricsTracker(eventBus, new MindLensStorage());
  const detectedPosts = new Map<string, Parameters<typeof analysisEngine.analyze>[0]>();

  eventBus.subscribe((event) => {
    if (event.type !== "post_view_started") {
      return;
    }

    const post = detectedPosts.get(event.postId);
    if (!post) {
      return;
    }

    void analysisEngine.analyze(post);
  });

  const feedObserver = new InstagramFeedObserver({
    eventBus,
    onPostDetected: (article, post) => {
      detectedPosts.set(post.id, post);
      engagementTracker.observe(article, post);
    }
  });

  await metricsTracker.init();
  feedObserver.start();
  scrollTracker.start();

  async function createDebugSnapshot(overrides?: Partial<BiasSnapshot>): Promise<BiasSnapshot> {
    const currentSettings = await settingsStore.getSettings();
    const currentSnapshot = biasDetector.getSnapshot();

    const baseSnapshot: BiasSnapshot = {
      score: Math.max(currentSnapshot.score, currentSettings.interventionThreshold + 0.15, 0.75),
      shouldIntervene: true,
      sampleSize: Math.max(currentSnapshot.sampleSize, 12),
      averageConfidence: Math.max(currentSnapshot.averageConfidence, 0.72),
      dominantCategory: currentSnapshot.dominantCategory ?? "relationships",
      dominantCategoryRatio: Math.max(currentSnapshot.dominantCategoryRatio, 0.74),
      dominantSentiment: currentSnapshot.dominantSentiment ?? "negative",
      dominantSentimentRatio: Math.max(currentSnapshot.dominantSentimentRatio, 0.7),
      dominantTone: currentSnapshot.dominantTone ?? "victimhood",
      dominantToneRatio: Math.max(currentSnapshot.dominantToneRatio, 0.68),
      repeatedSignalRatio: Math.max(currentSnapshot.repeatedSignalRatio, 0.6),
      components: {
        categoryDominance: Math.max(currentSnapshot.components.categoryDominance, 0.72),
        sentimentSkew: Math.max(currentSnapshot.components.sentimentSkew, 0.62),
        toneSkew: Math.max(currentSnapshot.components.toneSkew, 0.58),
        repetition: Math.max(currentSnapshot.components.repetition, 0.66)
      }
    };

    return {
      ...baseSnapshot,
      ...overrides,
      components: {
        ...baseSnapshot.components,
        ...overrides?.components
      }
    };
  }

  window.addEventListener("beforeunload", () => {
    engagementTracker.flush();
    metricsTracker.flush();
  });

  Object.assign(window, {
    __MINDLENS_DEBUG__: {
      getRecentEvents: (limit?: number) => eventBus.getRecentEvents(limit),
      getAnalysis: (postId: string) => analysisEngine.getAnalysis(postId),
      getBiasSnapshot: () => biasDetector.getSnapshot(),
      getCurrentIntervention: () => interventionController.getCurrentIntervention(),
      forceIntervention: async (overrides?: Partial<BiasSnapshot>) => {
        const snapshot = await createDebugSnapshot(overrides);
        return interventionController.forceIntervention(snapshot, {
          bypassDismissals: true
        });
      },
      getMetrics: () => metricsTracker.getMetrics(),
      getSettings: () => settingsStore.getSettings(),
      updateSettings: (nextSettings: Parameters<MindLensSettingsStore["updateSettings"]>[0]) =>
        settingsStore.updateSettings(nextSettings)
    }
  });

  chrome.runtime.onMessage.addListener((message: GetLiveStateRequestMessage, _sender, sendResponse) => {
    if (message.type !== "mindlens:get-live-state") {
      return false;
    }

    void settingsStore.getSettings().then((currentSettings) => {
      sendResponse({
        biasSnapshot: biasDetector.getSnapshot(),
        currentIntervention: interventionController.getCurrentIntervention(),
        metrics: metricsTracker.getMetrics(),
        settings: currentSettings,
        providerDiagnostics: interventionController.getProviderDiagnostics()
      } satisfies GetLiveStateResponseMessage);
    });

    return true;
  });
}

if (window.location.hostname === "www.instagram.com") {
  void bootstrapMindLens();
}
