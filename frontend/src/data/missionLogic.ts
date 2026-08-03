import type { AppData, CheckInRecord, Mission, Place, RecommendationOption, Reflection } from "./appData";

function placeFitsBudget(cost: string, budget: AppData["preferences"]["budget"]): boolean {
  if (budget === "Flexible") return true;
  if (budget === "Low cost") return cost === "Free" || cost === "Low cost";
  return cost === "Free";
}

export function getLatestCheckIn(data: AppData): CheckInRecord | null {
  return [...data.checkIns].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0] ?? null;
}

export function getMissionPlace(
  data: AppData,
  mission: Pick<Mission, "placeId"> | Pick<RecommendationOption, "placeId">
): Place | null {
  return mission.placeId ? data.places.find((place) => place.id === mission.placeId) ?? null : null;
}

export function getEligibleMissionOptions(data: AppData): RecommendationOption[] {
  const latestCheckIn = getLatestCheckIn(data);
  const needsLowestSocialLoad =
    data.preferences.socialPreference === "Solo" || (latestCheckIn?.socialLoad ?? 0) >= 4;

  return data.recommendations.filter((option) => {
    if (option.visionId !== data.vision.id) return false;
    if (option.durationMinutes > data.preferences.availableMinutes) return false;
    if (needsLowestSocialLoad && option.socialMode !== "Solo") return false;

    const place = getMissionPlace(data, option);
    if (!place) return true;
    if (place.distanceKm > data.preferences.maxDistanceKm) return false;
    if (!placeFitsBudget(place.cost, data.preferences.budget)) return false;
    return data.preferences.accessibilityNeeds.every((need) => place.accessibility.includes(need));
  });
}

/**
 * Null until the backend has supplied this Vision's reviewed steps — there
 * is nothing local to fall back on, and inventing one would show an action
 * ReNew never actually recommended.
 */
export function getRecommendedMissionOption(data: AppData): RecommendationOption | null {
  const eligible = getEligibleMissionOptions(data);
  const options = eligible.length > 0 ? eligible : data.recommendations;
  if (options.length === 0) return null;
  const latestCheckIn = getLatestCheckIn(data);
  const latestReflection = [...data.reflections].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];
  const needsLighterAction =
    (latestCheckIn !== null && latestCheckIn.energy <= 2 && latestCheckIn.capacity <= 2) ||
    latestReflection?.outcome === "not_today";
  const needsAdjustedAction = latestReflection?.outcome === "partly";
  const preferredVariants = needsLighterAction
    ? ["lighter", "different", "recommended"]
    : needsAdjustedAction
      ? ["lighter", "recommended", "different"]
      : ["recommended", "different", "more"];

  for (const variant of preferredVariants) {
    const match = options.find((option) => option.variant === variant);
    if (match) return match;
  }

  return options[0];
}

export function getRecommendationReasons(data: AppData, option: RecommendationOption): string[] {
  const reasons: string[] = [];
  const place = getMissionPlace(data, option);
  const routeStep = option.routeStepId
    ? data.route.find((step) => step.id === option.routeStepId)
    : null;

  if (option.durationMinutes <= data.preferences.availableMinutes) {
    reasons.push(`Fits your ${data.preferences.availableMinutes}-minute window`);
  }

  if (place && place.distanceKm <= data.preferences.maxDistanceKm) {
    reasons.push(`${place.distanceKm} km away and within your travel limit`);
  } else if (option.format === "At home") {
    reasons.push("Can be completed at home");
  } else if (option.format === "Online") {
    reasons.push("Can be joined online without travel");
  }

  if (place && placeFitsBudget(place.cost, data.preferences.budget)) {
    reasons.push(`${place.cost} and within your budget preference`);
  }

  if (option.socialMode === "Solo") {
    reasons.push("Possible to complete alone");
  } else if (option.socialMode === "Alongside others") {
    reasons.push("Shared focus with conversation optional");
  }

  if (routeStep) {
    reasons.push(`Connected to Route step ${routeStep.level}`);
  }

  return reasons.slice(0, 4);
}

export function getLatestResult(data: AppData): { reflection: Reflection; mission: Mission | null } | null {
  const reflection = [...data.reflections].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];

  if (!reflection) return null;

  return {
    reflection,
    mission: data.missionHistory.find((mission) => mission.id === reflection.missionId) ?? null
  };
}

export function describeResultAdjustment(result: ReturnType<typeof getLatestResult>): string {
  if (!result) {
    return "Complete a Mission and add a short reflection. ReNew will use that record to adjust what appears here next.";
  }

  if (result.reflection.outcome === "not_today") {
    return "A lighter or at-home version is prioritized today because the previous Mission was left for another day.";
  }

  if (result.reflection.outcome === "partly") {
    return "A shorter version is prioritized today because completing part of the previous Mission was the useful stopping point.";
  }

  if (result.reflection.effort <= 3) {
    return "The previous Mission was completed with manageable effort, so a slightly larger option remains available.";
  }

  return "The previous Mission was completed with higher effort, so today's main option stays close in size.";
}

