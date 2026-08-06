/**
 * Turning "how is today going?" into one of the adjustments ReNew already
 * knows how to make.
 *
 * The set is closed on purpose. Whatever reads the sentence — a keyword
 * pass or a language model — may only answer with one of these, so no
 * amount of misreading can produce an action the Activity Ladder does not
 * already contain. That is what makes it safe to let a model near this at
 * all: it is choosing a direction on a rail, not writing a prescription.
 */
export const MISSION_ADJUSTMENTS = ["smaller", "keep", "bigger"] as const;
export type MissionAdjustment = (typeof MISSION_ADJUSTMENTS)[number];

export interface AdjustmentReading {
  adjustment: MissionAdjustment;
  /**
   * How much the reading rests on something actually said, rather than on
   * the default. "keep" with no evidence is a shrug, not a judgement, and
   * the UI needs to be able to tell those apart.
   */
  confidence: "clear" | "unsure";
  /** The words it keyed on, so the person can see what was read. */
  matched: string[];
}

/*
 * Phrases people actually use about a hard day, and about a good one.
 *
 * Deliberately about capacity and circumstance — never about mood as a
 * condition. "sad" and "anxious" are absent: ReNew does not read feelings
 * as symptoms, and a smaller step is offered because someone said the day
 * is heavy, not because software decided how they are.
 */
const SMALLER_CUES = [
  "tired", "exhausted", "drained", "wiped", "heavy", "hard", "rough", "rubbish",
  "no energy", "low energy", "not much energy", "running on empty",
  "overwhelmed", "too much", "a lot on", "swamped", "busy", "no time",
  "short on time", "can't face", "cannot face", "struggling", "sore", "ill",
  "unwell", "sick", "headache", "did not sleep", "didn't sleep", "barely slept",
  "bad night", "not up to", "not feeling it", "smaller", "less", "lighter"
];

const BIGGER_CUES = [
  "good", "great", "fine", "better", "strong", "energetic", "rested",
  "slept well", "up for", "ready", "keen", "motivated", "clear day",
  "free", "plenty of time", "more time", "extra time", "bigger", "more",
  "longer", "further", "push"
];

/** Negations that flip a positive cue: "not great", "don't feel ready". */
const NEGATORS = ["not ", "no ", "don't ", "dont ", "cannot ", "can't ", "cant ", "never ", "hardly ", "barely "];

function findCues(haystack: string, cues: string[]): string[] {
  return cues.filter((cue) => haystack.includes(cue));
}

/**
 * Reads a sentence with no model and no network.
 *
 * This is the floor the whole feature stands on: the on-device model is an
 * improvement over it, never a requirement for it. Someone on a phone that
 * cannot run a model, or who never turned one on, still gets an answer.
 */
export function classifyAdjustment(text: string): AdjustmentReading {
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, " ").trim()} `;
  if (haystack.trim().length === 0) {
    return { adjustment: "keep", confidence: "unsure", matched: [] };
  }

  const smaller = findCues(haystack, SMALLER_CUES);
  let bigger = findCues(haystack, BIGGER_CUES);

  // "not great" is not a good day. Checked against the words immediately
  // before the cue rather than the whole sentence, so "no time but feeling
  // good" does not cancel itself out.
  bigger = bigger.filter((cue) => {
    const at = haystack.indexOf(cue);
    const before = haystack.slice(Math.max(0, at - 12), at);
    return !NEGATORS.some((negator) => before.includes(negator));
  });

  if (smaller.length > bigger.length) {
    return { adjustment: "smaller", confidence: "clear", matched: smaller.slice(0, 3) };
  }
  if (bigger.length > smaller.length) {
    return { adjustment: "bigger", confidence: "clear", matched: bigger.slice(0, 3) };
  }
  // Both or neither: nothing here justifies changing what was already
  // chosen for them.
  return {
    adjustment: "keep",
    confidence: smaller.length > 0 ? "unsure" : "unsure",
    matched: [...smaller, ...bigger].slice(0, 3)
  };
}

/** Only these three are ever accepted, whoever produced the answer. */
export function isMissionAdjustment(value: unknown): value is MissionAdjustment {
  return typeof value === "string" && (MISSION_ADJUSTMENTS as readonly string[]).includes(value);
}

/** What ReNew says it is about to do, before doing it. */
export function describeAdjustment(adjustment: MissionAdjustment): string {
  switch (adjustment) {
    case "smaller":
      return "Make today's step one size smaller";
    case "bigger":
      return "Take the next size up";
    case "keep":
      return "Keep the step you already have";
  }
}
