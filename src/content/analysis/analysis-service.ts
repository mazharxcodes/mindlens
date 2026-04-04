import { InstagramPost, LocalContentAnalysis } from "../core/types";

export interface AnalysisService {
  analyze(post: InstagramPost): Promise<LocalContentAnalysis>;
}
