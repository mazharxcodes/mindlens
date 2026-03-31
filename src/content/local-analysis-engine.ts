import { MindLensEventBus } from "./event-bus";
import { InstagramPost, LocalContentAnalysis } from "./types";
import { nowIso } from "./utils";
import { analyzePostText } from "./local-analyzer";

export class LocalAnalysisEngine {
  private readonly analyses = new Map<string, LocalContentAnalysis>();

  constructor(private readonly eventBus: MindLensEventBus) {}

  analyze(post: InstagramPost): LocalContentAnalysis {
    const analysis = analyzePostText(post.text);
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
