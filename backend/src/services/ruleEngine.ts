import type { ActionTemplate, RecommendationResult, StateVector } from "@renew/shared";
import type { StateTag } from "../types.js";

interface Constraints {
  maxMinutes: number;
  maxDistanceMeters: number;
  maxCost: number;
  socialPreference: "solo" | "low" | "medium" | "high";
  accessibilityNeeds: string[];
}

const SOCIAL_RANK: Record<string, number> = { solo: 0, low: 1, medium: 2, high: 3 };

/**
 * Derives state tags from a single check-in's StateVector. Tags that need
 * multi-day history ("reduced_outing", "reduced_activity", "support_suggested")
 * belong to a separate temporal-pattern pass, not this per-check-in step.
 */
export function computeStateTags(state: StateVector): StateTag[] {
  const tags: StateTag[] = [];
  if (state.energy !== null && state.energy <= 1) tags.push("low_energy");
  if (state.initiationDifficulty !== null && state.initiationDifficulty >= 3) tags.push("high_initiation_difficulty");
  if (state.socialLoad !== null && state.socialLoad >= 3) tags.push("high_social_load");
  if (state.sleepQuality !== null && state.sleepQuality <= 1) tags.push("sleep_disrupted");
  if (state.loneliness !== null && state.loneliness >= 3) tags.push("connection_needed");
  if (tags.length === 0) tags.push("stable");
  return tags;
}

/**
 * ActionTemplate.costLevel is an ordinal 0-4 scale, but the recommendation
 * constraint carries a raw currency amount (see shared/src/recommendation.ts).
 * This bucketing is the assumed mapping between the two until a real
 * pricing model is defined — documented here rather than silently guessed.
 */
export function maxCostLevelFrom(maxCost: number): number {
  if (maxCost <= 0) return 0;
  if (maxCost < 5000) return 1;
  if (maxCost < 20000) return 2;
  if (maxCost < 50000) return 3;
  return 4;
}

export function filterCandidates(
  templates: ActionTemplate[],
  functionalCapacity: number,
  tags: StateTag[],
  constraints: Constraints
): ActionTemplate[] {
  const maxSocial = SOCIAL_RANK[constraints.socialPreference] ?? 3;
  const maxCostLevel = maxCostLevelFrom(constraints.maxCost);
  const socialCeiling = tags.includes("high_social_load") ? Math.min(maxSocial, 1) : maxSocial;

  return templates.filter((template) => {
    if (template.minCapacity > functionalCapacity) return false;
    if (template.maxSocialLoad > socialCeiling) return false;
    if (template.costLevel > maxCostLevel) return false;
    if (template.durationRange[0] > constraints.maxMinutes) return false;
    return true;
  });
}

function scoreCandidate(template: ActionTemplate, functionalCapacity: number, constraints: Constraints): number {
  const capacityFit = 1 - Math.abs(functionalCapacity - template.minCapacity) / 4;
  const timeFit = template.durationRange[1] <= constraints.maxMinutes ? 1 : 0.5;
  return capacityFit * 0.7 + timeFit * 0.3;
}

/**
 * Deterministic recommendation: filter to safe/feasible candidates, score
 * by how well they fit today's capacity and time budget, then attach a
 * smaller/bigger option from the same Activity Ladder group. This alone
 * must be able to run the whole daily loop with Gemini disabled.
 */
export function buildRuleBasedRecommendation(
  allCandidatesInDomain: ActionTemplate[],
  functionalCapacity: number,
  tags: StateTag[],
  constraints: Constraints,
  visionSummary: string
): RecommendationResult {
  let filtered = filterCandidates(allCandidatesInDomain, functionalCapacity, tags, constraints);
  let usedFallback = false;

  if (filtered.length === 0) {
    // Fall back to the single easiest (lowest ladder level) template per
    // group that still respects the hard capacity ceiling, so the loop
    // never dead-ends even under tight constraints.
    usedFallback = true;
    filtered = allCandidatesInDomain
      .filter((t) => t.minCapacity <= functionalCapacity)
      .sort((a, b) => a.ladderLevel - b.ladderLevel)
      .slice(0, 1);
  }

  if (filtered.length === 0) {
    throw new Error("No action template fits the user's current capacity");
  }

  const best = filtered
    .map((template) => ({ template, score: scoreCandidate(template, functionalCapacity, constraints) }))
    .sort((a, b) => b.score - a.score)[0].template;

  const ladderSiblings = allCandidatesInDomain.filter((t) => t.ladderGroupId === best.ladderGroupId);
  const smaller = ladderSiblings
    .filter((t) => t.ladderLevel < best.ladderLevel)
    .sort((a, b) => b.ladderLevel - a.ladderLevel)[0];
  const bigger = ladderSiblings
    .filter((t) => t.ladderLevel > best.ladderLevel && t.minCapacity <= functionalCapacity)
    .sort((a, b) => a.ladderLevel - b.ladderLevel)[0];

  return {
    contractVersion: 1,
    selectedTemplateId: best.id,
    summary: `${visionSummary} 방향에 맞춰 오늘은 "${best.title}" 정도가 현실적입니다.`,
    userFacingReason: "현재 상태와 시간·비용·사회적 부담 조건에 맞춰 규칙 기반으로 선택했습니다.",
    smallerOptionTemplateId: smaller?.id ?? null,
    extensionOptionTemplateId: bigger?.id ?? null,
    warnings: usedFallback ? ["no_exact_match_used_capacity_fallback"] : []
  };
}
