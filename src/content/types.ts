export type InstagramPost = {
  id: string;
  href?: string;
  timestamp?: string;
  text: string;
  textLength: number;
  visibleTextBlocks: string[];
  imageAltTexts: string[];
};

export type ContentCategory =
  | "relationships"
  | "fitness"
  | "money"
  | "motivation"
  | "career"
  | "mental_health"
  | "lifestyle"
  | "general";

export type SentimentLabel = "positive" | "negative" | "neutral";

export type ToneLabel = "blaming" | "victimhood" | "aggressive" | "balanced";

export type LocalContentAnalysis = {
  category: ContentCategory;
  sentiment: SentimentLabel;
  tone: ToneLabel;
  intensity: number;
  confidence: number;
  matchedSignals: string[];
};

export type BiasComponentScores = {
  categoryDominance: number;
  sentimentSkew: number;
  toneSkew: number;
  repetition: number;
};

export type BiasSnapshot = {
  score: number;
  shouldIntervene: boolean;
  sampleSize: number;
  dominantCategory: ContentCategory | null;
  dominantCategoryRatio: number;
  dominantSentiment: SentimentLabel | null;
  dominantSentimentRatio: number;
  dominantTone: ToneLabel | null;
  dominantToneRatio: number;
  repeatedSignalRatio: number;
  components: BiasComponentScores;
};

export type PerspectiveIntervention = {
  id: string;
  headline: string;
  body: string;
  createdAt: string;
  trigger: BiasSnapshot;
};

export type InterventionInteractionStatus = "shown" | "expanded" | "dismissed" | "ignored";

export type InterventionMetricRecord = {
  interventionId: string;
  createdAt: string;
  status: InterventionInteractionStatus;
  pauseAfterShownMs?: number;
  scoreAtTrigger: number;
  dominantCategory: ContentCategory | null;
  dominantSentiment: SentimentLabel | null;
  dominantTone: ToneLabel | null;
};

export type MindLensMetrics = {
  totals: {
    interventionsShown: number;
    interventionsExpanded: number;
    interventionsDismissed: number;
    interventionsIgnored: number;
  };
  averagePauseAfterShownMs: number;
  lastInterventionAt: string | null;
  recentInterventions: InterventionMetricRecord[];
};

export type MindLensEvent =
  | {
      type: "post_detected";
      createdAt: string;
      post: InstagramPost;
    }
  | {
      type: "post_analyzed";
      createdAt: string;
      postId: string;
      analysis: LocalContentAnalysis;
    }
  | {
      type: "bias_updated";
      createdAt: string;
      snapshot: BiasSnapshot;
    }
  | {
      type: "intervention_shown";
      createdAt: string;
      intervention: PerspectiveIntervention;
    }
  | {
      type: "intervention_dismissed";
      createdAt: string;
      interventionId: string;
    }
  | {
      type: "intervention_expanded";
      createdAt: string;
      interventionId: string;
    }
  | {
      type: "intervention_ignored";
      createdAt: string;
      interventionId: string;
      pauseAfterShownMs: number;
    }
  | {
      type: "metrics_updated";
      createdAt: string;
      metrics: MindLensMetrics;
    }
  | {
      type: "post_view_started";
      createdAt: string;
      postId: string;
      viewportRatio: number;
    }
  | {
      type: "post_view_ended";
      createdAt: string;
      postId: string;
      dwellTimeMs: number;
      maxViewportRatio: number;
    }
  | {
      type: "scroll_activity";
      createdAt: string;
      scrollY: number;
      deltaY: number;
      velocityPxPerSec: number;
    };
