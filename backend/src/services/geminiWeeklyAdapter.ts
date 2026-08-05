import { weeklyInsightResultSchema, type WeeklyInsightResult, type WeeklyInsightStats } from "@renew/shared";
import { callGemini as callGeminiApi, GEMINI_TIMEOUTS } from "./geminiTransport.js";
import { isAIEnabled } from "../config/env.js";

/**
 * Gemini only rewords the already-computed, aggregate weekly stats into a
 * short non-clinical summary — it never sees raw check-in notes, and it
 * cannot introduce a diagnosis or risk framing (docs/IMPLEMENTATION_PLAN.md
 * section 7: "근거가 있는 주간 기록을 비의료적으로 요약한다"). Falls back to
 * the rule-based summary on any failure.
 */
export async function summarizeWeeklyWithGemini(stats: WeeklyInsightStats): Promise<WeeklyInsightResult | null> {
  if (!isAIEnabled()) return null;

  const raw = await callGemini(buildPrompt(stats));
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = weeklyInsightResultSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

function buildPrompt(stats: WeeklyInsightStats): string {
  return `
You write a short weekly life-pattern summary for ReNew, a lifestyle-architecture app. You are NOT diagnosing anything, calculating risk, or suggesting medication.

STRICT RULES:
1. Never mention diagnosis, risk probability, or medical/therapeutic framing.
2. Never compare the user to other people — only to their own recent history.
3. Do not treat a missed or postponed action as a failure; frame size/plan adjustments neutrally.
4. Write in English, short and practical.

WEEKLY STATS (aggregate only, no raw notes):
${JSON.stringify(stats)}

Respond with ONLY a JSON object matching exactly this shape:
{"contractVersion":1,"summary":"string","maintainedNote":"string|null","adjustmentSuggestion":"string|null"}
`.trim();
}

async function callGemini(prompt: string): Promise<string | null> {
  return callGeminiApi({
    parts: [{ text: prompt }],
    label: "gemini-weekly",
    timeoutMs: GEMINI_TIMEOUTS.deliberate
  });
}
