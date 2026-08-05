import { isSafeLadderStepTitle } from "@renew/shared";
import type { AppData, RecommendationOption } from "../data/appData";
import {
  getEligibleMissionOptions,
  getLatestCheckIn,
  getRecommendedMissionOption
} from "../data/missionLogic";
import { generate, isEngineReady } from "./webllm";

export interface LocalPick {
  option: RecommendationOption;
  /** One sentence, already checked. Null when only the ordering was used. */
  reason: string | null;
}

const SYSTEM_PROMPT = [
  "You help someone choose which of their own pre-approved daily actions to do today.",
  "You may ONLY choose from the numbered list you are given. Never invent an action.",
  "Never diagnose, never mention illness, medication, therapy, alcohol or self-harm.",
  "Never tell the person they are behind, failing, or should try harder.",
  'Reply with only JSON: {"choice": <number>, "reason": "<one short sentence>"}'
].join(" ");

/**
 * Pulls the first JSON object out of a reply.
 *
 * Small models wrap JSON in prose and code fences more often than not, and
 * a strict parse would throw away answers that were perfectly good.
 */
function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * A sentence is only shown if it could have come from a reviewed step.
 *
 * The same filter the server applies to generated ladders, for the same
 * reason: a model running on someone's laptop has had no more review than
 * one running in a data centre, and this is the last point at which its
 * words can be stopped.
 */
function isShowableReason(reason: unknown): reason is string {
  if (typeof reason !== "string") return false;
  const trimmed = reason.trim();
  if (trimmed.length < 4 || trimmed.length > 200) return false;
  return isSafeLadderStepTitle(trimmed);
}

/**
 * Asks the on-device model which of today's already-eligible options to
 * lead with, and for a sentence explaining it.
 *
 * The safety of this rests on the candidate list, not on the model: every
 * option passed in has already been through the rule engine's filters, so
 * the worst a wrong answer can do is put a workable step in second place.
 * Anything that is not a number in range comes back as the rules' own pick.
 *
 * Returns null when the model is not loaded, declines, or produces
 * something unusable — callers treat that identically to it being off.
 */
export async function pickWithLocalModel(
  options: RecommendationOption[],
  ruleChoice: RecommendationOption,
  todaySummary: string
): Promise<LocalPick | null> {
  if (!isEngineReady() || options.length === 0) return null;

  const list = options
    .map((option, index) => `${index + 1}. ${option.title} (${option.durationMinutes} min, ${option.socialMode})`)
    .join("\n");

  const raw = await generate(
    SYSTEM_PROMPT,
    `Today: ${todaySummary}\n\nOptions:\n${list}\n\nWhich number fits today best, and why?`
  );
  if (!raw) return null;

  const parsed = extractJson(raw) as { choice?: unknown; reason?: unknown } | null;
  if (!parsed) return null;

  const choice = Number(parsed.choice);
  if (!Number.isInteger(choice) || choice < 1 || choice > options.length) {
    // Out of range means it invented something. The rules already have an
    // answer, so there is nothing to recover and nothing to report.
    return null;
  }

  const reason = isShowableReason(parsed.reason) ? parsed.reason.trim() : null;
  const option = options[choice - 1] ?? ruleChoice;

  return { option, reason };
}

/** Today, in the few words the model is allowed to see. */
function summariseToday(data: AppData): string {
  const checkIn = getLatestCheckIn(data);
  if (!checkIn) return "no Check-In yet today";
  // Numbers, not narrative. The Check-In note is the person's own private
  // writing and is deliberately never sent, not even to a model on their
  // own machine — there is no reason it needs it to order a list.
  return `energy ${checkIn.energy}/5, what feels doable ${checkIn.capacity}/5, up to ${data.preferences.availableMinutes} minutes`;
}

/**
 * The on-device model's contribution to the reasoning screen, or null.
 *
 * Deliberately returns only a description of what it did, not a new
 * recommendation: the Mission the server created is the one that exists,
 * and having the browser quietly point at a different action would leave
 * the screen explaining a choice the rest of the app never made.
 */
export async function describeWithLocalModel(
  data: AppData
): Promise<{ label: string; detail: string } | null> {
  const ruleChoice = getRecommendedMissionOption(data);
  if (!ruleChoice) return null;

  const eligible = getEligibleMissionOptions(data);
  const options = eligible.length > 0 ? eligible : data.recommendations;
  if (options.length < 2) return null;

  const pick = await pickWithLocalModel(options, ruleChoice, summariseToday(data));
  if (!pick) return null;

  return {
    label: "Reworded on this device",
    detail: pick.reason
      ? `${pick.reason} (Written by the small model running in this browser, from steps ReNew had already chosen. Nothing was sent anywhere.)`
      : "A small model running in this browser looked over the same steps and agreed with the order. Nothing was sent anywhere."
  };
}
