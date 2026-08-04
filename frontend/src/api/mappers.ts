import type {
  CheckInRecord,
  CommunityActivity,
  EffortLevel,
  LifeDomain,
  Mission,
  MissionFormat,
  MissionSocialMode,
  MissionVariant,
  Place,
  RecommendationOption,
  Reflection,
  RouteStep,
  UserPreferences
} from "../data/appData";
import type {
  ApiActionTemplate,
  ApiCheckIn,
  ApiCommunityActivity,
  ApiLifeDomain,
  ApiMissionStatus,
  ApiMission,
  ApiPlace,
  ApiPreferences,
  ApiReflection,
  ApiRouteStep
} from "./types";

/* ── Life domain ───────────────────────────────────────────────────── */

const DOMAIN_TO_API: Record<LifeDomain, ApiLifeDomain> = {
  "Study & focus": "study_school",
  "Sleep & energy": "sleep_energy",
  Relationships: "relationships",
  "Movement & health": "movement_health",
  Creativity: "creativity",
  "Daily independence": "daily_independence",
  Community: "community_participation",
  "Stress recovery": "stress_recovery"
};

const API_TO_DOMAIN = Object.fromEntries(
  Object.entries(DOMAIN_TO_API).map(([ui, api]) => [api, ui])
) as Record<ApiLifeDomain, LifeDomain>;

export function toApiDomain(domain: LifeDomain): ApiLifeDomain {
  return DOMAIN_TO_API[domain];
}

export function fromApiDomain(domain: ApiLifeDomain): LifeDomain {
  return API_TO_DOMAIN[domain] ?? "Study & focus";
}

/* ── Scores ────────────────────────────────────────────────────────── */

/** UI uses a 1-5 scale; the shared check-in contract uses 0-4. */
export function toApiScore(level: EffortLevel): number {
  return level - 1;
}

export function fromApiScore(score: number | null): EffortLevel | undefined {
  if (score === null) return undefined;
  const level = Math.min(5, Math.max(1, score + 1));
  return level as EffortLevel;
}

/* ── Preferences ───────────────────────────────────────────────────── */

const SOCIAL_TO_API: Record<UserPreferences["socialPreference"], "solo" | "low" | "high"> = {
  Solo: "solo",
  "Low pressure": "low",
  Together: "high"
};

const API_TO_SOCIAL: Record<string, UserPreferences["socialPreference"]> = {
  solo: "Solo",
  low: "Low pressure",
  medium: "Low pressure",
  high: "Together"
};

/**
 * The shared recommendation contract carries a raw currency ceiling while
 * the UI offers three budget bands. These bounds mirror the backend's
 * maxCostLevelFrom() bucketing so a UI band maps to the intended cost level.
 */
const BUDGET_TO_MAX_COST: Record<UserPreferences["budget"], number> = {
  Free: 0,
  "Low cost": 4999,
  Flexible: 49999
};

export function toApiPreferences(preferences: UserPreferences) {
  return {
    maxMinutes: preferences.availableMinutes,
    maxDistanceMeters: Math.round(preferences.maxDistanceKm * 1000),
    maxCost: BUDGET_TO_MAX_COST[preferences.budget],
    socialPreference: SOCIAL_TO_API[preferences.socialPreference],
    accessibilityNeeds: preferences.accessibilityNeeds
  };
}

export function mergeApiPreferences(
  current: UserPreferences,
  api: ApiPreferences | null
): UserPreferences {
  if (!api) return current;
  const maxCost = api.max_cost ?? 0;
  return {
    ...current,
    availableMinutes: api.max_minutes ?? current.availableMinutes,
    maxDistanceKm: api.max_distance_meters !== null ? api.max_distance_meters / 1000 : current.maxDistanceKm,
    budget: maxCost <= 0 ? "Free" : maxCost < 5000 ? "Low cost" : "Flexible",
    socialPreference: api.social_preference
      ? API_TO_SOCIAL[api.social_preference] ?? current.socialPreference
      : current.socialPreference,
    accessibilityNeeds: api.accessibility_needs ?? current.accessibilityNeeds
  };
}

/* ── Places ────────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  library: "Library",
  cafe: "Cafe",
  park: "Park",
  trail: "Park",
  community_center: "Community",
  study_room: "Library",
  studio: "Community",
  gym: "Community"
};

const CATEGORY_COLORS: Record<string, Place["color"]> = {
  library: "sky",
  study_room: "sky",
  cafe: "clay",
  park: "leaf",
  trail: "leaf",
  community_center: "plum",
  studio: "plum",
  gym: "plum"
};

/**
 * Reviewed places carry a coarse distance bucket rather than coordinates,
 * so these are the representative distances the UI shows until real
 * geocoding is wired up.
 */
const DISTANCE_BUCKET_KM: Record<string, number> = { near: 0.5, medium: 2, far: 5 };

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function fromApiPlace(place: ApiPlace): Place {
  const costLevel = place.costLevel ?? 0;
  return {
    id: place.id,
    name: place.name,
    type: CATEGORY_LABELS[place.category] ?? titleCase(place.category),
    distanceKm: place.distanceBucket ? DISTANCE_BUCKET_KM[place.distanceBucket] ?? 5 : 0,
    cost: costLevel <= 0 ? "Free" : costLevel === 1 ? "Low cost" : "Flexible",
    socialLoad: (place.socialLevel === "medium" || place.socialLevel === "high" ? "Medium" : "Low") as Place["socialLoad"],
    accessibility: place.accessibility
      ? place.accessibility.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    description: place.notes ?? `${CATEGORY_LABELS[place.category] ?? titleCase(place.category)} in ${place.addressRegion ?? "your area"}.`,
    address: place.addressRegion ?? "Address not listed",
    hours: place.hours ?? "Hours not listed",
    color: CATEGORY_COLORS[place.category] ?? "leaf"
  };
}

/* ── Action templates → recommendation options ─────────────────────── */

function templateFormat(template: ApiActionTemplate): MissionFormat {
  if (template.placeTypes.includes("online")) return "Online";
  if (template.placeTypes.every((type) => type === "home")) return "At home";
  return "In person";
}

function templateSocialMode(template: ApiActionTemplate): MissionSocialMode {
  if (template.maxSocialLoad <= 0) return "Solo";
  if (template.maxSocialLoad <= 2) return "Alongside others";
  return "Together";
}

function templateCost(template: ApiActionTemplate): string {
  return template.costLevel <= 0 ? "Free" : template.costLevel === 1 ? "Low cost" : "Flexible";
}

function templatePlaceType(template: ApiActionTemplate): string {
  const first = template.placeTypes[0];
  if (!first) return "Flexible";
  return CATEGORY_LABELS[first] ?? titleCase(first);
}

/** Composed from the template's own reviewed fields — no invented copy. */
function templateDescription(template: ApiActionTemplate): string {
  const [min, max] = template.durationRange;
  const duration = min === max ? `${max} minutes` : `${min} to ${max} minutes`;
  const setting =
    templateFormat(template) === "At home"
      ? "at home"
      : templateFormat(template) === "Online"
        ? "online"
        : `at a ${templatePlaceType(template).toLowerCase()}`;
  return `About ${duration} ${setting}. Stop whenever this step is enough for today.`;
}

export function fromApiTemplate(
  template: ApiActionTemplate,
  visionId: string,
  variant: MissionVariant,
  routeStepId?: string,
  placeId: string | null = null
): RecommendationOption {
  return {
    id: template.id,
    visionId,
    ...(routeStepId ? { routeStepId } : {}),
    variant,
    source: template.source ?? "seed",
    title: template.title,
    description: templateDescription(template),
    durationMinutes: template.durationRange[1],
    placeType: templatePlaceType(template),
    placeId,
    estimatedCost: templateCost(template),
    format: templateFormat(template),
    supplies: [],
    socialMode: templateSocialMode(template)
  };
}

/* ── Route steps ───────────────────────────────────────────────────── */

export function fromApiRouteStep(step: ApiRouteStep, template: ApiActionTemplate | undefined): RouteStep {
  return {
    id: step.id,
    level: step.ladder_level,
    title: template?.title ?? "Step",
    durationMinutes: template?.durationRange[1] ?? 10,
    placeType: template ? templatePlaceType(template) : "Flexible",
    completed: step.status === "done"
  };
}

/* ── Missions ──────────────────────────────────────────────────────── */

const API_STATUS_TO_UI: Record<ApiMissionStatus, Mission["status"]> = {
  planned: "planned",
  in_progress: "in_progress",
  completed: "completed",
  partially_completed: "partly",
  not_today: "not_today",
  cancelled: "not_today"
};

const UI_STATUS_TO_API: Record<Reflection["outcome"], "completed" | "partially_completed" | "not_today"> = {
  completed: "completed",
  partly: "partially_completed",
  not_today: "not_today"
};

export function toApiReflectionResult(outcome: Reflection["outcome"]) {
  return UI_STATUS_TO_API[outcome];
}

export function fromApiMission(mission: ApiMission, visionId: string): Mission | null {
  if (!mission.template) return null;
  const option = fromApiTemplate(
    mission.template,
    visionId,
    "recommended",
    mission.route_step_id ?? undefined,
    // The backend resolved this against reviewed places and the user's
    // constraints, so it is the Mission's actual location.
    mission.place_id
  );

  return {
    ...option,
    id: mission.id,
    optionId: mission.template.id,
    status: API_STATUS_TO_UI[mission.status],
    selectedAt: mission.created_at,
    scheduledFor: mission.scheduled_at ?? `${mission.scheduled_for}T12:00:00.000Z`,
    ...(mission.status === "in_progress" ? { startedAt: mission.updated_at } : {}),
    ...(mission.status === "completed" || mission.status === "partially_completed" || mission.status === "not_today"
      ? { completedAt: mission.updated_at }
      : {})
  };
}

/* ── Check-ins & reflections ───────────────────────────────────────── */

export function fromApiCheckIn(checkIn: ApiCheckIn): CheckInRecord {
  const stress = fromApiScore(checkIn.stress);
  const sleep = fromApiScore(checkIn.sleep_quality);
  const socialLoad = fromApiScore(checkIn.social_load);
  return {
    id: checkIn.id,
    type: checkIn.type === "standard" ? "standard" : "quick",
    createdAt: checkIn.captured_at,
    mood: fromApiScore(checkIn.mood) ?? 3,
    energy: fromApiScore(checkIn.energy) ?? 3,
    capacity: fromApiScore(checkIn.functional_capacity) ?? 3,
    ...(stress !== undefined ? { stress } : {}),
    ...(sleep !== undefined ? { sleep } : {}),
    ...(socialLoad !== undefined ? { socialLoad } : {}),
    ...(checkIn.note ? { note: checkIn.note } : {})
  };
}

export function fromApiReflection(reflection: ApiReflection): Reflection {
  const outcome: Reflection["outcome"] =
    reflection.result === "partially_completed"
      ? "partly"
      : reflection.result === "not_today"
        ? "not_today"
        : "completed";
  return {
    id: reflection.id,
    missionId: reflection.mission_id,
    outcome,
    effort: fromApiScore(reflection.burden) ?? 3,
    note: reflection.note ?? "",
    createdAt: reflection.created_at
  };
}

/* ── Community ─────────────────────────────────────────────────────── */

function formatActivityDate(startsAt: string | null): string {
  if (!startsAt) return "Flexible time";
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(startsAt));
}

export function fromApiCommunityActivity(activity: ApiCommunityActivity): CommunityActivity {
  const place = activity.isOnline ? "Online" : activity.location ?? "Location to be confirmed";
  const details = [
    activity.durationMinutes ? `${activity.durationMinutes} minutes` : null,
    activity.isOnline ? "joined online" : `held at ${place}`,
    activity.requiredItems ? `Bring: ${activity.requiredItems}` : "Nothing to bring"
  ]
    .filter(Boolean)
    .join(". ");

  return {
    id: activity.id,
    title: activity.title,
    host: activity.isOnline ? "ReNew Community" : place,
    dateLabel: formatActivityDate(activity.startsAt),
    place,
    capacity: activity.maxParticipants
      ? `${activity.joinedCount} of ${activity.maxParticipants} places`
      : `${activity.joinedCount} joined`,
    socialLoad: ((activity.socialLoad ?? 0) >= 2 ? "Medium" : "Low") as CommunityActivity["socialLoad"],
    description: `${details}.`,
    joined: activity.myStatus === "joined"
  };
}
