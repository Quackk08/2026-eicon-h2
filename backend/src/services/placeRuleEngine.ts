import type { Place, PlaceRecommendationResult } from "@renew/shared";
import { maxCostLevelFrom } from "./ruleEngine.js";

interface Constraints {
  maxMinutes: number;
  maxDistanceMeters: number;
  maxCost: number;
  socialPreference: "solo" | "low" | "medium" | "high";
  accessibilityNeeds: string[];
}

const SOCIAL_RANK: Record<string, number> = { none: 0, solo: 0, low: 1, medium: 2, high: 3 };

/**
 * distanceBucket is a coarse label, not a real distance — this is a
 * documented assumption (same pattern as maxCostLevelFrom) until place
 * data carries real coordinates and a distance API is wired up.
 */
const DISTANCE_BUCKET_METERS: Record<string, number> = { near: 500, medium: 2000, far: 10000 };

export function filterPlaces(places: Place[], placeTypes: string[], constraints: Constraints): Place[] {
  const maxSocial = SOCIAL_RANK[constraints.socialPreference] ?? 3;
  const maxCostLevel = maxCostLevelFrom(constraints.maxCost);

  return places.filter((place) => {
    if (!placeTypes.includes(place.category)) return false;
    if (place.costLevel !== null && place.costLevel > maxCostLevel) return false;
    if (place.socialLevel !== null && (SOCIAL_RANK[place.socialLevel] ?? 3) > maxSocial) return false;
    if (place.distanceBucket !== null) {
      const bucketMeters = DISTANCE_BUCKET_METERS[place.distanceBucket] ?? Infinity;
      if (bucketMeters > constraints.maxDistanceMeters) return false;
    }
    return true;
  });
}

function scorePlace(place: Place, constraints: Constraints, accessibilityNeeds: string[]): number {
  let score = 0.5;
  if (place.distanceBucket === "near") score += 0.2;
  if (place.crowdLevel === "low") score += 0.1;
  if (
    accessibilityNeeds.length > 0 &&
    place.accessibility &&
    accessibilityNeeds.some((need) => place.accessibility!.toLowerCase().includes(need.toLowerCase()))
  ) {
    score += 0.2;
  }
  // A Partner Place never gets a fit/safety boost from being a partner —
  // PRODUCT_GUARDRAILS.md: "A Partner Place benefit must never outweigh
  // user fit and safety."
  return score;
}

/**
 * Deterministic place pick: filter to places matching the mission's
 * placeTypes and the user's capacity/cost/social/distance constraints,
 * then score by fit. Must be able to run with Gemini disabled.
 */
export function buildRuleBasedPlaceRecommendation(
  allCandidates: Place[],
  placeTypes: string[],
  constraints: Constraints,
  templateTitle: string
): PlaceRecommendationResult {
  const filtered = filterPlaces(allCandidates, placeTypes, constraints);
  if (filtered.length === 0) {
    throw new Error("No reviewed place matches the current constraints");
  }

  const ranked = filtered
    .map((place) => ({ place, score: scorePlace(place, constraints, constraints.accessibilityNeeds) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0].place;
  const alternates = ranked.slice(1, 3).map((r) => r.place.id);

  return {
    contractVersion: 1,
    selectedPlaceId: best.id,
    summary: `"${templateTitle}"에 어울리는 장소로 ${best.name}을(를) 추천합니다.`,
    userFacingReason: "현재 조건(거리·비용·사회적 부담)에 맞는 검수된 장소 중에서 규칙 기반으로 선택했습니다.",
    alternatePlaceIds: alternates,
    warnings: []
  };
}
