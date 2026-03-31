export type InstagramPost = {
  id: string;
  href?: string;
  timestamp?: string;
  text: string;
  textLength: number;
  visibleTextBlocks: string[];
  imageAltTexts: string[];
};

export type MindLensEvent =
  | {
      type: "post_detected";
      createdAt: string;
      post: InstagramPost;
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
