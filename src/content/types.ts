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
