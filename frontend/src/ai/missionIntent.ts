import {
  classifyAdjustment,
  isMissionAdjustment,
  MISSION_ADJUSTMENTS,
  type AdjustmentReading
} from "@renew/shared";
import { generate, isEngineReady } from "./webllm";

export interface IntentReading extends AdjustmentReading {
  /** Which tier answered, so the UI can say so rather than imply a mind. */
  source: "on-device" | "rules";
}

const SYSTEM_PROMPT = [
  "Someone describes how their day is going.",
  "Decide whether today's planned activity should be made smaller, kept as it is, or made bigger.",
  "Answer with exactly one word: smaller, keep, or bigger.",
  "If the description is unclear or says nothing about capacity, answer keep.",
  "Never diagnose. Never mention illness, medication, therapy, alcohol or self-harm."
].join(" ");

/**
 * Reads a sentence about today into one of three adjustments.
 *
 * The model gets one job with three possible answers, and anything else it
 * says is thrown away in favour of the keyword pass — so the worst it can
 * do is be no better than the floor. It never sees a Mission, a Vision, a
 * place, or any history; the sentence is the whole input, and it never
 * leaves the device.
 *
 * This is the one place in ReNew where somebody's own words about how they
 * are go into a model at all, which is exactly why it runs locally and why
 * the answer space is three words wide.
 */
export async function readTodaysIntent(text: string): Promise<IntentReading> {
  const floor = classifyAdjustment(text);

  const trimmed = text.trim();
  if (!isEngineReady() || trimmed.length === 0) {
    return { ...floor, source: "rules" };
  }

  // Short and cheap: one word out, so there is no reason to let it run on.
  const raw = await generate(SYSTEM_PROMPT, `Today: ${trimmed.slice(0, 400)}`, 8);
  if (!raw) return { ...floor, source: "rules" };

  const word = raw.toLowerCase().match(/smaller|bigger|keep/)?.[0];
  if (!word || !isMissionAdjustment(word)) {
    // It answered with something outside the three. The keyword pass has
    // already produced a usable reading, so there is nothing to recover.
    return { ...floor, source: "rules" };
  }

  return {
    adjustment: word,
    // A model that agrees with the keywords is worth trusting more than one
    // that overrules them on a sentence with nothing to key on.
    confidence: word === floor.adjustment ? "clear" : floor.matched.length > 0 ? "clear" : "unsure",
    matched: floor.matched,
    source: "on-device"
  };
}

/** Exposed for the settings copy and for tests to assert the closed set. */
export const ALLOWED_ADJUSTMENTS = MISSION_ADJUSTMENTS;
