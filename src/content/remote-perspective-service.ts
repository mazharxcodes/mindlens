import {
  GeneratePerspectiveRequestMessage,
  GeneratePerspectiveResponseMessage,
  MindLensSettings
} from "../shared/runtime";
import { PerspectiveService } from "./perspective-service";
import { BiasSnapshot, PerspectiveIntervention } from "./types";

export class RemotePerspectiveService implements PerspectiveService {
  constructor(private readonly settings: MindLensSettings) {}

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
}
