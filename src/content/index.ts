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
  const feedObserver = new InstagramFeedObserver({
    eventBus,
    onPostDetected: (article, post) => {
      void analysisEngine.analyze(post);
      engagementTracker.observe(article, post);
    }
  });

  await metricsTracker.init();
  feedObserver.start();
  scrollTracker.start();

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
        settings: currentSettings
      } satisfies GetLiveStateResponseMessage);
    });

    return true;
  });
}

if (window.location.hostname === "www.instagram.com") {
  void bootstrapMindLens();
}
