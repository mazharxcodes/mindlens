import { MindLensEventBus } from "../core/event-bus";
import { AnalysisService } from "./analysis-service";
import { InstagramPost, LocalContentAnalysis } from "../core/types";
import { nowIso } from "../core/utils";

export class LocalAnalysisEngine {
  private readonly analyses = new Map<string, LocalContentAnalysis>();

  constructor(
    private readonly eventBus: MindLensEventBus,
    private readonly analysisService: AnalysisService
  ) {}

  async analyze(post: InstagramPost): Promise<LocalContentAnalysis> {
    const existingAnalysis = this.analyses.get(post.id);
    if (existingAnalysis) {
      return existingAnalysis;
    }

    const analysis = await this.analysisService.analyze(post);
    this.analyses.set(post.id, analysis);
    this.eventBus.emit({
      type: "post_analyzed",
      createdAt: nowIso(),
      postId: post.id,
      analysis
    });

    return analysis;
  }

  getAnalysis(postId: string): LocalContentAnalysis | undefined {
    return this.analyses.get(postId);
  }
}
