import type {
  AppData,
  CheckInRecord,
  LifeDomain,
  Mission,
  Reflection,
  UserPreferences
} from "../data/appData";
import { api, ensureProfile, getProfileId } from "./client";
import {
  fromApiCheckIn,
  fromApiCommunityActivity,
  fromApiDomain,
  fromApiMission,
  fromApiPlace,
  fromApiReflection,
  fromApiRouteStep,
  fromApiTemplate,
  mergeApiPreferences,
  toApiDomain,
  toApiPreferences,
  toApiReflectionResult,
  toApiScore
} from "./mappers";
import type {
  ApiActionTemplate,
  ApiCheckIn,
  ApiCommunityActivity,
  ApiMission,
  ApiPlace,
  ApiProfile,
  ApiRecommendation,
  ApiReflection,
  ApiRoute,
  ApiVision,
  ApiWeeklyInsight
} from "./types";

export { ensureProfile, getProfileId } from "./client";
export { ApiError } from "./client";

/* ── Reads ─────────────────────────────────────────────────────────── */

export async function fetchProfile(): Promise<ApiProfile> {
  return api.get<ApiProfile>("/me");
}

export async function fetchVisions(): Promise<ApiVision[]> {
  return api.get<ApiVision[]>("/visions");
}

export async function fetchRouteForVision(visionId: string): Promise<ApiRoute | null> {
  return api.get<ApiRoute | null>(`/visions/${visionId}/route`);
}

export async function fetchPlaces(): Promise<ApiPlace[]> {
  return api.get<ApiPlace[]>("/places");
}

export async function fetchCommunityActivities(): Promise<ApiCommunityActivity[]> {
  return api.get<ApiCommunityActivity[]>("/community/activities");
}

export async function fetchWeeklyInsight(): Promise<ApiWeeklyInsight> {
  return api.get<ApiWeeklyInsight>("/insights/weekly");
}

/* ── Writes ────────────────────────────────────────────────────────── */

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  await api.patch("/me/preferences", toApiPreferences(preferences));
}

export async function createVisionWithRoute(
  domain: LifeDomain,
  summary: string
): Promise<{ vision: ApiVision; route: ApiRoute | null }> {
  const vision = await api.post<ApiVision>("/visions", { domain: toApiDomain(domain), summary });
  let route: ApiRoute | null = null;
  try {
    route = await api.post<ApiRoute>(`/visions/${vision.id}/generate-route`, {});
  } catch {
    // A domain with no reviewed Activity Ladder yet still gets a Vision;
    // the Route can be generated later once templates exist.
  }
  return { vision, route };
}

export async function updateVision(
  visionId: string,
  patch: { summary?: string; status?: "active" | "paused"; domain?: LifeDomain }
): Promise<ApiVision> {
  return api.patch<ApiVision>(`/visions/${visionId}`, {
    ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.domain !== undefined ? { domain: toApiDomain(patch.domain) } : {})
  });
}

export async function submitCheckIn(record: CheckInRecord): Promise<ApiCheckIn> {
  const base = {
    localId: record.id,
    capturedAt: record.createdAt,
    mood: toApiScore(record.mood),
    energy: toApiScore(record.energy),
    functionalCapacity: toApiScore(record.capacity),
    ...(record.note ? { note: record.note } : {})
  };

  const body =
    record.type === "standard"
      ? {
          ...base,
          type: "standard" as const,
          stress: toApiScore(record.stress ?? 3),
          sleepQuality: toApiScore(record.sleep ?? 3),
          loneliness: toApiScore(record.socialLoad ?? 3),
          socialLoad: toApiScore(record.socialLoad ?? 3),
          initiationDifficulty: toApiScore(record.capacity)
        }
      : { ...base, type: "quick" as const };

  return api.post<ApiCheckIn>("/check-ins", body);
}

export async function requestDailyRecommendation(visionId?: string): Promise<ApiRecommendation> {
  return api.post<ApiRecommendation>("/recommendations/daily", visionId ? { visionId } : {});
}

export async function selectRecommendation(
  recommendationId: string,
  templateId: string,
  routeStepId?: string | null
): Promise<ApiMission> {
  return api.post<ApiMission>(`/recommendations/${recommendationId}/select`, {
    templateId,
    ...(routeStepId ? { routeStepId } : {})
  });
}

export async function adaptMission(
  missionId: string,
  direction: "smaller" | "bigger"
): Promise<ApiMission> {
  return api.post<ApiMission>(`/missions/${missionId}/adapt`, { direction });
}

export async function submitReflection(
  missionId: string,
  reflection: Pick<Reflection, "outcome" | "effort" | "note">
): Promise<{ reflection: ApiReflection; suggestion: string }> {
  return api.post<{ reflection: ApiReflection; suggestion: string }>(`/missions/${missionId}/reflection`, {
    result: toApiReflectionResult(reflection.outcome),
    burden: toApiScore(reflection.effort),
    note: reflection.note || null
  });
}

export async function joinCommunityActivity(activityId: string): Promise<void> {
  await api.post(`/community/activities/${activityId}/join`);
}

export async function cancelCommunityActivity(activityId: string): Promise<void> {
  await api.post(`/community/activities/${activityId}/cancel`);
}

export async function reportCommunityActivity(activityId: string, reason: string): Promise<void> {
  await api.post(`/community/activities/${activityId}/report`, { reason });
}

/* ── Hydration ─────────────────────────────────────────────────────── */

export interface HydrationResult {
  patch: Partial<AppData>;
  recommendationId: string | null;
}

/**
 * Pulls server state into the shape the existing UI already renders. The
 * local IndexedDB copy stays the immediate source of truth (offline-first,
 * per docs/PRODUCT_GUARDRAILS.md); this only overlays what the server knows.
 */
export async function hydrateFromBackend(current: AppData): Promise<HydrationResult> {
  await ensureProfile();

  const [profile, visions, places, community, missions, checkIns, reflections, templates] =
    await Promise.all([
      fetchProfile(),
      fetchVisions(),
      fetchPlaces(),
      fetchCommunityActivities().catch(() => [] as ApiCommunityActivity[]),
      api.get<ApiMission[]>("/missions").catch(() => [] as ApiMission[]),
      api.get<ApiCheckIn[]>("/check-ins").catch(() => [] as ApiCheckIn[]),
      api.get<ApiReflection[]>("/reflections").catch(() => [] as ApiReflection[]),
      api.get<ApiActionTemplate[]>("/action-templates").catch(() => [] as ApiActionTemplate[])
    ]);

  const templatesById = new Map(templates.map((template) => [template.id, template]));

  const patch: Partial<AppData> = {
    preferences: mergeApiPreferences(current.preferences, profile.preferences),
    places: places.map(fromApiPlace),
    community: community.map(fromApiCommunityActivity),
    checkIns: checkIns.map(fromApiCheckIn).reverse(),
    reflections: reflections.map(fromApiReflection).reverse()
  };

  const activeVision = visions.find((vision) => vision.status === "active") ?? visions[0] ?? null;

  if (activeVision) {
    patch.vision = {
      id: activeVision.id,
      domain: fromApiDomain(activeVision.domain),
      title: activeVision.summary,
      description: current.vision.description,
      status: activeVision.status
    };

    const route = await fetchRouteForVision(activeVision.id).catch(() => null);
    if (route) {
      patch.route = route.steps.map((step) =>
        fromApiRouteStep(step, templatesById.get(step.template_id))
      );

      // The UI's "options" are the reviewed ladder steps for this Route:
      // smaller steps read as lighter alternatives, larger ones as stretches.
      const currentIndex = Math.max(
        0,
        route.steps.findIndex((step) => step.status === "current")
      );
      patch.recommendations = route.steps
        .map((step, index) => {
          const template = templatesById.get(step.template_id);
          if (!template) return null;
          const variant =
            index === currentIndex
              ? "recommended"
              : index < currentIndex
                ? "lighter"
                : index === currentIndex + 1
                  ? "more"
                  : "alternative";
          return fromApiTemplate(template, activeVision.id, variant, step.id);
        })
        .filter((option): option is NonNullable<typeof option> => option !== null);
    }
  }

  const visionId = activeVision?.id ?? current.vision.id;
  const uiMissions = missions
    .map((mission) => fromApiMission(mission, visionId))
    .filter((mission): mission is Mission => mission !== null);

  const openMission =
    uiMissions.find((mission) => mission.status === "planned" || mission.status === "in_progress") ?? null;

  patch.mission = openMission;
  patch.missionHistory = uiMissions.filter(
    (mission) => mission.status !== "planned" && mission.status !== "in_progress"
  );

  return { patch, recommendationId: null };
}

export function hasProfile(): boolean {
  return getProfileId() !== null;
}
