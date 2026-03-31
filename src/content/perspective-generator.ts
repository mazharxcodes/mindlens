import { BiasSnapshot, ContentCategory, PerspectiveIntervention, SentimentLabel, ToneLabel } from "./types";
import { nowIso } from "./utils";

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  relationships: "relationship advice",
  fitness: "fitness content",
  money: "money content",
  motivation: "motivation content",
  career: "career content",
  mental_health: "mental health content",
  lifestyle: "lifestyle content",
  general: "similar content"
};

const SENTIMENT_FRAGMENTS: Record<SentimentLabel, string> = {
  positive: "A strong positive streak can make one style of advice feel universal.",
  negative: "A strong negative streak can make edge cases feel like the whole picture.",
  neutral: "A repeated pattern can narrow the lens even when the tone feels neutral."
};

const TONE_FRAGMENTS: Record<ToneLabel, string> = {
  blaming: "People and situations are usually more mixed than blame-heavy posts suggest.",
  victimhood: "Some posts capture pain well, but they can still miss agency and context.",
  aggressive: "High-intensity takes are memorable, though they are rarely the only useful frame.",
  balanced: "Even balanced-looking posts can still repeat the same angle over and over."
};

function buildHeadline(snapshot: BiasSnapshot): string {
  if (snapshot.dominantCategory) {
    return `A wider angle on ${CATEGORY_LABELS[snapshot.dominantCategory]}`;
  }

  return "A wider angle on your current feed";
}

function buildBody(snapshot: BiasSnapshot): string {
  const sentiment = snapshot.dominantSentiment ?? "neutral";
  const tone = snapshot.dominantTone ?? "balanced";
  const category =
    snapshot.dominantCategory ? CATEGORY_LABELS[snapshot.dominantCategory] : "this part of your feed";

  return `${sentiment === "neutral" ? "This feed slice looks pretty concentrated." : SENTIMENT_FRAGMENTS[sentiment]} ${TONE_FRAGMENTS[tone]} A useful check: treat ${category} as one perspective, not the full map.`;
}

export function generatePerspectiveIntervention(snapshot: BiasSnapshot): PerspectiveIntervention {
  const createdAt = nowIso();

  return {
    id: `intervention:${createdAt}`,
    headline: buildHeadline(snapshot),
    body: buildBody(snapshot),
    createdAt,
    trigger: snapshot,
    provider: "local"
  };
}
