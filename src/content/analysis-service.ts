import { InstagramPost, LocalContentAnalysis } from "./types";

export interface AnalysisService {
  analyze(post: InstagramPost): Promise<LocalContentAnalysis>;
}
