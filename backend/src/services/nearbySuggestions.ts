import {
  isSafeNearbySuggestion,
  nearbySuggestionSchema,
  type CoarseLocation,
  type SuggestedNearbyPlace
} from "@renew/shared";
import { env, isAIEnabled } from "../config/env.js";

interface NearbyInput {
  location: CoarseLocation;
  /** The action the setting has to support, e.g. "Read a chapter quietly". */
  actionTitle: string;
  /** Reviewed categories the action calls for, e.g. ["library", "cafe"]. */
  placeTypes: string[];
  maxWalkMinutes: number;
  maxCostLevel: number;
}

/**
 * Asks the model for public venues near a coarse location that would suit
 * an action.
 *
 * These are NOT reviewed places. Everything here reaches a user without a
 * human having checked that it exists, is open, or is accessible, so the
 * caller must present it as a suggestion and keep reviewed places first —
 * the same bargain the generated Activity Ladder makes.
 *
 * Returns null rather than a guess whenever the model is unavailable or the
 * response fails a gate, so the reviewed list stands on its own.
 */
export async function suggestNearbyPlaces(
  input: NearbyInput
): Promise<SuggestedNearbyPlace[] | null> {
  if (!isAIEnabled()) return null;

  const raw = await callGemini(buildPrompt(input));
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = nearbySuggestionSchema.safeParse(parsed);
  if (!result.success) return null;

  // One unsafe entry discards the batch rather than being filtered out
  // quietly: a response that produced it is not one to trust the rest of.
  if (!result.data.places.every(isSafeNearbySuggestion)) return null;

  // A walk longer than the person said they had is not a near place.
  const withinReach = result.data.places.filter(
    (place) => place.approxWalkMinutes <= input.maxWalkMinutes
  );
  return withinReach.length > 0 ? withinReach : null;
}

function buildPrompt(input: NearbyInput): string {
  return `
You suggest ordinary public places near someone, for ReNew, a lifestyle-architecture app. You are not a medical product and must never comment on the person's health, mood, or state.

WHERE THEY ARE (deliberately rounded to about one kilometre — do not try to be more precise than this):
latitude ${input.location.latitude}, longitude ${input.location.longitude}

WHAT THEY WANT TO DO:
"${input.actionTitle}"

RULES:
1. Suggest only ordinary public places of these kinds: ${input.placeTypes.join(", ")}.
2. Suggest real, well-known, publicly accessible venues you are confident exist in that area. If you are not confident, return fewer — never pad the list with invented names.
3. Everything must be reachable on foot in ${input.maxWalkMinutes} minutes or less.
4. Cost level must be ${input.maxCostLevel} or lower on a 0-4 scale, where 0 means free to enter.
5. whyItSuitsTheAction describes the PLACE and the ACTION only — quiet, seating, opening hours, how busy it gets. Never mention the person's feelings, energy, stress, or health.
6. No bars, clubs, liquor stores, pharmacies, clinics, or hospitals.
7. Plain English, no marketing language.

Respond with ONLY a JSON object in exactly this shape:
{"contractVersion":1,"places":[{"name":"string","category":"string","whyItSuitsTheAction":"string","approxWalkMinutes":10}]}
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
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.error("[gemini-nearby] request failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.error("[gemini-nearby] request threw", err);
    return null;
  }
}
