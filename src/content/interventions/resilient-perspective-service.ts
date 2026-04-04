import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, PerspectiveIntervention, ProviderDiagnostics } from "../core/types";

const FAILURE_COOLDOWN_MS = 45_000;

export class ResilientPerspectiveService implements PerspectiveService {
  private diagnostics: ProviderDiagnostics;

  constructor(
    private readonly primary: PerspectiveService,
    private readonly fallback: PerspectiveService
  ) {
    const primaryDiagnostics = this.primary.getDiagnostics();
    this.diagnostics = {
      ...primaryDiagnostics,
      activeProvider: primaryDiagnostics.configuredMode,
      health: "idle"
    };
  }

  async generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention> {
    const now = Date.now();
    this.diagnostics.lastAttemptAt = new Date(now).toISOString();

    if (this.diagnostics.cooldownUntil && new Date(this.diagnostics.cooldownUntil).getTime() > now) {
      this.diagnostics.health = "fallback";
      this.diagnostics.usingFallback = true;
      const fallbackIntervention = await this.fallback.generate(snapshot);
      this.diagnostics.activeProvider = fallbackIntervention.provider;
      return fallbackIntervention;
    }

    try {
      const intervention = await this.primary.generate(snapshot);
      this.diagnostics.activeProvider = intervention.provider;
      this.diagnostics.health = "healthy";
      this.diagnostics.usingFallback = false;
      this.diagnostics.consecutiveFailures = 0;
      this.diagnostics.cooldownUntil = null;
      this.diagnostics.lastError = null;
      this.diagnostics.lastSuccessAt = new Date().toISOString();

      return intervention;
    } catch (error) {
      this.diagnostics.consecutiveFailures += 1;
      this.diagnostics.lastError = error instanceof Error ? error.message : "Unknown provider error.";
      this.diagnostics.cooldownUntil = new Date(
        now + FAILURE_COOLDOWN_MS * Math.min(this.diagnostics.consecutiveFailures, 3)
      ).toISOString();
      this.diagnostics.health = "fallback";
      this.diagnostics.usingFallback = true;

      const fallbackIntervention = await this.fallback.generate(snapshot);
      this.diagnostics.activeProvider = fallbackIntervention.provider;
      this.diagnostics.lastSuccessAt = new Date().toISOString();
      return fallbackIntervention;
    }
  }

  getDiagnostics(): ProviderDiagnostics {
    return structuredClone(this.diagnostics);
  }
}
