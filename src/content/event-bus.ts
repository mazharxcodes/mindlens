import { MindLensEvent } from "./types";

const LOG_PREFIX = "[MindLens]";

export class MindLensEventBus {
  private readonly events: MindLensEvent[] = [];

  emit(event: MindLensEvent): void {
    this.events.push(event);
    console.log(`${LOG_PREFIX} ${event.type}`, event);
  }

  getRecentEvents(limit = 50): MindLensEvent[] {
    return this.events.slice(-limit);
  }
}
