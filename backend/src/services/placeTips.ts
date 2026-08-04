import { isSafePlaceTip, placeTipSchema, type PlaceTip } from "@renew/shared";
import { env, isAIEnabled } from "../config/env.js";

interface TipInput {
  actionTitle: string;
  placeName: string;
  placeCategory: string;
  maxCostLevel: number;
}

/**
 * One concrete thing to do on arrival: what to order at a cafe, which shelf
 * to head for at a library, where to sit.
 *
 * The input is the action and the setting — never the Check-In. Recommending
 * what someone consumes on the basis of their mood or stress reading is
 * health advice, which this product states it does not give, and caffeine in
 * particular interacts with the sleep and anxiety this app already asks
 * about. Keeping state out of the prompt is what makes the feature safe to
 * ship at all.
 *
 * Returns null on any failure; the place recommendation stands without it.
 */
export async function suggestPlaceTip(input: TipInput): Promise<PlaceTip | null> {
  if (!isAIEnabled()) return null;

  const raw = await callGemini(buildPrompt(input));
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = placeTipSchema.safeParse(parsed);
  if (!result.success) return null;
  if (!isSafePlaceTip(result.data.tip)) return null;

  return result.data;
}

function buildPrompt(input: TipInput): string {
  return `
You write one short, practical suggestion for someone arriving somewhere to do a specific thing. This is a lifestyle app, not a health product.

WHERE THEY ARE GOING: ${input.placeName} (${input.placeCategory})
WHAT THEY ARE THERE TO DO: "${input.actionTitle}"
BUDGET: cost level ${input.maxCostLevel} or lower, on a 0-4 scale where 0 means free.

WRITE ONE TIP:
- A cafe: something to order that suits sitting a while, within the budget.
- A library or study room: a shelf, section, or kind of book that suits the action.
- A park or trail: a spot, a bench, a route.
- Anything else: a practical arrival tip.

RULES — these decide whether the tip can be shown at all:
1. Describe the thing itself. Never claim an effect on the person: not "this will calm you", not "good for focus", not "helps with stress".
2. You know nothing about this person's mood, energy, sleep, or health. Never refer to how they feel or imply you know.
3. No alcohol, no supplements, no medication, no diet or fasting advice.
4. Keep it to one sentence, plain English, concrete.
5. kind must be "order" for something to buy, "browse" for reading material, "seat" for where to settle, "general" otherwise.

Respond with ONLY a JSON object in exactly this shape:
{"contractVersion":1,"kind":"order","tip":"string"}
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
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.error("[gemini-tip] request failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.error("[gemini-tip] request threw", err);
    return null;
  }
}
