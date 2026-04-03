import { BiasSnapshot, ContentCategory, PerspectiveIntervention, SentimentLabel, ToneLabel } from "./types";
import { nowIso } from "./utils";

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  relationships: "relationships",
  fitness: "fitness",
  money: "money",
  motivation: "motivation",
  career: "career",
  mental_health: "mental health",
  lifestyle: "lifestyle",
  general: "this part of your feed"
};

const OPENING_LINES: Record<SentimentLabel, string> = {
  positive:
    "When a feed leans heavily positive, it can make one kind of advice feel more universal than it really is.",
  negative:
    "When the same hard angle keeps repeating, it can start to feel like the whole truth instead of one slice of it.",
  neutral:
    "Even a calm-looking feed can narrow your perspective when the same framing shows up again and again."
};

const TONE_LINES: Record<ToneLabel, string> = {
  blaming:
    "Blame-centered content can be clarifying in the moment, but it often leaves out the messier mix of context, timing, and human limitations on the other side.",
  victimhood:
    "Pain can be real and worth naming, while still leaving room for agency, boundaries, and the possibility that more than one truth can be present at once.",
  aggressive:
    "Sharp, high-certainty takes are easy to remember, but they often flatten the other side of the picture into something simpler than it really is.",
  balanced:
    "Even balanced-sounding posts can still pull you toward one side of the coin if they keep reinforcing the same takeaway."
};

const CLOSING_LINES: Record<ContentCategory, string> = {
  relationships:
    "A fuller view usually holds both self-respect and empathy at once, because most relationship dynamics contain hurt, blind spots, needs, and intent on both sides.",
  fitness:
    "A fuller view usually makes space for consistency, recovery, genetics, and real-life constraints, because effort matters but it is rarely the only variable.",
  money:
    "A fuller view usually includes risk, timing, privilege, and tradeoffs, because what looks obvious from one angle can carry hidden costs from another.",
  motivation:
    "A fuller view usually leaves room for energy, support, grief, and rest, because pushing harder is sometimes useful and sometimes exactly the wrong lesson.",
  career:
    "A fuller view usually includes timing, team context, luck, and burnout, because ambition and sustainability both matter depending on the season.",
  mental_health:
    "A fuller view usually holds both validation and responsibility, because people often need compassion and accountability at the same time.",
  lifestyle:
    "A fuller view usually remembers that what looks effortless online is often selective, edited, and built on invisible support that is easy to miss from the outside.",
  general:
    "A fuller view usually starts by treating repeated content as one side of the coin, not the whole map."
};

function buildHeadline(snapshot: BiasSnapshot): string {
  const category = snapshot.dominantCategory ?? "general";

  switch (category) {
    case "relationships":
      return "A gentler read on relationship advice";
    case "money":
      return "A fuller lens on money content";
    case "motivation":
      return "A steadier lens on motivation";
    case "mental_health":
      return "A fuller read on mental health content";
    default:
      return `A fuller lens on ${CATEGORY_LABELS[category]}`;
  }
}

function buildBody(snapshot: BiasSnapshot): string {
  const sentiment = snapshot.dominantSentiment ?? "neutral";
  const tone = snapshot.dominantTone ?? "balanced";
  const category = snapshot.dominantCategory ?? "general";

  return [
    OPENING_LINES[sentiment],
    TONE_LINES[tone],
    CLOSING_LINES[category]
  ].join(" ");
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
