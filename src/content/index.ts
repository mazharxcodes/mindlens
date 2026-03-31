import { BiasDetector } from "./bias-detector";
import { PostEngagementTracker } from "./engagement-tracker";
import { MindLensEventBus } from "./event-bus";
import { InstagramFeedObserver } from "./feed-observer";
import { InterventionController } from "./intervention-controller";
import { LocalAnalysisEngine } from "./local-analysis-engine";
import { ScrollActivityTracker } from "./scroll-tracker";

function bootstrapMindLens(): void {
  const eventBus = new MindLensEventBus();
  const biasDetector = new BiasDetector(eventBus);
  const interventionController = new InterventionController(eventBus);
  const analysisEngine = new LocalAnalysisEngine(eventBus);
  const engagementTracker = new PostEngagementTracker(eventBus);
  const scrollTracker = new ScrollActivityTracker(eventBus);
  const feedObserver = new InstagramFeedObserver({
    eventBus,
    onPostDetected: (article, post) => {
      analysisEngine.analyze(post);
      engagementTracker.observe(article, post);
    }
  });

  feedObserver.start();
  scrollTracker.start();

  window.addEventListener("beforeunload", () => {
    engagementTracker.flush();
  });

  Object.assign(window, {
    __MINDLENS_DEBUG__: {
      getRecentEvents: (limit?: number) => eventBus.getRecentEvents(limit),
      getAnalysis: (postId: string) => analysisEngine.getAnalysis(postId),
      getBiasSnapshot: () => biasDetector.getSnapshot(),
      getCurrentIntervention: () => interventionController.getCurrentIntervention()
    }
  });
}

if (window.location.hostname === "www.instagram.com") {
  bootstrapMindLens();
}
