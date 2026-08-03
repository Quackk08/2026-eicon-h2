import { recommendationResultSchema, hasOnlyKnownTemplateIds, type RecommendationResult } from "@renew/shared";
import { env, isAIEnabled } from "../config/env.js";
import type { StateTag } from "../types.js";

interface RerankInput {
  visionSummary: string;
  stateTags: StateTag[];
  ruleResult: RecommendationResult;
  candidates: Array<{ templateId: string; title: string; ruleScore: number }>;
}

/**
 * Gemini may only reorder/reword within the rule engine's own candidate
 * set and its already-chosen smaller/extension options — it can never
 * introduce a template ID the rule engine didn't already approve. Any
 * response that fails schema or candidate-ID validation is discarded and
 * the caller keeps the original rule-based result, per
 * docs/IMPLEMENTATION_PLAN.md section 7 and PRODUCT_GUARDRAILS.md.
 */
export async function rerankWithGemini(input: RerankInput): Promise<RecommendationResult | null> {
  if (!isAIEnabled()) return null;

  const knownIds = new Set([
    input.ruleResult.selectedTemplateId,
    ...(input.ruleResult.smallerOptionTemplateId ? [input.ruleResult.smallerOptionTemplateId] : []),
    ...(input.ruleResult.extensionOptionTemplateId ? [input.ruleResult.extensionOptionTemplateId] : []),
    ...input.candidates.map((c) => c.templateId)
  ]);

  const prompt = buildPrompt(input);
  const raw = await callGemini(prompt);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = recommendationResultSchema.safeParse(parsed);
  if (!result.success) return null;
  if (!hasOnlyKnownTemplateIds(result.data, knownIds)) return null;

  return result.data;
}

function buildPrompt(input: RerankInput): string {
  return `
You help word a daily-action recommendation for ReNew, a lifestyle-architecture app. You are NOT diagnosing anything and must never invent a new action.

STRICT RULES:
1. selectedTemplateId, smallerOptionTemplateId, and extensionOptionTemplateId MUST each be either null or one of the CANDIDATE ids below.
2. Do not change which template is selected unless a listed candidate is a clearly better fit for the given state tags — never override for novelty.
3. summary and userFacingReason must be short, practical, non-clinical, in English.
4. Never mention diagnosis, risk probability, or medical/therapeutic framing.

CONTEXT:
- Life vision: ${input.visionSummary}
- Current state tags: ${input.stateTags.join(", ")}
- Rule engine's own pick (default if you find no better fit): ${JSON.stringify(input.ruleResult)}
- Candidates (id, title, rule score 0-1): ${JSON.stringify(input.candidates)}

Respond with ONLY a JSON object matching exactly this shape:
{"contractVersion":1,"selectedTemplateId":"string","summary":"string","userFacingReason":"string","smallerOptionTemplateId":"string|null","extensionOptionTemplateId":"string|null","warnings":[]}
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
      console.error("[gemini] request failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.error("[gemini] request threw", err);
    return null;
  }
}
