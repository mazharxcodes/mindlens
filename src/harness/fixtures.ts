export type HarnessScenario = {
  id: string;
  name: string;
  description: string;
  posts: string[];
};

export const HARNESS_SCENARIOS: HarnessScenario[] = [
  {
    id: "relationship-doom-loop",
    name: "Relationship Doom Loop",
    description: "Repetitive negative dating content with blame-heavy framing.",
    posts: [
      "If they wanted to, they would. Stop begging for basic effort. #datingadvice #breakup",
      "Modern relationships fail because people want attention, not commitment.",
      "Your ex did not leave because you were hard to love. They were selfish and emotionally unavailable.",
      "Men are only romantic in the beginning. After that you see the truth.",
      "No one talks about how betrayal changes the way you trust forever.",
      "If someone confuses you, that is the answer. Protect your peace.",
      "People are trash when convenience matters more than loyalty.",
      "Healing is realizing you were never asking for too much, just from the wrong person.",
      "Dating apps reward shallow behavior and call it chemistry.",
      "They always come back when they see you moved on."
    ]
  },
  {
    id: "hustle-grind-loop",
    name: "Hustle Grind Loop",
    description: "High-intensity motivation and money content with absolutist framing.",
    posts: [
      "You are not tired, you are distracted. Winners do what losers avoid.",
      "If you still need motivation, you do not want success badly enough.",
      "Work while they sleep. The market rewards obsession, not balance.",
      "Your salary is a trap if you want real freedom.",
      "Discipline beats feelings every single time.",
      "Average people call it toxic because they fear consistency.",
      "Nobody is coming to save you. Build the business.",
      "Comfort is expensive. Grind now or regret it later.",
      "You do not need another plan, you need execution.",
      "Rich people optimize mornings because weak routines create weak results."
    ]
  },
  {
    id: "mixed-balanced-feed",
    name: "Mixed Balanced Feed",
    description: "A healthier, more varied feed with softer tone and mixed categories.",
    posts: [
      "A short walk after lunch can improve focus more than people expect.",
      "Some career advice works best early on, but context matters later.",
      "In relationships, one honest conversation can help more than guessing.",
      "A simple budget can reduce stress even if your income has not changed yet.",
      "For some people, consistency is built through small routines, not perfect discipline.",
      "Sometimes rest is productive when your attention is scattered.",
      "A recipe does not need to be optimized to be worth making on a weeknight.",
      "Therapy can help, but different tools work for different people.",
      "Travel content is fun, but daily life still shapes most of our wellbeing.",
      "Progress rarely feels dramatic while it is happening."
    ]
  }
];
