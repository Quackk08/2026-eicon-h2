import {
  countLabel,
  describeStateTags,
  type ActionTemplate,
  type ReasoningStep,
  type RecommendationResult,
  type StateVector
} from "@renew/shared";
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
 *
 * The trace is a by-product of the decisions this function was already
 * making, not a second pass that re-derives them. It exists so the app can
 * show its working, and it would be worse than useless if it described a
 * process other than the one that ran — so it is built inline, from the
 * same variables.
 */
export function buildRuleBasedRecommendation(
  allCandidatesInDomain: ActionTemplate[],
  functionalCapacity: number,
  tags: StateTag[],
  constraints: Constraints,
  visionSummary: string
): { result: RecommendationResult; trace: ReasoningStep[] } {
  const trace: ReasoningStep[] = [];

  trace.push({
    key: "state",
    label: "Read your Check-In",
    detail: `Today ${describeStateTags(tags)}.`
  });

  trace.push({
    key: "limits",
    label: "Applied your limits",
    detail:
      `Up to ${constraints.maxMinutes} minutes, ` +
      `${constraints.maxCost > 0 ? "within your cost limit" : "free only"}, ` +
      `${constraints.socialPreference === "solo" ? "on your own" : `social effort no higher than ${constraints.socialPreference}`}` +
      `${constraints.accessibilityNeeds.length > 0 ? `, and ${countLabel(constraints.accessibilityNeeds.length, "access need")}` : ""}.`
  });

  let filtered = filterCandidates(allCandidatesInDomain, functionalCapacity, tags, constraints);
  let usedFallback = false;

  trace.push({
    key: "filter",
    label: "Kept what was possible",
    detail:
      filtered.length > 0
        ? `${countLabel(filtered.length, "step")} of your Route fit those limits today.`
        : "No step fit every limit today, so the smallest one you can manage was used instead.",
    before: allCandidatesInDomain.length,
    after: filtered.length
  });

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

  trace.push({
    key: "score",
    label: "Picked today's size",
    // The weights are the ones scoreCandidate actually uses. Quoting them
    // is the difference between explaining a decision and asserting one.
    detail: `"${best.title}" scored highest on fitting today's capacity (70%) and your time (30%).`,
    before: filtered.length,
    after: 1
  });

  const ladderSiblings = allCandidatesInDomain.filter((t) => t.ladderGroupId === best.ladderGroupId);
  const smaller = ladderSiblings
    .filter((t) => t.ladderLevel < best.ladderLevel)
    .sort((a, b) => b.ladderLevel - a.ladderLevel)[0];
  const bigger = ladderSiblings
    .filter((t) => t.ladderLevel > best.ladderLevel && t.minCapacity <= functionalCapacity)
    .sort((a, b) => a.ladderLevel - b.ladderLevel)[0];

  trace.push({
    key: "ladder",
    label: "Kept a way out either side",
    detail:
      smaller && bigger
        ? "A smaller and a larger version of the same step are held ready, in case today turns out different."
        : smaller
          ? "A smaller version of the same step is held ready, in case today turns out harder."
          : bigger
            ? "A larger version is held ready — this is already the smallest step on this ladder."
            : "This ladder has one step, so there is no smaller or larger version to offer."
  });

  return {
    result: {
      contractVersion: 1,
      selectedTemplateId: best.id,
      summary: `Toward "${visionSummary}", today's realistic size is "${best.title}".`,
      userFacingReason:
        "Chosen from your reviewed steps to fit today's capacity, time, cost, and social preference.",
      smallerOptionTemplateId: smaller?.id ?? null,
      extensionOptionTemplateId: bigger?.id ?? null,
      warnings: usedFallback ? ["no_exact_match_used_capacity_fallback"] : []
    },
    trace
  };
}
