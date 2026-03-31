import { MindLensEventBus } from "./event-bus";
import {
  BiasComponentScores,
  BiasSnapshot,
  ContentCategory,
  LocalContentAnalysis,
  MindLensEvent,
  SentimentLabel,
  ToneLabel
} from "./types";
import { nowIso } from "./utils";

type AnalyzedPostRecord = {
  postId: string;
  analysis: LocalContentAnalysis;
  createdAt: string;
};

type RatioResult<T extends string> = {
  label: T | null;
  ratio: number;
};

const DEFAULT_WINDOW_SIZE = 40;
const MIN_SAMPLE_SIZE = 8;
const DEFAULT_INTERVENTION_THRESHOLD = 0.67;

export class BiasDetector {
  private readonly recentPosts: AnalyzedPostRecord[] = [];
  private latestSnapshot: BiasSnapshot = this.createEmptySnapshot();

  constructor(
    private readonly eventBus: MindLensEventBus,
    private readonly windowSize = DEFAULT_WINDOW_SIZE,
    private readonly interventionThreshold = DEFAULT_INTERVENTION_THRESHOLD
  ) {
    this.eventBus.subscribe((event) => {
      this.handleEvent(event);
    });
  }

  getSnapshot(): BiasSnapshot {
    return this.latestSnapshot;
  }

  private handleEvent(event: MindLensEvent): void {
    if (event.type !== "post_analyzed") {
      return;
    }

    this.recentPosts.push({
      postId: event.postId,
      analysis: event.analysis,
      createdAt: event.createdAt
    });

    if (this.recentPosts.length > this.windowSize) {
      this.recentPosts.shift();
    }

    this.latestSnapshot = this.computeSnapshot();
    this.eventBus.emit({
      type: "bias_updated",
      createdAt: nowIso(),
      snapshot: this.latestSnapshot
    });
  }

  private computeSnapshot(): BiasSnapshot {
    const sampleSize = this.recentPosts.length;
    if (sampleSize === 0) {
      return this.createEmptySnapshot();
    }

    const categories = this.recentPosts.map((record) => ({
      value: record.analysis.category,
      weight: this.getAnalysisWeight(record.analysis)
    }));
    const sentiments = this.recentPosts.map((record) => ({
      value: record.analysis.sentiment,
      weight: this.getAnalysisWeight(record.analysis)
    }));
    const tones = this.recentPosts.map((record) => ({
      value: record.analysis.tone,
      weight: this.getAnalysisWeight(record.analysis)
    }));
    const repeatedSignalRatio = this.computeRepeatedSignalRatio();
    const averageConfidence = Number(
      (
        this.recentPosts.reduce((sum, record) => sum + record.analysis.confidence, 0) / sampleSize
      ).toFixed(2)
    );

    const dominantCategory = this.findDominantRatio(categories);
    const dominantSentiment = this.findDominantRatio(sentiments);
    const dominantTone = this.findDominantRatio(tones);

    const components: BiasComponentScores = {
      categoryDominance: this.normalizeBiasComponent(dominantCategory.ratio, 0.45, 0.85),
      sentimentSkew: this.normalizeBiasComponent(dominantSentiment.ratio, 0.5, 0.9),
      toneSkew: this.normalizeBiasComponent(dominantTone.ratio, 0.45, 0.85),
      repetition: this.normalizeBiasComponent(repeatedSignalRatio, 0.2, 0.75)
    };

    const rawScore =
      components.categoryDominance * 0.35 +
      components.sentimentSkew * 0.2 +
      components.toneSkew * 0.2 +
      components.repetition * 0.25;

    const confidenceMultiplier = Math.min(sampleSize / MIN_SAMPLE_SIZE, 1);
    const calibratedScore = rawScore * confidenceMultiplier * (0.7 + averageConfidence * 0.3);
    const score = Number(Math.min(calibratedScore, 1).toFixed(2));

    return {
      score,
      shouldIntervene: sampleSize >= MIN_SAMPLE_SIZE && score >= this.interventionThreshold,
      sampleSize,
      averageConfidence,
      dominantCategory: dominantCategory.label,
      dominantCategoryRatio: Number(dominantCategory.ratio.toFixed(2)),
      dominantSentiment: dominantSentiment.label,
      dominantSentimentRatio: Number(dominantSentiment.ratio.toFixed(2)),
      dominantTone: dominantTone.label,
      dominantToneRatio: Number(dominantTone.ratio.toFixed(2)),
      repeatedSignalRatio: Number(repeatedSignalRatio.toFixed(2)),
      components: this.roundComponents(components)
    };
  }

  private computeRepeatedSignalRatio(): number {
    const signalCounts = new Map<string, number>();
    let totalSignalWeight = 0;

    for (const record of this.recentPosts) {
      const uniqueSignals = new Set(record.analysis.matchedSignals);
      const weight = this.getAnalysisWeight(record.analysis);
      for (const signal of uniqueSignals) {
        signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + weight);
        totalSignalWeight += weight;
      }
    }

    if (signalCounts.size === 0 || totalSignalWeight === 0) {
      return 0;
    }

    const repeatedSignals = Array.from(signalCounts.values()).filter((count) => count >= 2.2).length;
    return repeatedSignals / signalCounts.size;
  }

  private findDominantRatio<T extends string>(values: Array<{ value: T; weight: number }>): RatioResult<T> {
    if (values.length === 0) {
      return { label: null, ratio: 0 };
    }

    const counts = new Map<T, number>();
    let totalWeight = 0;
    for (const entry of values) {
      counts.set(entry.value, (counts.get(entry.value) ?? 0) + entry.weight);
      totalWeight += entry.weight;
    }

    let bestLabel: T | null = null;
    let bestCount = 0;

    for (const [label, count] of counts.entries()) {
      if (count > bestCount) {
        bestLabel = label;
        bestCount = count;
      }
    }

    return {
      label: bestLabel,
      ratio: totalWeight > 0 ? bestCount / totalWeight : 0
    };
  }

  private getAnalysisWeight(analysis: LocalContentAnalysis): number {
    const confidenceWeight = Math.max(analysis.confidence, 0.15);
    const categoryWeight = analysis.category === "general" ? 0.7 : 1;
    const intensityWeight = 0.75 + analysis.intensity * 0.25;

    return Number((confidenceWeight * categoryWeight * intensityWeight).toFixed(2));
  }

  private normalizeBiasComponent(value: number, neutralFloor: number, saturationPoint: number): number {
    if (value <= neutralFloor) {
      return 0;
    }

    const normalized = (value - neutralFloor) / (saturationPoint - neutralFloor);
    return Number(Math.min(Math.max(normalized, 0), 1).toFixed(2));
  }

  private roundComponents(components: BiasComponentScores): BiasComponentScores {
    return {
      categoryDominance: Number(components.categoryDominance.toFixed(2)),
      sentimentSkew: Number(components.sentimentSkew.toFixed(2)),
      toneSkew: Number(components.toneSkew.toFixed(2)),
      repetition: Number(components.repetition.toFixed(2))
    };
  }

  private createEmptySnapshot(): BiasSnapshot {
    return {
      score: 0,
      shouldIntervene: false,
      sampleSize: 0,
      averageConfidence: 0,
      dominantCategory: null,
      dominantCategoryRatio: 0,
      dominantSentiment: null,
      dominantSentimentRatio: 0,
      dominantTone: null,
      dominantToneRatio: 0,
      repeatedSignalRatio: 0,
      components: {
        categoryDominance: 0,
        sentimentSkew: 0,
        toneSkew: 0,
        repetition: 0
      }
    };
  }
}
