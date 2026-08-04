import { z } from "zod";
import { containsBlockedWording } from "./ladder.js";

/**
 * Location is rounded before it leaves the device — roughly a 1km cell.
 * PRODUCT_GUARDRAILS.md requires keeping exact location "only as long and
 * as precisely as the selected feature requires", and finding somewhere to
 * sit and read does not require knowing which building someone is in.
 */
export const COORDINATE_PRECISION = 2;

export function coarsenCoordinate(value: number): number {
  const factor = 10 ** COORDINATE_PRECISION;
  return Math.round(value * factor) / factor;
}

export const coarseLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

/**
 * A venue the model believes exists near the user. Unlike a reviewed Place
 * this has had no human check, so it never carries an address or a claim
 * about hours — only enough to recognise it on the way.
 */
export const suggestedNearbyPlaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  /** Why this setting suits the action — never why it suits the person. */
  whyItSuitsTheAction: z.string().trim().min(10).max(200),
  approxWalkMinutes: z.number().int().min(1).max(60)
});

export const nearbySuggestionSchema = z.object({
  contractVersion: z.literal(1),
  places: z.array(suggestedNearbyPlaceSchema).min(1).max(4)
});

/**
 * A small, concrete thing to do once you are there: what to order, what
 * shelf to browse, where to sit.
 *
 * Deliberately derived from the action and the setting, never from
 * Check-In values. Tying what someone consumes to their mood or stress
 * reading would be health advice from a product that states it is not a
 * clinical one (PRODUCT_GUARDRAILS.md, "AI Rules").
 */
export const placeTipSchema = z.object({
  contractVersion: z.literal(1),
  kind: z.enum(["order", "browse", "seat", "general"]),
  tip: z.string().trim().min(10).max(200)
});

export type CoarseLocation = z.infer<typeof coarseLocationSchema>;
export type SuggestedNearbyPlace = z.infer<typeof suggestedNearbyPlaceSchema>;
export type NearbySuggestion = z.infer<typeof nearbySuggestionSchema>;
export type PlaceTip = z.infer<typeof placeTipSchema>;

/** Wording that makes a suggestion a health claim rather than a suggestion. */
const HEALTH_CLAIM_PATTERNS: RegExp[] = [
  /\b(will|helps?|good for|beneficial|boosts?|reduces?|relieves?|improves?|cures?|treats?)\b[^.]{0,40}\b(anxiety|depress|stress|mood|energy levels?|focus|sleep|insomnia|panic)\b/i,
  /\b(because|since|as) you (are|seem|feel|reported|scored)\b/i,
  /\byour (mood|stress|energy|sleep|check-?in|state)\b/i,
  /\b(calm(s|ing)? you|energi[sz]es? you|will help you feel)\b/i
];

/**
 * A tip must describe the thing, not prescribe an effect on the person.
 * "A warm drink and a corner seat" is fine; "chamomile will calm your
 * anxiety" is not, and neither is anything that reads back the user's own
 * Check-In at them.
 */
export function isSafePlaceTip(tip: string): boolean {
  if (containsBlockedWording(tip)) return false;
  return !HEALTH_CLAIM_PATTERNS.some((pattern) => pattern.test(tip));
}

export function isSafeNearbySuggestion(place: SuggestedNearbyPlace): boolean {
  return !containsBlockedWording(`${place.name} ${place.category} ${place.whyItSuitsTheAction}`);
}
