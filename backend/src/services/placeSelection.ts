import type { ActionTemplate, Place, PlaceRecommendationResult } from "@renew/shared";
import { getPreferences } from "../repositories/preferences.js";
import { listPlacesByCategories } from "../repositories/places.js";
import { buildRuleBasedPlaceRecommendation } from "./placeRuleEngine.js";
import { rerankPlaceWithGemini } from "./geminiPlaceAdapter.js";

export interface PlaceSelection {
  result: PlaceRecommendationResult;
  source: "rules" | "ai";
  candidates: Place[];
}

/**
 * Picks a reviewed place for an action: the rule engine filters by the
 * user's distance/cost/social constraints, then Gemini may reorder within
 * that already-approved set. Shared by GET /places/search and by mission
 * selection so both answer the same way.
 *
 * Returns null when the action needs no place (a home or online step) or
 * when nothing reviewed fits — never a guessed location.
 */
export async function selectPlaceForTemplate(
  profileId: string,
  template: ActionTemplate
): Promise<PlaceSelection | null> {
  const placeTypes = template.placeTypes.filter((type) => type !== "home" && type !== "online");
  if (placeTypes.length === 0) return null;

  const [preferences, candidates] = await Promise.all([
    getPreferences(profileId),
    listPlacesByCategories(placeTypes)
  ]);
  if (candidates.length === 0) return null;

  const constraints = {
    maxMinutes: preferences?.max_minutes ?? 30,
    maxDistanceMeters: preferences?.max_distance_meters ?? 2000,
    maxCost: preferences?.max_cost ?? 0,
    socialPreference: preferences?.social_preference ?? ("low" as const),
    accessibilityNeeds: preferences?.accessibility_needs ?? []
  };

  let result: PlaceRecommendationResult;
  try {
    result = buildRuleBasedPlaceRecommendation(candidates, placeTypes, constraints, template.title);
  } catch {
    // No reviewed place satisfies the constraints — say so rather than
    // relaxing them silently.
    return null;
  }

  let source: "rules" | "ai" = "rules";
  const aiResult = await rerankPlaceWithGemini({
    templateTitle: template.title,
    ruleResult: result,
    candidates: candidates.map((c) => ({
      placeId: c.id,
      name: c.name,
      category: c.category,
      ruleScore: 1
    }))
  });
  if (aiResult) {
    result = aiResult;
    source = "ai";
  }

  return { result, source, candidates };
}
