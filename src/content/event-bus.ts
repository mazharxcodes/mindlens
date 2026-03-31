import { MindLensEvent } from "./types";

const LOG_PREFIX = "[MindLens]";

export class MindLensEventBus {
  private readonly events: MindLensEvent[] = [];
  private readonly listeners = new Set<(event: MindLensEvent) => void>();

  emit(event: MindLensEvent): void {
    this.events.push(event);
    console.log(`${LOG_PREFIX} ${event.type}`, event);

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getRecentEvents(limit = 50): MindLensEvent[] {
    return this.events.slice(-limit);
  }

  subscribe(listener: (event: MindLensEvent) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
