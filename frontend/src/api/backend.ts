import type {
  AppData,
  CheckInRecord,
  LifeDomain,
  Mission,
  MissionVariant,
  Reflection,
  RouteStep,
  UserPreferences
} from "../data/appData";
import { ApiError, api, clearGuestProfileId, ensureProfile, getProfileId } from "./client";
import { signIn, signUp, type AuthResult } from "./auth";
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
  ApiPlaceSearchResult,
  ApiProfile,
  ApiRecommendation,
  ApiReflection,
  ApiRoute,
  ApiVision,
  ApiWeeklyInsight
} from "./types";

export { ensureProfile, getProfileId } from "./client";
export { ApiError } from "./client";

/* ── Auth ──────────────────────────────────────────────────────────── */

export interface SessionInfo {
  signedIn: boolean;
  profileId: string;
  email: string | null;
}

export async function fetchSession(): Promise<SessionInfo> {
  return api.get<SessionInfo>("/auth/session");
}

/**
 * Signs in, then hands the guest profile over to the account so the work
 * someone did before making an account is not stranded. Linking is
 * best-effort: a refusal (the account already has records of its own) must
 * not block signing in, so it is reported rather than thrown.
 */
export async function signInAndLink(email: string, password: string): Promise<AuthResult & { linkNote?: string }> {
  const result = await signIn(email, password);
  if (!result.ok) return result;
  return { ...result, linkNote: await claimGuestProfile(result.accessToken) };
}

export async function signUpAndLink(email: string, password: string): Promise<AuthResult & { linkNote?: string }> {
  const result = await signUp(email, password);
  if (!result.ok) return result;
  return { ...result, linkNote: await claimGuestProfile(result.accessToken) };
}

/**
 * Hands the guest profile to the account that just signed in.
 *
 * The token is passed in explicitly: supabase-js persists the session
 * asynchronously, so reading it back here can still return nothing and the
 * request would go out as a guest — which the backend rightly refuses.
 *
 * Never silently succeeds. If the handover does not happen, the caller gets
 * a note to show, because "you are signed in" while someone's Vision and
 * Check-Ins were left behind is the worst possible outcome.
 */
async function claimGuestProfile(accessToken?: string): Promise<string | undefined> {
  const guestProfileId = getProfileId();
  if (!guestProfileId) return undefined;

  try {
    await api.post("/auth/link", { guestProfileId }, accessToken);
    clearGuestProfileId();
    return undefined;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      // The account already has its own history. Keeping the two apart is
      // correct, but the person needs to know their guest work is not here.
      clearGuestProfileId();
      return "Signed in. Work saved on this device beforehand was kept separate, because this account already has its own history.";
    }
    // Keep the guest id so the work is still reachable after signing out.
    return "Signed in, but the work saved on this device could not be moved to this account yet. It is still on this device.";
  }
}

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

export async function fetchActionTemplates(): Promise<ApiActionTemplate[]> {
  return api.get<ApiActionTemplate[]>("/action-templates");
}

/**
 * The reviewed Activity Ladder a Vision in this domain would actually get,
 * ordered easiest first — the same selection generate-route makes, so
 * onboarding previews the real Route rather than a sample of it.
 */
export async function fetchLadderForDomain(domain: LifeDomain): Promise<ApiActionTemplate[]> {
  const apiDomain = toApiDomain(domain);
  const templates = await fetchActionTemplates();
  const inDomain = templates.filter((template) => template.goalDomains.includes(apiDomain));

  const groups = new Map<string, ApiActionTemplate[]>();
  for (const template of inDomain) {
    const group = groups.get(template.ladderGroupId) ?? [];
    group.push(template);
    groups.set(template.ladderGroupId, group);
  }

  const richest = [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  return [...richest].sort((a, b) => a.ladderLevel - b.ladderLevel);
}

/** The same ladder, shaped for the Route list the onboarding preview renders. */
export async function fetchRoutePreview(domain: LifeDomain): Promise<RouteStep[]> {
  const ladder = await fetchLadderForDomain(domain);
  return ladder.map((template, index) => ({
    id: template.id,
    level: index + 1,
    title: template.title,
    durationMinutes: template.durationRange[1],
    placeType: template.placeTypes[0] ?? "Flexible",
    completed: false
  }));
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

/** Reads the existing recommendation without generating a new one. */
export async function fetchLatestRecommendation(): Promise<ApiRecommendation | null> {
  return api.get<ApiRecommendation | null>("/recommendations/latest");
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

/** Where the backend would hold this action, given the user's constraints. */
export async function fetchPlaceForTemplate(templateId: string): Promise<ApiPlaceSearchResult | null> {
  try {
    return await api.get<ApiPlaceSearchResult>(`/places/search?templateId=${encodeURIComponent(templateId)}`);
  } catch {
    // A home or online step has no place, and an unreachable backend is not
    // a reason to show a location that was never chosen.
    return null;
  }
}

export async function setMissionPlace(missionId: string, placeId: string | null): Promise<ApiMission> {
  return api.patch<ApiMission>(`/missions/${missionId}/place`, { placeId });
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
  /** The backend's current pick, so every screen agrees on today's step. */
  recommendation: ApiRecommendation | null;
}

/**
 * Pulls server state into the shape the existing UI already renders. The
 * local IndexedDB copy stays the immediate source of truth (offline-first,
 * per docs/PRODUCT_GUARDRAILS.md); this only overlays what the server knows.
 */
export async function hydrateFromBackend(current: AppData): Promise<HydrationResult> {
  await ensureProfile();

  const [profile, visions, places, community, missions, checkIns, reflections, templates, recommendation] =
    await Promise.all([
      fetchProfile(),
      fetchVisions(),
      fetchPlaces(),
      fetchCommunityActivities().catch(() => [] as ApiCommunityActivity[]),
      api.get<ApiMission[]>("/missions").catch(() => [] as ApiMission[]),
      api.get<ApiCheckIn[]>("/check-ins").catch(() => [] as ApiCheckIn[]),
      api.get<ApiReflection[]>("/reflections").catch(() => [] as ApiReflection[]),
      api.get<ApiActionTemplate[]>("/action-templates").catch(() => [] as ApiActionTemplate[]),
      fetchLatestRecommendation().catch(() => null)
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

      // Variants describe each step relative to the one the backend actually
      // recommended — not its position in the Route. Without this, "Best fit"
      // would always be the Route's first step no matter what the Check-In said.
      patch.recommendations = route.steps
        .map((step) => {
          const template = templatesById.get(step.template_id);
          if (!template) return null;

          let variant: MissionVariant = "alternative";
          if (recommendation) {
            if (template.id === recommendation.selected_template_id) variant = "recommended";
            else if (template.id === recommendation.smaller_template_id) variant = "lighter";
            else if (template.id === recommendation.extension_template_id) variant = "more";
          }

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

  return { patch, recommendation };
}

export function hasProfile(): boolean {
  return getProfileId() !== null;
}
