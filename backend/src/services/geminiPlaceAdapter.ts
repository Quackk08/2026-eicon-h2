import { placeRecommendationResultSchema, hasOnlyKnownPlaceIds, type PlaceRecommendationResult } from "@renew/shared";
import { env, isAIEnabled } from "../config/env.js";

interface RerankInput {
  templateTitle: string;
  ruleResult: PlaceRecommendationResult;
  candidates: Array<{ placeId: string; name: string; category: string; ruleScore: number }>;
}

/**
 * Same contract as geminiAdapter.ts: Gemini may only reorder/reword among
 * the rule engine's own approved place candidates, never invent or
 * prioritize a place because it's a partner. Any response that fails
 * schema or candidate-ID validation is discarded.
 */
export async function rerankPlaceWithGemini(input: RerankInput): Promise<PlaceRecommendationResult | null> {
  if (!isAIEnabled()) return null;

  const knownIds = new Set([
    input.ruleResult.selectedPlaceId,
    ...input.ruleResult.alternatePlaceIds,
    ...input.candidates.map((c) => c.placeId)
  ]);

  const raw = await callGemini(buildPrompt(input));
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = placeRecommendationResultSchema.safeParse(parsed);
  if (!result.success) return null;
  if (!hasOnlyKnownPlaceIds(result.data, knownIds)) return null;

  return result.data;
}

function buildPrompt(input: RerankInput): string {
  return `
You help word a place recommendation for ReNew, a lifestyle-architecture app. You are NOT diagnosing anything and must never invent a new place.

STRICT RULES:
1. selectedPlaceId and every id in alternatePlaceIds MUST be one of the CANDIDATE ids below.
2. Do not favor a place because it might be a paid partner — only fit and safety matter.
3. Only change the rule engine's pick if a listed candidate is clearly a better fit; never override for novelty.
4. summary and userFacingReason must be short, practical, non-clinical, in English.

CONTEXT:
- Action this place is for: ${input.templateTitle}
- Rule engine's own pick (default if you find no better fit): ${JSON.stringify(input.ruleResult)}
- Candidates (id, name, category, rule score 0-1): ${JSON.stringify(input.candidates)}

Respond with ONLY a JSON object matching exactly this shape:
{"contractVersion":1,"selectedPlaceId":"string","summary":"string","userFacingReason":"string","alternatePlaceIds":["string"],"warnings":[]}
`.trim();
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!env.geminiApiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.error("[gemini-place] request failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.error("[gemini-place] request threw", err);
    return null;
  }
}
