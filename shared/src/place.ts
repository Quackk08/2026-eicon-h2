import { z } from "zod";
import { recommendationConstraintsSchema } from "./recommendation.js";

export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  addressRegion: z.string().nullable(),
  distanceBucket: z.enum(["near", "medium", "far"]).nullable(),
  hours: z.string().nullable(),
  costLevel: z.number().int().min(0).max(4).nullable(),
  crowdLevel: z.string().nullable(),
  socialLevel: z.string().nullable(),
  accessibility: z.string().nullable(),
  isPartner: z.boolean(),
  verifiedAt: z.string().nullable(),
  notes: z.string().nullable()
});

export const placeCandidateSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  ruleScore: z.number().min(0).max(1)
});

export const placeRecommendationRequestSchema = z.object({
  contractVersion: z.literal(1),
  templateTitle: z.string().min(1).max(200),
  placeTypes: z.array(z.string().min(1)).min(1),
  constraints: recommendationConstraintsSchema,
  candidates: z.array(placeCandidateSchema).min(1).max(20)
});

export const placeRecommendationResultSchema = z.object({
  contractVersion: z.literal(1),
  selectedPlaceId: z.string().min(1),
  summary: z.string().min(1).max(500),
  userFacingReason: z.string().min(1).max(500),
  alternatePlaceIds: z.array(z.string().min(1)).max(5),
  warnings: z.array(z.string().max(200))
});

export type Place = z.infer<typeof placeSchema>;
export type PlaceCandidate = z.infer<typeof placeCandidateSchema>;
export type PlaceRecommendationRequest = z.infer<typeof placeRecommendationRequestSchema>;
export type PlaceRecommendationResult = z.infer<typeof placeRecommendationResultSchema>;

/**
 * Same safety pattern as hasOnlyKnownTemplateIds — a Partner Place must
 * never be selected just because it's a partner (PRODUCT_GUARDRAILS.md:
 * "A Partner Place benefit must never outweigh user fit and safety"), and
 * AI can only choose among places the rule engine already approved.
 */
export function hasOnlyKnownPlaceIds(result: PlaceRecommendationResult, candidateIds: ReadonlySet<string>): boolean {
  return [result.selectedPlaceId, ...result.alternatePlaceIds].every((id) => candidateIds.has(id));
}
