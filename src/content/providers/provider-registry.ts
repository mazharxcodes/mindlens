import { MindLensSettings } from "../../shared/runtime";
import { AnalysisService } from "../analysis/analysis-service";
import { HeuristicAnalysisService } from "../analysis/heuristic-analysis-service";
import { LocalPerspectiveService } from "../interventions/local-perspective-service";
import { PerspectiveService } from "../interventions/perspective-service";
import { RemotePerspectiveService } from "../interventions/remote-perspective-service";
import { ResilientPerspectiveService } from "../interventions/resilient-perspective-service";

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
