import { MindLensEventBus } from "../core/event-bus";
import { nowIso } from "../core/utils";

export class ScrollActivityTracker {
  private lastScrollY = window.scrollY;
  private lastTimestampMs = performance.now();
  private lastEmittedAtMs = 0;

  constructor(private readonly eventBus: MindLensEventBus) {}

  start(): void {
    window.addEventListener(
      "scroll",
      () => {
        const timestampMs = performance.now();
        const deltaY = window.scrollY - this.lastScrollY;
        const deltaTimeMs = Math.max(timestampMs - this.lastTimestampMs, 1);
        const velocityPxPerSec = Math.abs(deltaY) / (deltaTimeMs / 1000);

        this.lastScrollY = window.scrollY;
        this.lastTimestampMs = timestampMs;

        const shouldEmit =
          Math.abs(deltaY) >= 24 && timestampMs - this.lastEmittedAtMs >= 250;
        if (!shouldEmit) {
          return;
        }

        this.lastEmittedAtMs = timestampMs;

        this.eventBus.emit({
          type: "scroll_activity",
          createdAt: nowIso(),
          scrollY: window.scrollY,
          deltaY,
          velocityPxPerSec: Number(velocityPxPerSec.toFixed(2))
        });
      },
      { passive: true }
    );
  }
}
