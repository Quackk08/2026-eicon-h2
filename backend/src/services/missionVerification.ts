import { z } from "zod";
import { env, isAIEnabled } from "../config/env.js";

export interface VerifyEvidenceInput {
  missionTitle: string;
  missionDescription: string | null;
  placeType: string | null;
  startedAt: string | null;
  imageBase64: string;
  mimeType: string;
}

/**
 * What the model is allowed to say about a photo. Anything outside this
 * shape is discarded and treated as "could not analyze" — the client then
 * falls back to completing without verification, never to a blocked state.
 */
const verdictSchema = z.object({
  verdict: z.enum(["verified", "unclear", "mismatch"]),
  evidenceType: z.enum(["receipt", "scene", "other"]),
  confidence: z.number().min(0).max(1),
  extracted: z
    .object({
      merchant: z.string().max(120).nullish(),
      amount: z.string().max(40).nullish(),
      paidAt: z.string().max(60).nullish(),
      items: z.array(z.string().max(80)).max(10).nullish()
    })
    .nullish(),
  reason: z.string().max(300)
});

export type EvidenceVerdict = z.infer<typeof verdictSchema>;

/**
 * Reads one photo against one mission and answers whether it plausibly
 * shows the mission happening. Verification here is a recording aid, not a
 * gate (docs/PRODUCT_GUARDRAILS.md) — the prompt asks the model to lean
 * generous, and the caller must always leave "complete anyway" open.
 *
 * The image is analyzed in memory and never persisted.
 */
export async function verifyMissionEvidence(
  input: VerifyEvidenceInput
): Promise<EvidenceVerdict | null> {
  if (!isAIEnabled()) return null;

  const prompt = `
You verify a photo for ReNew, a lifestyle-architecture app. A person did (or attempted) this small daily mission and took one photo as a personal record. Decide whether the photo plausibly relates to the mission.

MISSION:
- Title: ${input.missionTitle}
- Description: ${input.missionDescription ?? "(none)"}
- Expected setting: ${input.placeType ?? "(flexible)"}
- Started at: ${input.startedAt ?? "(unknown)"}

RULES:
1. This is a personal record, not fraud detection. Lean generous: "verified" when the photo plausibly relates to the mission (a receipt from a matching kind of place, the scene itself, materials being used). Use "unclear" when you cannot tell, "mismatch" only when the photo clearly shows something unrelated.
2. If the photo is a receipt or payment screen, extract merchant, total amount (with currency symbol as printed), and payment time when readable. Otherwise leave extracted fields null.
3. reason: one short, warm, non-judgmental sentence the person will read. Never scold, never mention fraud or proof.
4. Never include personal data beyond merchant/amount/time in the output.

Respond with ONLY a JSON object of exactly this shape:
{"verdict":"verified|unclear|mismatch","evidenceType":"receipt|scene|other","confidence":0.0,"extracted":{"merchant":null,"amount":null,"paidAt":null,"items":null},"reason":"string"}
`.trim();

  const raw = await callGeminiWithImage(prompt, input.imageBase64, input.mimeType);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[gemini:verify] response was not JSON", raw.slice(0, 200));
    return null;
  }

  const result = verdictSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[gemini:verify] response failed schema", raw.slice(0, 200));
    return null;
  }
  return result.data;
}

async function callGeminiWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string | null> {
  if (!env.geminiApiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;

  // One retry on transient unavailability (Gemini answers 503 under load
  // spikes); anything else fails straight through to the client's fallback.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } }
              ]
            }
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        }),
        // Vision calls carry more payload than the rerank; give them longer.
        signal: AbortSignal.timeout(25000)
      });
      if (res.status === 503 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      if (!res.ok) {
        console.error("[gemini:verify] request failed", res.status, await res.text().catch(() => ""));
        return null;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === "string" ? text : null;
    } catch (err) {
      console.error("[gemini:verify] request threw", err);
      return null;
    }
  }
  return null;
}
