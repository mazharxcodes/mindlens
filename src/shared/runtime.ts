import { BiasSnapshot, PerspectiveIntervention } from "../content/types";

export type MindLensSettings = {
  analysisMode: "heuristic";
  generationMode: "local" | "ollama" | "remote";
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

export type MindLensRuntimeMessage = GeneratePerspectiveRequestMessage;
