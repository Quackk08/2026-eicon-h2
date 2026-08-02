import { z } from "zod";
import { LIFE_DOMAINS, STATE_TAGS } from "./constants.js";

export const lifeDomainSchema = z.enum(LIFE_DOMAINS);
export const stateTagSchema = z.enum(STATE_TAGS);
export const socialPreferenceSchema = z.enum(["solo", "low", "medium", "high"]);

export const actionTemplateSchema = z.object({
  id: z.string().min(1),
  goalDomains: z.array(lifeDomainSchema).min(1),
  title: z.string().min(1).max(200),
  minCapacity: z.number().int().min(0).max(4),
  maxSocialLoad: z.number().int().min(0).max(4),
  durationRange: z.tuple([
    z.number().int().nonnegative(),
    z.number().int().positive()
  ]),
  costLevel: z.number().int().min(0).max(4),
  placeTypes: z.array(z.string().min(1)),
  indoorOutdoor: z.enum(["indoor", "outdoor", "either"]),
  ladderGroupId: z.string().min(1),
  ladderLevel: z.number().int().positive(),
  safetyTags: z.array(z.string().min(1))
});

export const recommendationConstraintsSchema = z.object({
  maxMinutes: z.number().int().positive(),
  maxDistanceMeters: z.number().int().nonnegative(),
  maxCost: z.number().nonnegative(),
  socialPreference: socialPreferenceSchema,
  accessibilityNeeds: z.array(z.string().min(1)).default([])
});

export const recommendationCandidateSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1).max(200),
  ruleScore: z.number().min(0).max(1)
});

export const recommendationRequestSchema = z.object({
  contractVersion: z.literal(1),
  locale: z.string().min(2),
  lifeVision: z.object({
    domain: lifeDomainSchema,
    summary: z.string().min(1).max(500)
  }),
  stateTags: z.array(stateTagSchema),
  constraints: recommendationConstraintsSchema,
  candidates: z.array(recommendationCandidateSchema).min(1).max(20)
});

export const recommendationResultSchema = z.object({
  contractVersion: z.literal(1),
  selectedTemplateId: z.string().min(1),
  summary: z.string().min(1).max(500),
  userFacingReason: z.string().min(1).max(500),
  smallerOptionTemplateId: z.string().min(1).nullable(),
  extensionOptionTemplateId: z.string().min(1).nullable(),
  warnings: z.array(z.string().max(200))
});

export type ActionTemplate = z.infer<typeof actionTemplateSchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type RecommendationResult = z.infer<typeof recommendationResultSchema>;

export function hasOnlyKnownTemplateIds(
  result: RecommendationResult,
  candidateIds: ReadonlySet<string>
): boolean {
  const selectedIds = [
    result.selectedTemplateId,
    result.smallerOptionTemplateId,
    result.extensionOptionTemplateId
  ].filter((id): id is string => id !== null);

  return selectedIds.every((id) => candidateIds.has(id));
}
