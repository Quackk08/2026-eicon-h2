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
import { flushQueue, writeOrQueue } from "./offlineQueue";
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
  ApiCheckInRhythm,
  ApiCommunityActivity,
  ApiMission,
  ApiPlace,
  ApiPlaceSearchResult,
  ApiProfile,
  ApiRecommendation,
  ApiReflection,
  ApiRoute,
  ApiStateSummary,
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

/**
 * Templates are scoped to a profile, so one has to exist before asking.
 * Onboarding previews the ladder before anything else has established a
 * profile — and right after a reset there is deliberately none — so this
 * waits rather than sending an anonymous request that comes back 401 and
 * shows an empty Route.
 */
export async function fetchActionTemplates(): Promise<ApiActionTemplate[]> {
  await ensureProfile();
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

export async function fetchStateSummary(): Promise<ApiStateSummary> {
  return api.get<ApiStateSummary>("/state/summary");
}

export async function fetchCheckInRhythm(): Promise<ApiCheckInRhythm> {
  return api.get<ApiCheckInRhythm>("/check-in-rhythm");
}

/* ── Writes ────────────────────────────────────────────────────────── */

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  // Onboarding writes before anything has read, so the profile may not
  // exist yet; without this the save 401s and the caller's catch loses it.
  await ensureProfile();
  await api.patch("/me/preferences", toApiPreferences(preferences));
}

export async function saveProfile(displayName: string): Promise<ApiProfile> {
  await ensureProfile();
  return api.patch<ApiProfile>("/me", { displayName });
}

export async function resetProfileData(): Promise<void> {
  if (!getProfileId() && !(await ensureProfile().catch(() => null))) return;
  await api.delete("/me");
  clearGuestProfileId();
}

export async function saveCheckInRhythm(
  rhythm: AppData["settings"]["checkInRhythm"]
): Promise<ApiCheckInRhythm> {
  await ensureProfile();
  return api.patch<ApiCheckInRhythm>("/check-in-rhythm", rhythm);
}

export function composeVisionSummary(title: string, description: string): string {
  return [title.trim(), description.trim()].filter(Boolean).join("\n\n").slice(0, 500);
}

function splitVisionSummary(summary: string): { title: string; description: string } {
  const [title, ...description] = summary.split(/\n\s*\n/);
  return { title: title.trim(), description: description.join("\n\n").trim() };
}

/**
 * Creates (or updates) the Vision and returns the ladder it actually got,
 * ready to display.
 *
 * Onboarding's last screen calls itself "your first Route", so it has to
 * show the generated steps rather than the seed preview it used to — the
 * seed list looked hardcoded precisely because it was not built from
 * anything the person wrote.
 *
 * Passing an existing visionId rewrites that Vision instead of adding
 * another, so going back and editing the wording does not leave a trail of
 * abandoned Visions behind.
 */
export async function createVisionWithGeneratedRoute(
  domain: LifeDomain,
  summary: string,
  existingVisionId?: string
): Promise<{ visionId: string; steps: RouteStep[] }> {
  await ensureProfile();

  const vision = existingVisionId
    ? await api.patch<ApiVision>(`/visions/${existingVisionId}`, {
        summary,
        domain: toApiDomain(domain)
      })
    : await api.post<ApiVision>("/visions", { domain: toApiDomain(domain), summary });

  const route = await api.post<ApiRoute>(`/visions/${vision.id}/generate-route`, {});
  const templates = await fetchActionTemplates();
  const templatesById = new Map(templates.map((template) => [template.id, template]));

  return {
    visionId: vision.id,
    steps: route.steps.map((step) => fromApiRouteStep(step, templatesById.get(step.template_id)))
  };
}

export async function createVisionWithRoute(
  domain: LifeDomain,
  summary: string
): Promise<{ vision: ApiVision; route: ApiRoute | null }> {
  await ensureProfile();
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

export async function updateRouteStepStatus(
  routeId: string,
  stepId: string,
  stepStatus: "pending" | "current" | "done" | "skipped"
): Promise<ApiRoute> {
  return api.patch<ApiRoute>(`/routes/${routeId}`, { stepId, stepStatus });
}

export interface EditableRouteStep {
  title: string;
  durationMinutes: number;
  placeType: string;
}

export async function addRouteStep(routeId: string, step: EditableRouteStep): Promise<ApiRoute> {
  return api.post<ApiRoute>(`/routes/${routeId}/steps`, step);
}

export async function editRouteStep(
  routeId: string,
  stepId: string,
  step: EditableRouteStep
): Promise<ApiRoute> {
  return api.patch<ApiRoute>(`/routes/${routeId}/steps/${stepId}`, step);
}

export async function reorderRouteSteps(routeId: string, stepIds: string[]): Promise<ApiRoute> {
  return api.patch<ApiRoute>(`/routes/${routeId}/steps`, { stepIds });
}

export async function removeRouteStep(routeId: string, stepId: string): Promise<ApiRoute> {
  return api.delete<ApiRoute>(`/routes/${routeId}/steps/${stepId}`);
}

function buildCheckInBody(record: CheckInRecord) {
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

  return body;
}

export async function submitCheckIn(record: CheckInRecord): Promise<ApiCheckIn> {
  return api.post<ApiCheckIn>("/check-ins", buildCheckInBody(record));
}

/**
 * A Check-In is the one thing the app must never lose: it is a record of
 * how someone actually was at a moment that has passed. When the network
 * is the reason it cannot be saved, it is queued rather than dropped.
 */
export async function submitCheckInOrQueue(record: CheckInRecord): Promise<{ queued: boolean }> {
  const body = buildCheckInBody(record);
  return writeOrQueue(() => api.post<ApiCheckIn>("/check-ins", body), {
    entityType: "check_in",
    entityLocalId: record.id,
    operation: "create",
    payload: body as unknown as Record<string, unknown>
  });
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

export async function updateMission(
  missionId: string,
  patch: { status?: "planned" | "in_progress" | "cancelled"; scheduledFor?: string }
): Promise<ApiMission> {
  return api.patch<ApiMission>(`/missions/${missionId}`, patch);
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

/**
 * Like a Check-In, a Reflection describes a moment that has already
 * happened, so a dropped connection must not erase it.
 */
export async function submitReflectionOrQueue(
  missionId: string,
  reflection: Pick<Reflection, "outcome" | "effort" | "note">
): Promise<{ queued: boolean }> {
  const body = {
    result: toApiReflectionResult(reflection.outcome),
    burden: toApiScore(reflection.effort),
    note: reflection.note || null
  };
  return writeOrQueue(
    () => api.post(`/missions/${missionId}/reflection`, body),
    {
      entityType: "reflection",
      entityLocalId: missionId,
      operation: "create",
      payload: { ...body, missionId }
    }
  );
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
export interface ApiTrustedContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
}

export async function fetchSavedPlaceIds(): Promise<string[]> {
  return api.get<string[]>("/saved-places");
}

/**
 * Queues rather than drops the change when the network is down, so a place
 * saved on the train is still saved once there is signal again.
 */
export async function setPlaceSaved(placeId: string, saved: boolean): Promise<{ queued: boolean }> {
  return writeOrQueue(
    () => (saved ? api.put(`/saved-places/${placeId}`) : api.delete(`/saved-places/${placeId}`)),
    {
      entityType: "saved_place",
      entityLocalId: placeId,
      operation: saved ? "create" : "delete",
      payload: { placeId }
    }
  );
}

export async function fetchTrustedContacts(): Promise<ApiTrustedContact[]> {
  return api.get<ApiTrustedContact[]>("/trusted-contacts");
}

export async function saveTrustedContact(
  contact: { name: string; phone: string; relationship: string },
  existingId?: string
): Promise<{ queued: boolean }> {
  const body = {
    name: contact.name,
    phone: contact.phone || null,
    relationship: contact.relationship || null
  };
  return writeOrQueue(
    () =>
      existingId
        ? api.patch(`/trusted-contacts/${existingId}`, body)
        : api.post("/trusted-contacts", body),
    {
      entityType: "trusted_contact",
      entityLocalId: existingId ?? contact.name,
      operation: existingId ? "update" : "create",
      payload: existingId ? { ...body, id: existingId } : body
    }
  );
}

export async function removeTrustedContact(id: string): Promise<{ queued: boolean }> {
  return writeOrQueue(() => api.delete(`/trusted-contacts/${id}`), {
    entityType: "trusted_contact",
    entityLocalId: id,
    operation: "delete",
    payload: { id }
  });
}

/**
 * Records that the person approved a handoff on the preview screen. The
 * message itself is sent by the device's own SMS or phone app, never by
 * ReNew (docs/PRODUCT_GUARDRAILS.md).
 */
export async function logSupportHandoff(input: {
  trustedContactId: string | null;
  channel: "sms" | "tel";
  messagePreview: string;
  includedData: string[];
  excludedData: string[];
}): Promise<void> {
  await api.post("/support-messages", input);
}

export async function hydrateFromBackend(current: AppData): Promise<HydrationResult> {
  await ensureProfile();

  // Anything written while offline goes up before we read, so the snapshot
  // below reflects those writes instead of overwriting them.
  await flushQueue().catch(() => 0);

  const [
    profile,
    session,
    visions,
    places,
    community,
    missions,
    checkIns,
    reflections,
    templates,
    recommendation,
    savedPlaceIds,
    trustedContacts,
    rhythm
  ] = await Promise.all([
    fetchProfile(),
    fetchSession().catch(() => null),
    fetchVisions(),
    fetchPlaces(),
    fetchCommunityActivities().catch(() => null),
    api.get<ApiMission[]>("/missions").catch(() => null),
    api.get<ApiCheckIn[]>("/check-ins").catch(() => null),
    api.get<ApiReflection[]>("/reflections").catch(() => null),
    api.get<ApiActionTemplate[]>("/action-templates").catch(() => null),
    fetchLatestRecommendation().catch(() => null),
    fetchSavedPlaceIds().catch(() => null),
    fetchTrustedContacts().catch(() => null),
    fetchCheckInRhythm().catch(() => null)
  ]);

  const templatesById = new Map((templates ?? []).map((template) => [template.id, template]));

  const patch: Partial<AppData> = {
    profile: {
      ...current.profile,
      name: profile.display_name ?? current.profile.name,
      email: session?.email ?? current.profile.email,
      signedIn: session?.signedIn ?? profile.signedIn ?? current.profile.signedIn,
      onboardingComplete: visions.length > 0
    },
    preferences: mergeApiPreferences(current.preferences, profile.preferences),
    places: places.map(fromApiPlace)
  };

  if (community) patch.community = community.map(fromApiCommunityActivity);
  if (checkIns) patch.checkIns = checkIns.map(fromApiCheckIn).reverse();
  if (reflections) patch.reflections = reflections.map(fromApiReflection).reverse();
  if (savedPlaceIds) patch.savedPlaceIds = savedPlaceIds;
  if (trustedContacts) {
    patch.trustedContact = trustedContacts[0]
      ? {
          id: trustedContacts[0].id,
          name: trustedContacts[0].name,
          phone: trustedContacts[0].phone ?? "",
          relationship: trustedContacts[0].relationship ?? ""
        }
      : null;
  }
  if (rhythm) {
    patch.settings = {
      ...current.settings,
      checkInTime: rhythm.time,
      reminders: rhythm.enabled,
      checkInRhythm: {
        frequency: rhythm.frequency,
        days: rhythm.days,
        time: rhythm.time,
        enabled: rhythm.enabled
      }
    };
  }

  const activeVision = visions.find((vision) => vision.status === "active") ?? visions[0] ?? null;

  const toLifeVision = (vision: ApiVision) => {
    const saved =
      vision.id === current.vision.id
        ? current.vision
        : current.pastVisions.find((item) => item.id === vision.id);
    const summary = splitVisionSummary(vision.summary);
    return {
      id: vision.id,
      domain: fromApiDomain(vision.domain),
      title: summary.title,
      description: summary.description || saved?.description || "",
      status: vision.status
    };
  };

  patch.pastVisions = visions
    .filter((vision) => vision.id !== activeVision?.id)
    .map(toLifeVision);

  if (activeVision) {
    patch.vision = toLifeVision(activeVision);

    const route = await fetchRouteForVision(activeVision.id).catch(() => null);
    if (route) {
      patch.routeId = route.id;
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
    } else {
      patch.routeId = null;
      patch.route = [];
      patch.recommendations = [];
    }
  } else {
    patch.routeId = null;
    patch.route = [];
    patch.recommendations = [];
  }

  const visionId = activeVision?.id ?? current.vision.id;
  const uiMissions = (missions ?? [])
    .map((mission) => fromApiMission(mission, visionId))
    .filter((mission): mission is Mission => mission !== null);

  if (missions) {
    const today = new Date().toISOString().slice(0, 10);
    const openMission =
      uiMissions.find((mission) => mission.status === "in_progress") ??
      uiMissions.find(
        (mission) => mission.status === "planned" && mission.scheduledFor?.slice(0, 10) === today
      ) ??
      null;

    patch.mission = openMission;
    patch.plannedMissions = uiMissions.filter(
      (mission) => mission.status === "planned" && mission.id !== openMission?.id
    );
    patch.missionHistory = uiMissions.filter(
      (mission) => mission.status !== "planned" && mission.status !== "in_progress"
    );
  }

  return { patch, recommendation };
}

export function hasProfile(): boolean {
  return getProfileId() !== null;
}
