import { openDB, type DBSchema } from "idb";

export type LifeDomain =
  | "Study & focus"
  | "Sleep & energy"
  | "Relationships"
  | "Movement & health"
  | "Creativity"
  | "Daily independence"
  | "Community"
  | "Stress recovery";

export type EffortLevel = 1 | 2 | 3 | 4 | 5;

export interface UserPreferences {
  domains: LifeDomain[];
  availableMinutes: number;
  maxDistanceKm: number;
  budget: "Free" | "Low cost" | "Flexible";
  socialPreference: "Solo" | "Low pressure" | "Together";
  preferredPlaces: string[];
  accessibilityNeeds: string[];
}

export interface LifeVision {
  id: string;
  domain: LifeDomain;
  title: string;
  description: string;
  status: "active" | "paused";
}

export interface RouteStep {
  id: string;
  level: number;
  title: string;
  durationMinutes: number;
  placeType: string;
  completed: boolean;
}

export interface CheckInRecord {
  id: string;
  type: "quick" | "standard";
  createdAt: string;
  mood: EffortLevel;
  energy: EffortLevel;
  capacity: EffortLevel;
  stress?: EffortLevel;
  sleep?: EffortLevel;
  socialLoad?: EffortLevel;
  note?: string;
}

export type MissionVariant = "recommended" | "lighter" | "different" | "more" | "alternative";
export type MissionFormat = "In person" | "At home" | "Online";
export type MissionSocialMode = "Solo" | "Alongside others" | "Together";

export interface RecommendationOption {
  id: string;
  visionId: string;
  routeStepId?: string;
  variant: MissionVariant;
  /** "ai" steps were generated for this user and had no prior human review. */
  source?: "seed" | "ai";
  title: string;
  description: string;
  durationMinutes: number;
  placeType: string;
  placeId: string | null;
  estimatedCost: string;
  format: MissionFormat;
  supplies: string[];
  socialMode: MissionSocialMode;
}

export interface Mission {
  id: string;
  optionId: string;
  visionId: string;
  routeStepId?: string;
  variant: MissionVariant;
  title: string;
  description: string;
  durationMinutes: number;
  placeType: string;
  placeId: string | null;
  estimatedCost: string;
  format: MissionFormat;
  supplies: string[];
  socialMode: MissionSocialMode;
  status: "planned" | "in_progress" | "completed" | "partly" | "not_today";
  selectedAt: string;
  scheduledFor: string | null;
  startedAt?: string;
  completedAt?: string;
}

export interface Reflection {
  id: string;
  missionId: string;
  outcome: "completed" | "partly" | "not_today";
  effort: EffortLevel;
  note: string;
  createdAt: string;
}

export interface Place {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
  cost: string;
  socialLoad: "Low" | "Medium";
  accessibility: string[];
  description: string;
  address: string;
  hours: string;
  color: "sky" | "clay" | "leaf" | "plum";
}

export interface CommunityActivity {
  id: string;
  title: string;
  host: string;
  dateLabel: string;
  place: string;
  capacity: string;
  socialLoad: "Low" | "Medium";
  description: string;
  joined: boolean;
}

export interface CheckInRhythm {
  frequency: "daily" | "weekdays" | "weekly" | "custom";
  days: number[];
  time: string;
  enabled: boolean;
}

export interface AppData {
  profile: {
    name: string;
    email: string;
    signedIn: boolean;
    onboardingComplete: boolean;
  };
  preferences: UserPreferences;
  vision: LifeVision;
  route: RouteStep[];
  checkIns: CheckInRecord[];
  recommendations: RecommendationOption[];
  mission: Mission | null;
  plannedMissions: Mission[];
  missionHistory: Mission[];
  reflections: Reflection[];
  savedPlaceIds: string[];
  places: Place[];
  community: CommunityActivity[];
  settings: {
    checkInTime: string;
    reminders: boolean;
    checkInRhythm: CheckInRhythm;
    reducedMotion: boolean;
    theme: "system" | "light";
  };
  trustedContact: {
    /** Absent until the server has accepted the contact (e.g. saved offline). */
    id?: string;
    name: string;
    phone: string;
    relationship: string;
  } | null;
}

/**
 * An empty shell, not sample content. Visions, Routes, Missions, Places, and
 * Community activities all come from the backend (reviewed seed data plus the
 * rule engine and Gemini); anything hardcoded here would show up as real
 * recommendations the user never actually generated.
 */
export function createDefaultAppData(): AppData {
  return {
    profile: {
      name: "",
      email: "",
      signedIn: false,
      onboardingComplete: false
    },
    preferences: {
      domains: ["Study & focus"],
      availableMinutes: 20,
      maxDistanceKm: 2,
      budget: "Low cost",
      socialPreference: "Low pressure",
      preferredPlaces: ["Library", "Cafe", "Park"],
      accessibilityNeeds: []
    },
    vision: {
      id: "",
      domain: "Study & focus",
      title: "",
      description: "",
      status: "active"
    },
    route: [],
    checkIns: [],
    recommendations: [],
    mission: null,
    plannedMissions: [],
    missionHistory: [],
    reflections: [],
    savedPlaceIds: [],
    places: [],
    community: [],
    settings: {
      checkInTime: "18:00",
      reminders: true,
      checkInRhythm: {
        frequency: "daily",
        days: [0, 1, 2, 3, 4, 5, 6],
        time: "18:00",
        enabled: true
      },
      reducedMotion: false,
      theme: "system"
    },
    trustedContact: null
  };
}

/**
 * Bumped whenever locally cached content stops being trustworthy. Version 2
 * drops the demo Vision, Route, Places, and Community activities that used
 * to ship as hardcoded defaults: emptying those defaults does not remove
 * what a browser already persisted, so without this an existing user would
 * keep seeing "Greenwich Library" forever while the backend served
 * something else entirely.
 */
const DATA_VERSION = 2;

type StoredAppData = AppData & { dataVersion?: number };

/**
 * Writes made while offline, waiting to be replayed against the server.
 * Kept in IndexedDB rather than memory so closing the tab mid-flight does
 * not lose a Check-In the person already recorded.
 */
export interface OutboxOperation {
  idempotencyKey: string;
  entityType: "check_in" | "reflection" | "saved_place" | "trusted_contact";
  entityLocalId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface ReNewDatabase extends DBSchema {
  state: {
    key: "app";
    value: StoredAppData;
  };
  outbox: {
    key: string;
    value: OutboxOperation;
  };
}

export const databasePromise = openDB<ReNewDatabase>("renew-client", 2, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("state")) {
      database.createObjectStore("state");
    }
    if (!database.objectStoreNames.contains("outbox")) {
      database.createObjectStore("outbox", { keyPath: "idempotencyKey" });
    }
  }
});

export function createMissionFromOption(
  option: RecommendationOption,
  overrides: Partial<Pick<Mission, "id" | "status" | "selectedAt" | "scheduledFor" | "startedAt" | "completedAt">> = {}
): Mission {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    optionId: option.id,
    visionId: option.visionId,
    ...(option.routeStepId ? { routeStepId: option.routeStepId } : {}),
    variant: option.variant,
    title: option.title,
    description: option.description,
    durationMinutes: option.durationMinutes,
    placeType: option.placeType,
    placeId: option.placeId,
    estimatedCost: option.estimatedCost,
    format: option.format,
    supplies: option.supplies,
    socialMode: option.socialMode,
    status: overrides.status ?? "planned",
    selectedAt: overrides.selectedAt ?? new Date().toISOString(),
    scheduledFor: overrides.scheduledFor ?? null,
    ...(overrides.startedAt ? { startedAt: overrides.startedAt } : {}),
    ...(overrides.completedAt ? { completedAt: overrides.completedAt } : {})
  };
}

/**
 * Missions are stored whole, so a stored one is already complete. Options
 * are only consulted to refresh a Mission whose action still exists — there
 * is no option list to fall back on before the backend has loaded.
 */
function normalizeMission(
  mission: Partial<Mission>,
  recommendations: RecommendationOption[]
): Mission {
  const matchingOption = recommendations.find((option) => option.id === mission.optionId);

  if (matchingOption) {
    return createMissionFromOption(matchingOption, {
      id: mission.id,
      status: mission.status,
      selectedAt: mission.selectedAt,
      scheduledFor: mission.scheduledFor,
      startedAt: mission.startedAt,
      completedAt: mission.completedAt
    });
  }

  return {
    id: mission.id ?? crypto.randomUUID(),
    optionId: mission.optionId ?? "",
    visionId: mission.visionId ?? "",
    ...(mission.routeStepId ? { routeStepId: mission.routeStepId } : {}),
    variant: mission.variant ?? "recommended",
    title: mission.title ?? "",
    description: mission.description ?? "",
    durationMinutes: mission.durationMinutes ?? 10,
    placeType: mission.placeType ?? "Flexible",
    placeId: mission.placeId ?? null,
    estimatedCost: mission.estimatedCost ?? "Free",
    format: mission.format ?? "At home",
    supplies: mission.supplies ?? [],
    socialMode: mission.socialMode ?? "Solo",
    status: mission.status ?? "planned",
    selectedAt: mission.selectedAt ?? new Date().toISOString(),
    scheduledFor: mission.scheduledFor ?? null,
    ...(mission.startedAt ? { startedAt: mission.startedAt } : {}),
    ...(mission.completedAt ? { completedAt: mission.completedAt } : {})
  };
}

export async function loadAppData(): Promise<AppData> {
  const database = await databasePromise;
  const rawStored = await database.get("state", "app");

  if (!rawStored) {
    return createDefaultAppData();
  }

  const defaults = createDefaultAppData();

  // Content the backend owns is dropped when the cache predates the current
  // version, so stale demo data cannot outlive the release that removed it.
  // Settings, the week planner, and saved places are kept — they are the
  // user's own and have no server copy yet.
  const storedData: StoredAppData =
    (rawStored.dataVersion ?? 1) < DATA_VERSION
      ? {
          ...rawStored,
          vision: defaults.vision,
          route: [],
          recommendations: [],
          places: [],
          community: [],
          mission: null,
          missionHistory: [],
          checkIns: [],
          reflections: []
        }
      : rawStored;
  const storedSettings = storedData.settings as Partial<AppData["settings"]>;
  const storedRhythm = storedSettings.checkInRhythm;
  const rhythmTime = storedRhythm?.time ?? storedSettings.checkInTime ?? defaults.settings.checkInTime;
  const rhythmEnabled = storedRhythm?.enabled ?? storedSettings.reminders ?? defaults.settings.reminders;
  const storedMissionData = storedData as AppData & {
    plannedMissions?: Partial<Mission>[];
    missionHistory?: Partial<Mission>[];
  };

  // Options come from the backend now, so the stored copy is the freshest
  // one available until the next hydration overwrites it.
  const storedRecommendations = storedData.recommendations ?? [];

  return {
    ...defaults,
    ...storedData,
    profile: { ...defaults.profile, ...storedData.profile },
    preferences: { ...defaults.preferences, ...storedData.preferences },
    vision: { ...defaults.vision, ...storedData.vision },
    recommendations: storedRecommendations,
    mission: storedData.mission ? normalizeMission(storedData.mission, storedRecommendations) : null,
    plannedMissions: (storedMissionData.plannedMissions ?? []).map((mission) =>
      normalizeMission(mission, storedRecommendations)
    ),
    missionHistory: (storedMissionData.missionHistory ?? []).map((mission) =>
      normalizeMission(mission, storedRecommendations)
    ),
    settings: {
      ...defaults.settings,
      ...storedSettings,
      checkInTime: rhythmTime,
      reminders: rhythmEnabled,
      checkInRhythm: {
        ...defaults.settings.checkInRhythm,
        ...storedRhythm,
        time: rhythmTime,
        enabled: rhythmEnabled
      }
    }
  };
}

export async function saveAppData(data: AppData): Promise<void> {
  const database = await databasePromise;
  await database.put("state", { ...data, dataVersion: DATA_VERSION }, "app");
}

export async function clearAppData(): Promise<void> {
  const database = await databasePromise;
  await database.delete("state", "app");
}
