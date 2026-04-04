import { generatePerspectiveIntervention } from "./perspective-generator";
import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, PerspectiveIntervention, ProviderDiagnostics } from "../core/types";

export class LocalPerspectiveService implements PerspectiveService {
  async generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention> {
    return generatePerspectiveIntervention(snapshot);
  }

  getDiagnostics(): ProviderDiagnostics {
    return {
      configuredMode: "local",
      activeProvider: "local",
      health: "healthy",
      usingFallback: false,
      consecutiveFailures: 0,
      cooldownUntil: null,
      lastError: null,
      lastAttemptAt: null,
      lastSuccessAt: null
    };
  }
}
