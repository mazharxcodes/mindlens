import { MindLensSettings } from "../shared/runtime";
import { AnalysisService } from "./analysis-service";
import { HeuristicAnalysisService } from "./heuristic-analysis-service";
import { LocalPerspectiveService } from "./local-perspective-service";
import { PerspectiveService } from "./perspective-service";
import { RemotePerspectiveService } from "./remote-perspective-service";
import { ResilientPerspectiveService } from "./resilient-perspective-service";

export type MindLensProviders = {
  analysisService: AnalysisService;
  perspectiveService: PerspectiveService;
};

export function createProviders(settings: MindLensSettings): MindLensProviders {
  const analysisService = new HeuristicAnalysisService();
  const localPerspectiveService = new LocalPerspectiveService();

  let perspectiveService: PerspectiveService = localPerspectiveService;
  if (settings.generationMode === "ollama" && settings.ollamaEnabled) {
    perspectiveService = new ResilientPerspectiveService(
      new RemotePerspectiveService(settings),
      localPerspectiveService
    );
  } else if (settings.generationMode === "remote" && settings.remoteGenerationEnabled) {
    perspectiveService = new ResilientPerspectiveService(
      new RemotePerspectiveService(settings),
      localPerspectiveService
    );
  }

  return {
    analysisService,
    perspectiveService
  };
}
