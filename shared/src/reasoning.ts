import { z } from "zod";
import { STATE_TAGS } from "./constants.js";

// Derived here rather than imported from the barrel: reasoning.ts is
// exported by it, and going back through it would be a cycle.
type StateTag = (typeof STATE_TAGS)[number];

/**
 * One step the recommendation actually took, in terms a person can check.
 *
 * This exists so the app can show its working. Nothing here is written to
 * make the process look impressive — every step corresponds to a branch
 * that really ran, and the counts are the real sizes of the candidate pool
 * as it narrowed. A stage that did nothing says so rather than being
 * quietly dropped, because a pipeline that always looks busy is a pipeline
 * nobody can learn anything from.
 */
export const reasoningStepSchema = z.object({
  key: z.string().min(1).max(40),
  /** Three or four words, for the step's own line. */
  label: z.string().min(1).max(60),
  /** One sentence, addressed to the person. */
  detail: z.string().min(1).max(300),
  /** Candidates entering and leaving, when this step narrowed them. */
  before: z.number().int().nonnegative().optional(),
  after: z.number().int().nonnegative().optional()
});

export const reasoningTraceSchema = z.object({
  contractVersion: z.literal(1),
  steps: z.array(reasoningStepSchema).max(12)
});

export type ReasoningStep = z.infer<typeof reasoningStepSchema>;
export type ReasoningTrace = z.infer<typeof reasoningTraceSchema>;

/**
 * How a state tag is said back to the person.
 *
 * Every one of these restates what they themselves reported in the
 * Check-In. None of them names a condition, a severity, or a cause — the
 * product does not diagnose (docs/PRODUCT_GUARDRAILS.md), and a screen
 * built to explain the reasoning is exactly where a clinical-sounding
 * word would do the most damage.
 */
const TAG_PHRASES: Record<string, string> = {
  low_energy: "you said your energy is low",
  high_initiation_difficulty: "you said starting things feels hard right now",
  high_social_load: "you said being around people costs a lot today",
  sleep_disrupted: "you said you slept badly",
  connection_needed: "you said you have been feeling alone",
  reduced_outing: "you have been going out less than usual",
  reduced_activity: "you have been doing less than usual",
  support_suggested: "support options are being kept close by",
  stable: "nothing you reported needed special handling"
};

export function describeStateTags(tags: StateTag[]): string {
  const phrases = tags.map((tag) => TAG_PHRASES[tag]).filter(Boolean);
  if (phrases.length === 0) return "your Check-In was read as it was written";
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases.at(-1)}`;
}

/** Plural that reads correctly at one. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
