import { MindLensEventBus } from "./event-bus";
import { InstagramPost } from "./types";
import { nowIso } from "./utils";

type ActiveViewState = {
  startedAtMs: number;
  maxViewportRatio: number;
};

export class PostEngagementTracker {
  private readonly postByElement = new WeakMap<HTMLElement, InstagramPost>();
  private readonly activeViews = new Map<string, ActiveViewState>();
  private readonly observer: IntersectionObserver;

  constructor(private readonly eventBus: MindLensEventBus) {
    this.observer = new IntersectionObserver(this.handleIntersections.bind(this), {
      threshold: [0.25, 0.5, 0.75]
    });
  }

  observe(article: HTMLElement, post: InstagramPost): void {
    this.postByElement.set(article, post);
    this.observer.observe(article);
  }

  flush(): void {
    for (const [postId, activeView] of this.activeViews.entries()) {
      this.eventBus.emit({
        type: "post_view_ended",
        createdAt: nowIso(),
        postId,
        dwellTimeMs: Date.now() - activeView.startedAtMs,
        maxViewportRatio: activeView.maxViewportRatio
      });
    }

    this.activeViews.clear();
  }

  private handleIntersections(entries: IntersectionObserverEntry[]): void {
    const nowMs = Date.now();

    for (const entry of entries) {
      const article = entry.target as HTMLElement;
      const post = this.postByElement.get(article);
      if (!post) {
        continue;
      }

      const activeView = this.activeViews.get(post.id);
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!activeView) {
          this.activeViews.set(post.id, {
            startedAtMs: nowMs,
            maxViewportRatio: entry.intersectionRatio
          });
          this.eventBus.emit({
            type: "post_view_started",
            createdAt: nowIso(),
            postId: post.id,
            viewportRatio: entry.intersectionRatio
          });
        } else {
          activeView.maxViewportRatio = Math.max(activeView.maxViewportRatio, entry.intersectionRatio);
        }

        continue;
      }

      if (activeView) {
        this.eventBus.emit({
          type: "post_view_ended",
          createdAt: nowIso(),
          postId: post.id,
          dwellTimeMs: nowMs - activeView.startedAtMs,
          maxViewportRatio: activeView.maxViewportRatio
        });
        this.activeViews.delete(post.id);
      }
    }
  }
}
