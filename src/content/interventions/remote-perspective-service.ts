import {
  GeneratePerspectiveRequestMessage,
  GeneratePerspectiveResponseMessage,
  MindLensSettings
} from "../../shared/runtime";
import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, PerspectiveIntervention, ProviderDiagnostics, ProviderName } from "../core/types";

export class RemotePerspectiveService implements PerspectiveService {
  constructor(private readonly settings: MindLensSettings) {}

  private get providerName(): ProviderName {
    return this.settings.generationMode === "ollama" ? "ollama" : "remote";
  }

  async generate(snapshot: BiasSnapshot): Promise<PerspectiveIntervention> {
    const message: GeneratePerspectiveRequestMessage = {
      type: "mindlens:generate-perspective",
      payload: {
        snapshot,
        settings: this.settings
      }
    };

    const response = (await chrome.runtime.sendMessage(
      message
    )) as GeneratePerspectiveResponseMessage;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.intervention;
  }

  getDiagnostics(): ProviderDiagnostics {
    return {
      configuredMode: this.providerName,
      activeProvider: this.providerName,
      health: "idle",
      usingFallback: false,
      consecutiveFailures: 0,
      cooldownUntil: null,
      lastError: null,
      lastAttemptAt: null,
      lastSuccessAt: null
    };
  }
}
