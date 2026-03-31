import { ContentCategory, LocalContentAnalysis, SentimentLabel, ToneLabel } from "./types";

type WeightedTerms<T extends string> = Record<T, string[]>;

const CATEGORY_TERMS: WeightedTerms<ContentCategory> = {
  relationships: [
    "dating",
    "relationship",
    "partner",
    "wife",
    "husband",
    "girlfriend",
    "boyfriend",
    "breakup",
    "love",
    "marriage",
    "ex"
  ],
  fitness: [
    "gym",
    "workout",
    "protein",
    "cardio",
    "exercise",
    "strength",
    "muscle",
    "training",
    "body fat",
    "steps"
  ],
  money: [
    "money",
    "rich",
    "income",
    "wealth",
    "business",
    "finance",
    "investing",
    "salary",
    "sales",
    "side hustle"
  ],
  motivation: [
    "discipline",
    "mindset",
    "focus",
    "grind",
    "success",
    "motivation",
    "winners",
    "goals",
    "consistency",
    "self belief"
  ],
  career: [
    "job",
    "career",
    "promotion",
    "resume",
    "interview",
    "manager",
    "startup",
    "founder",
    "office",
    "leadership"
  ],
  mental_health: [
    "anxiety",
    "depression",
    "stress",
    "therapy",
    "healing",
    "trauma",
    "burnout",
    "overthinking",
    "self worth",
    "panic"
  ],
  lifestyle: [
    "morning routine",
    "travel",
    "fashion",
    "home",
    "skincare",
    "food",
    "recipe",
    "weekend",
    "vlog",
    "daily life"
  ],
  general: []
};

const POSITIVE_TERMS = [
  "healthy",
  "growth",
  "calm",
  "progress",
  "peace",
  "confidence",
  "joy",
  "grateful",
  "balanced",
  "better"
];

const NEGATIVE_TERMS = [
  "toxic",
  "hate",
  "failure",
  "broken",
  "never",
  "worst",
  "pain",
  "angry",
  "betrayal",
  "lied",
  "cheated"
];

const BLAMING_TERMS = [
  "they always",
  "they never",
  "women are",
  "men are",
  "people are trash",
  "it's their fault",
  "everyone else",
  "blame"
];

const VICTIMHOOD_TERMS = [
  "no one cares",
  "why does this always happen to me",
  "i'm done",
  "used me",
  "left me",
  "i give up",
  "nothing works",
  "i can't win"
];

const AGGRESSIVE_TERMS = [
  "destroy",
  "dominate",
  "losers",
  "weak",
  "pathetic",
  "revenge",
  "humiliate",
  "shut up",
  "idiot"
];

const BALANCED_TERMS = [
  "sometimes",
  "it depends",
  "in my experience",
  "for some people",
  "context matters",
  "may help",
  "consider",
  "one perspective"
];

function normalizeForAnalysis(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function collectMatches(text: string, groups: Array<[string, string[]]>): string[] {
  const matches: string[] = [];

  for (const [prefix, terms] of groups) {
    for (const term of terms) {
      if (text.includes(term)) {
        matches.push(`${prefix}:${term}`);
      }
    }
  }

  return matches;
}

function scoreCategory(text: string): ContentCategory {
  let bestCategory: ContentCategory = "general";
  let bestScore = 0;

  for (const [category, terms] of Object.entries(CATEGORY_TERMS) as Array<[ContentCategory, string[]]>) {
    if (category === "general") {
      continue;
    }

    const score = countMatches(text, terms);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

function scoreSentiment(text: string): SentimentLabel {
  const positiveScore = countMatches(text, POSITIVE_TERMS);
  const negativeScore = countMatches(text, NEGATIVE_TERMS);

  if (positiveScore === negativeScore) {
    return "neutral";
  }

  return positiveScore > negativeScore ? "positive" : "negative";
}

function scoreTone(text: string): ToneLabel {
  const toneScores: Array<[ToneLabel, number]> = [
    ["blaming", countMatches(text, BLAMING_TERMS)],
    ["victimhood", countMatches(text, VICTIMHOOD_TERMS)],
    ["aggressive", countMatches(text, AGGRESSIVE_TERMS)],
    ["balanced", countMatches(text, BALANCED_TERMS)]
  ];

  toneScores.sort((left, right) => right[1] - left[1]);
  const [bestTone, bestScore] = toneScores[0];

  return bestScore > 0 ? bestTone : "balanced";
}

function scoreIntensity(text: string, matchedSignalsCount: number): number {
  const exclamationCount = (text.match(/!/g) ?? []).length;
  const uppercaseWords = (text.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  const emotionalWeight = Math.min((matchedSignalsCount + exclamationCount + uppercaseWords) / 8, 1);

  return Number(emotionalWeight.toFixed(2));
}

function scoreConfidence(matchedSignalsCount: number, textLength: number): number {
  const signalScore = Math.min(matchedSignalsCount / 6, 1);
  const textCoverageScore = Math.min(textLength / 280, 1);

  return Number(((signalScore * 0.7) + (textCoverageScore * 0.3)).toFixed(2));
}

export function analyzePostText(text: string): LocalContentAnalysis {
  const normalizedText = normalizeForAnalysis(text);
  const matchedSignals = collectMatches(normalizedText, [
    ["category", Object.values(CATEGORY_TERMS).flat()],
    ["sentiment+", POSITIVE_TERMS],
    ["sentiment-", NEGATIVE_TERMS],
    ["tone.blame", BLAMING_TERMS],
    ["tone.victim", VICTIMHOOD_TERMS],
    ["tone.aggressive", AGGRESSIVE_TERMS],
    ["tone.balanced", BALANCED_TERMS]
  ]);

  return {
    category: scoreCategory(normalizedText),
    sentiment: scoreSentiment(normalizedText),
    tone: scoreTone(normalizedText),
    intensity: scoreIntensity(text, matchedSignals.length),
    confidence: scoreConfidence(matchedSignals.length, text.length),
    matchedSignals
  };
}
