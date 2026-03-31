import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, PerspectiveIntervention } from "./types";

export class ResilientPerspectiveService implements PerspectiveService {
  constructor(
    private readonly primary: PerspectiveService,
    private readonly fallback: PerspectiveService
  ) {}

  async generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention> {
    try {
      return await this.primary.generate(snapshot);
    } catch {
      return this.fallback.generate(snapshot);
    }
  }
}
