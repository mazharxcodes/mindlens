import { MindLensMetrics } from "../content/types";
import { BiasSnapshot, PerspectiveIntervention } from "../content/types";

export type MindLensSettings = {
  analysisMode: "heuristic";
  generationMode: "local" | "ollama" | "remote";
  interventionThreshold: number;
  ollamaEnabled: boolean;
  ollamaEndpoint: string;
  ollamaModel: string;
  remoteGenerationEnabled: boolean;
  remoteGenerationEndpoint: string;
  remoteGenerationApiKey: string;
  remoteGenerationModel: string;
};

export type GeneratePerspectiveRequestMessage = {
  type: "mindlens:generate-perspective";
  payload: {
    snapshot: BiasSnapshot;
    settings: MindLensSettings;
  };
};

export type GeneratePerspectiveResponseMessage =
  | {
      ok: true;
      intervention: PerspectiveIntervention;
      provider: "ollama" | "remote";
    }
  | {
      ok: false;
      error: string;
    };

export type GetLiveStateRequestMessage = {
  type: "mindlens:get-live-state";
};

export type GetLiveStateResponseMessage = {
  biasSnapshot: BiasSnapshot;
  currentIntervention: PerspectiveIntervention | null;
  metrics: MindLensMetrics;
  settings: MindLensSettings;
};

export type MindLensRuntimeMessage =
  | GeneratePerspectiveRequestMessage
  | GetLiveStateRequestMessage;
