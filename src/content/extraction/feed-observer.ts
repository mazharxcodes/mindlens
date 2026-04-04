import { extractInstagramPost } from "./extractor";
import { MindLensEventBus } from "../core/event-bus";
import { InstagramPost } from "../core/types";
import { nowIso } from "../core/utils";

type FeedObserverOptions = {
  onPostDetected: (article: HTMLElement, post: InstagramPost) => void;
  eventBus: MindLensEventBus;
};

export class InstagramFeedObserver {
  private readonly seenPostIds = new Set<string>();

  constructor(private readonly options: FeedObserverOptions) {}

  start(): void {
    this.scan();

    const observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(
        (mutation) =>
          mutation.type === "childList" &&
          Array.from(mutation.addedNodes).some(
            (node) => node instanceof HTMLElement && (node.matches("article") || node.querySelector("article"))
          )
      );

      if (hasRelevantChanges) {
        this.scan();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private scan(): void {
    const articles = Array.from(document.querySelectorAll<HTMLElement>("article"));

    for (const article of articles) {
      const post = extractInstagramPost(article);
      if (!post || this.seenPostIds.has(post.id)) {
        continue;
      }

      this.seenPostIds.add(post.id);
      this.options.eventBus.emit({
        type: "post_detected",
        createdAt: nowIso(),
        post
      });
      this.options.onPostDetected(article, post);
    }
  }
}
