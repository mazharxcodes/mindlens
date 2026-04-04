import { AnalysisService } from "./analysis-service";
import { analyzePostText } from "./local-analyzer";
import { InstagramPost, LocalContentAnalysis } from "../core/types";

export class HeuristicAnalysisService implements AnalysisService {
  async analyze(post: InstagramPost): Promise<LocalContentAnalysis> {
    return analyzePostText(post.text);
  }
}
