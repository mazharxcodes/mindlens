import { ContentCategory, LocalContentAnalysis, SentimentLabel, ToneLabel } from "../core/types";

type WeightedSignal = {
  term: string;
  weight: number;
};

type WeightedSignalMap<T extends string> = Record<T, WeightedSignal[]>;

const CATEGORY_SIGNALS: WeightedSignalMap<ContentCategory> = {
  relationships: [
    { term: "dating", weight: 1.2 },
    { term: "relationship", weight: 1.4 },
    { term: "partner", weight: 1.1 },
    { term: "wife", weight: 1 },
    { term: "husband", weight: 1 },
    { term: "girlfriend", weight: 1.2 },
    { term: "boyfriend", weight: 1.2 },
    { term: "breakup", weight: 1.5 },
    { term: "love", weight: 0.8 },
    { term: "marriage", weight: 1.3 },
    { term: "ex", weight: 0.7 },
    { term: "#datingadvice", weight: 1.8 }
  ],
  fitness: [
    { term: "gym", weight: 1.3 },
    { term: "workout", weight: 1.4 },
    { term: "protein", weight: 1.1 },
    { term: "cardio", weight: 1.2 },
    { term: "exercise", weight: 1.1 },
    { term: "strength", weight: 1.2 },
    { term: "muscle", weight: 1.2 },
    { term: "training", weight: 1.2 },
    { term: "body fat", weight: 1.5 },
    { term: "steps", weight: 0.8 }
  ],
  money: [
    { term: "money", weight: 1.2 },
    { term: "rich", weight: 1.1 },
    { term: "income", weight: 1.3 },
    { term: "wealth", weight: 1.3 },
    { term: "business", weight: 1.1 },
    { term: "finance", weight: 1.4 },
    { term: "investing", weight: 1.4 },
    { term: "salary", weight: 1.1 },
    { term: "sales", weight: 1 },
    { term: "side hustle", weight: 1.6 }
  ],
  motivation: [
    { term: "discipline", weight: 1.5 },
    { term: "mindset", weight: 1.4 },
    { term: "focus", weight: 1.1 },
    { term: "grind", weight: 1.3 },
    { term: "success", weight: 1.1 },
    { term: "motivation", weight: 1.4 },
    { term: "winners", weight: 1.3 },
    { term: "goals", weight: 1 },
    { term: "consistency", weight: 1.2 },
    { term: "self belief", weight: 1.2 }
  ],
  career: [
    { term: "job", weight: 1.1 },
    { term: "career", weight: 1.4 },
    { term: "promotion", weight: 1.3 },
    { term: "resume", weight: 1.2 },
    { term: "interview", weight: 1.2 },
    { term: "manager", weight: 1.1 },
    { term: "startup", weight: 1.3 },
    { term: "founder", weight: 1.3 },
    { term: "office", weight: 0.8 },
    { term: "leadership", weight: 1.2 }
  ],
  mental_health: [
    { term: "anxiety", weight: 1.5 },
    { term: "depression", weight: 1.6 },
    { term: "stress", weight: 1.2 },
    { term: "therapy", weight: 1.5 },
    { term: "healing", weight: 1.1 },
    { term: "trauma", weight: 1.5 },
    { term: "burnout", weight: 1.5 },
    { term: "overthinking", weight: 1.4 },
    { term: "self worth", weight: 1.2 },
    { term: "panic", weight: 1.4 }
  ],
  lifestyle: [
    { term: "morning routine", weight: 1.5 },
    { term: "travel", weight: 1.1 },
    { term: "fashion", weight: 1.1 },
    { term: "home", weight: 0.8 },
    { term: "skincare", weight: 1.2 },
    { term: "food", weight: 0.9 },
    { term: "recipe", weight: 1.1 },
    { term: "weekend", weight: 0.8 },
    { term: "vlog", weight: 1.2 },
    { term: "daily life", weight: 1.2 }
  ],
  general: []
};

const POSITIVE_SIGNALS: WeightedSignal[] = [
  { term: "healthy", weight: 1.2 },
  { term: "growth", weight: 1.2 },
  { term: "calm", weight: 1.1 },
  { term: "progress", weight: 1.1 },
  { term: "peace", weight: 1.2 },
  { term: "confidence", weight: 1.2 },
  { term: "joy", weight: 1.1 },
  { term: "grateful", weight: 1.3 },
  { term: "balanced", weight: 1.2 },
  { term: "better", weight: 0.9 }
];

const NEGATIVE_SIGNALS: WeightedSignal[] = [
  { term: "toxic", weight: 1.4 },
  { term: "hate", weight: 1.3 },
  { term: "failure", weight: 1.2 },
  { term: "broken", weight: 1.2 },
  { term: "never", weight: 0.8 },
  { term: "worst", weight: 1.4 },
  { term: "pain", weight: 1.2 },
  { term: "angry", weight: 1.3 },
  { term: "betrayal", weight: 1.5 },
  { term: "lied", weight: 1.2 },
  { term: "cheated", weight: 1.5 }
];

const TONE_SIGNALS: WeightedSignalMap<ToneLabel> = {
  blaming: [
    { term: "they always", weight: 1.8 },
    { term: "they never", weight: 1.8 },
    { term: "women are", weight: 1.6 },
    { term: "men are", weight: 1.6 },
    { term: "people are trash", weight: 2 },
    { term: "it's their fault", weight: 1.9 },
    { term: "everyone else", weight: 1.2 },
    { term: "blame", weight: 1.1 }
  ],
  victimhood: [
    { term: "no one cares", weight: 1.8 },
    { term: "why does this always happen to me", weight: 2 },
    { term: "i'm done", weight: 1.4 },
    { term: "used me", weight: 1.5 },
    { term: "left me", weight: 1.4 },
    { term: "i give up", weight: 1.8 },
    { term: "nothing works", weight: 1.7 },
    { term: "i can't win", weight: 1.8 }
  ],
  aggressive: [
    { term: "destroy", weight: 1.6 },
    { term: "dominate", weight: 1.3 },
    { term: "losers", weight: 1.8 },
    { term: "weak", weight: 1.3 },
    { term: "pathetic", weight: 1.8 },
    { term: "revenge", weight: 1.5 },
    { term: "humiliate", weight: 1.8 },
    { term: "shut up", weight: 1.7 },
    { term: "idiot", weight: 1.7 }
  ],
  balanced: [
    { term: "sometimes", weight: 1.2 },
    { term: "it depends", weight: 1.6 },
    { term: "in my experience", weight: 1.4 },
    { term: "for some people", weight: 1.5 },
    { term: "context matters", weight: 1.8 },
    { term: "may help", weight: 1.2 },
    { term: "consider", weight: 1.1 },
    { term: "one perspective", weight: 1.3 }
  ]
};

const NEGATORS = new Set(["not", "never", "no", "isnt", "isn't", "dont", "don't", "cant", "can't", "without"]);
const BOOSTER_TOKENS = new Set(["very", "extremely", "super", "deeply", "seriously", "really"]);

function normalizeForAnalysis(text: string): string {
  return text.toLowerCase().replace(/[^\w\s#']/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function extractHashtags(text: string): string[] {
  return Array.from(new Set(text.match(/#[a-z0-9_]+/gi)?.map((tag) => tag.toLowerCase()) ?? []));
}

function containsPhrase(text: string, phrase: string): boolean {
  return text.includes(phrase);
}

function getTokenWeightMultiplier(tokens: string[], index: number): number {
  const previousTokens = tokens.slice(Math.max(0, index - 2), index);
  return previousTokens.some((token) => BOOSTER_TOKENS.has(token)) ? 1.25 : 1;
}

function isNegated(tokens: string[], index: number): boolean {
  const previousTokens = tokens.slice(Math.max(0, index - 3), index);
  return previousTokens.some((token) => NEGATORS.has(token));
}

function scoreSignals(
  normalizedText: string,
  tokens: string[],
  signals: WeightedSignal[],
  prefix: string,
  options?: { detectNegation?: boolean }
): { score: number; matches: string[] } {
  let score = 0;
  const matches: string[] = [];

  for (const signal of signals) {
    if (signal.term.includes(" ")) {
      if (containsPhrase(normalizedText, signal.term)) {
        score += signal.weight;
        matches.push(`${prefix}:${signal.term}`);
      }
      continue;
    }

    tokens.forEach((token, index) => {
      if (token !== signal.term) {
        return;
      }

      const multiplier = getTokenWeightMultiplier(tokens, index);
      const weightedScore = signal.weight * multiplier;

      if (options?.detectNegation && isNegated(tokens, index)) {
        score -= weightedScore;
        matches.push(`${prefix}:negated:${signal.term}`);
      } else {
        score += weightedScore;
        matches.push(`${prefix}:${signal.term}`);
      }
    });
  }

  return {
    score: Number(score.toFixed(2)),
    matches
  };
}

function buildEmptyCategoryScores(): Record<ContentCategory, number> {
  return {
    relationships: 0,
    fitness: 0,
    money: 0,
    motivation: 0,
    career: 0,
    mental_health: 0,
    lifestyle: 0,
    general: 0
  };
}

function buildEmptyToneScores(): Record<ToneLabel, number> {
  return {
    blaming: 0,
    victimhood: 0,
    aggressive: 0,
    balanced: 0
  };
}

function scoreCategories(normalizedText: string, tokens: string[], hashtags: string[]) {
  const categoryScores = buildEmptyCategoryScores();
  const matches: string[] = [];

  for (const [category, signals] of Object.entries(CATEGORY_SIGNALS) as Array<
    [ContentCategory, WeightedSignal[]]
  >) {
    if (category === "general") {
      continue;
    }

    const textSignals = signals.filter((signal) => !signal.term.startsWith("#"));
    const hashtagSignals = signals.filter((signal) => signal.term.startsWith("#"));
    const textResult = scoreSignals(normalizedText, tokens, textSignals, `category.${category}`);
    let score = textResult.score;
    matches.push(...textResult.matches);

    for (const signal of hashtagSignals) {
      if (hashtags.includes(signal.term)) {
        score += signal.weight;
        matches.push(`category.${category}:${signal.term}`);
      }
    }

    categoryScores[category] = Number(score.toFixed(2));
  }

  const bestNonGeneral = Math.max(...Object.values(categoryScores).filter((value) => value > 0), 0);
  categoryScores.general = bestNonGeneral === 0 ? 1 : 0;

  return { categoryScores, matches };
}

function pickDominantCategory(categoryScores: Record<ContentCategory, number>): ContentCategory {
  let bestCategory: ContentCategory = "general";
  let bestScore = categoryScores.general;

  for (const [category, score] of Object.entries(categoryScores) as Array<[ContentCategory, number]>) {
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

function scoreSentiment(normalizedText: string, tokens: string[]) {
  const positive = scoreSignals(normalizedText, tokens, POSITIVE_SIGNALS, "sentiment+", {
    detectNegation: true
  });
  const negative = scoreSignals(normalizedText, tokens, NEGATIVE_SIGNALS, "sentiment-", {
    detectNegation: true
  });
  const sentimentScore = Number((positive.score - negative.score).toFixed(2));

  let sentiment: SentimentLabel = "neutral";
  if (sentimentScore >= 1.1) {
    sentiment = "positive";
  } else if (sentimentScore <= -1.1) {
    sentiment = "negative";
  }

  return {
    sentiment,
    sentimentScore,
    matches: [...positive.matches, ...negative.matches]
  };
}

function scoreTone(normalizedText: string, tokens: string[]) {
  const toneScores = buildEmptyToneScores();
  const matches: string[] = [];

  for (const [tone, signals] of Object.entries(TONE_SIGNALS) as Array<[ToneLabel, WeightedSignal[]]>) {
    const result = scoreSignals(normalizedText, tokens, signals, `tone.${tone}`);
    toneScores[tone] = result.score;
    matches.push(...result.matches);
  }

  let tone: ToneLabel = "balanced";
  let bestScore = toneScores.balanced;
  for (const [candidateTone, score] of Object.entries(toneScores) as Array<[ToneLabel, number]>) {
    if (score > bestScore) {
      tone = candidateTone;
      bestScore = score;
    }
  }

  if (bestScore < 1) {
    tone = "balanced";
  }

  return { tone, toneScores, matches };
}

function scoreIntensity(rawText: string, sentimentScore: number, toneScores: Record<ToneLabel, number>): number {
  const exclamationCount = (rawText.match(/!/g) ?? []).length;
  const uppercaseWords = (rawText.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  const toneMagnitude = Math.max(
    toneScores.blaming,
    toneScores.victimhood,
    toneScores.aggressive,
    toneScores.balanced
  );
  const emotionalWeight = Math.min(
    (Math.abs(sentimentScore) + toneMagnitude + exclamationCount * 0.35 + uppercaseWords * 0.2) / 5,
    1
  );

  return Number(emotionalWeight.toFixed(2));
}

function scoreConfidence(args: {
  textLength: number;
  hashtags: string[];
  matchedSignalsCount: number;
  categoryScores: Record<ContentCategory, number>;
  toneScores: Record<ToneLabel, number>;
  sentimentScore: number;
}): number {
  const sortedCategoryScores = Object.entries(args.categoryScores)
    .filter(([category]) => category !== "general")
    .map(([, score]) => score)
    .sort((left, right) => right - left);
  const categoryMargin = (sortedCategoryScores[0] ?? 0) - (sortedCategoryScores[1] ?? 0);
  const topToneScore = Math.max(...Object.values(args.toneScores));
  const signalStrength = Math.min(args.matchedSignalsCount / 8, 1);
  const textCoverage = Math.min(args.textLength / 320, 1);
  const confidence =
    Math.min(categoryMargin / 2.5, 1) * 0.3 +
    Math.min(Math.abs(args.sentimentScore) / 2.5, 1) * 0.2 +
    Math.min(topToneScore / 2.5, 1) * 0.15 +
    signalStrength * 0.2 +
    textCoverage * 0.1 +
    Math.min(args.hashtags.length / 4, 1) * 0.05;

  return Number(Math.max(0.12, Math.min(confidence, 1)).toFixed(2));
}

export function analyzePostText(text: string): LocalContentAnalysis {
  const normalizedText = normalizeForAnalysis(text);
  const tokens = tokenize(normalizedText);
  const hashtags = extractHashtags(text);
  const categoryResult = scoreCategories(normalizedText, tokens, hashtags);
  const sentimentResult = scoreSentiment(normalizedText, tokens);
  const toneResult = scoreTone(normalizedText, tokens);
  const matchedSignals = Array.from(
    new Set([...categoryResult.matches, ...sentimentResult.matches, ...toneResult.matches])
  );

  return {
    category: pickDominantCategory(categoryResult.categoryScores),
    sentiment: sentimentResult.sentiment,
    tone: toneResult.tone,
    intensity: scoreIntensity(text, sentimentResult.sentimentScore, toneResult.toneScores),
    confidence: scoreConfidence({
      textLength: text.length,
      hashtags,
      matchedSignalsCount: matchedSignals.length,
      categoryScores: categoryResult.categoryScores,
      toneScores: toneResult.toneScores,
      sentimentScore: sentimentResult.sentimentScore
    }),
    sentimentScore: sentimentResult.sentimentScore,
    categoryScores: categoryResult.categoryScores,
    toneScores: toneResult.toneScores,
    hashtags,
    matchedSignals
  };
}
