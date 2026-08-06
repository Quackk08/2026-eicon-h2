import { isSafeLadderStepTitle } from "@renew/shared";
import { generate, isEngineReady } from "./webllm";

const SYSTEM_PROMPT = [
  "Rewrite a weekly activity summary in plain, calm language.",
  "Keep every number exactly as given. Do not add any number, fact, or event that is not already there.",
  "Do not praise, do not encourage, do not say the person is doing well or badly.",
  "Never diagnose. Never mention illness, medication, therapy, alcohol or self-harm.",
  "Two short sentences at most. Reply with the rewritten text only."
].join(" ");

/** Every run of digits, so a rewrite cannot quietly invent a statistic. */
function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/**
 * Rewrites the rule engine's weekly summary using the on-device model.
 *
 * This is the on-device stand-in for what the Google API does on the
 * server: when Gemini answered, its wording is already what arrived, and
 * this does nothing. When Gemini is off, out of quota, or unreachable, the
 * summary that reaches the person is the rule engine's own counting, and
 * this softens it without changing what it says.
 *
 * The input is aggregate counts and averages only — the same minimised data
 * the server sends to Gemini, and never a Check-In note.
 *
 * Refuses its own output on any of:
 *   - a number that was not in the original (an invented statistic)
 *   - a number from the original having gone missing
 *   - anything the shared safety filter rejects
 *   - a length that suggests it started writing an essay
 *
 * On refusal the rule engine's sentence stands, which is correct rather
 * than merely safe: it was already true.
 */
export async function rephraseWeeklySummary(summary: string): Promise<string | null> {
  if (!isEngineReady() || summary.trim().length === 0) return null;

  const raw = await generate(SYSTEM_PROMPT, summary, 120);
  if (!raw) return null;

  const candidate = raw.trim().replace(/^["']|["']$/g, "");
  if (candidate.length < 10 || candidate.length > summary.length * 2 + 80) return null;
  if (!isSafeLadderStepTitle(candidate)) return null;

  const before = numbersIn(summary);
  const after = numbersIn(candidate);
  if (before.length !== after.length || before.some((n, i) => n !== after[i])) return null;

  return candidate;
}
