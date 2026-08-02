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
    name: string;
    phone: string;
    relationship: string;
  } | null;
}

export function createDefaultAppData(): AppData {
  return {
    profile: {
      name: "Alex",
      email: "alex@example.com",
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
      id: "vision-study",
      domain: "Study & focus",
      title: "A steady life beyond my room",
      description: "Build a gentle routine of studying outside the home several times each week.",
      status: "active"
    },
    route: [
      { id: "route-1", level: 1, title: "Put one notebook in your bag", durationMinutes: 2, placeType: "Home", completed: true },
      { id: "route-2", level: 2, title: "Take a five-minute walk outside", durationMinutes: 5, placeType: "Nearby", completed: true },
      { id: "route-3", level: 3, title: "Walk to a nearby cafe entrance", durationMinutes: 10, placeType: "Cafe", completed: false },
      { id: "route-4", level: 4, title: "Open your notebook and stay for ten minutes", durationMinutes: 10, placeType: "Cafe", completed: false },
      { id: "route-5", level: 5, title: "Study outside for twenty minutes", durationMinutes: 20, placeType: "Library", completed: false }
    ],
    checkIns: [],
    recommendations: [
      {
        id: "recommendation-balanced",
        visionId: "vision-study",
        routeStepId: "route-4",
        variant: "recommended",
        title: "Open your notebook at Greenwich Library for 10 minutes",
        description: "Choose a quiet desk, open one page, and stop after ten minutes if that is enough for today.",
        durationMinutes: 10,
        placeType: "Library",
        placeId: "place-library",
        estimatedCost: "Free",
        format: "In person",
        supplies: ["Notebook", "Pen"],
        socialMode: "Solo"
      },
      {
        id: "recommendation-light",
        visionId: "vision-study",
        routeStepId: "route-3",
        variant: "lighter",
        title: "Walk to the Greenwich Library entrance and return",
        description: "Reach the entrance without needing to go inside. The trip itself is the whole mission.",
        durationMinutes: 8,
        placeType: "Library",
        placeId: "place-library",
        estimatedCost: "Free",
        format: "In person",
        supplies: [],
        socialMode: "Solo"
      },
      {
        id: "recommendation-different",
        visionId: "vision-study",
        routeStepId: "route-1",
        variant: "different",
        title: "Put your workbook and pen in your bag at home",
        description: "Prepare everything for a later study trip without needing to leave home today.",
        durationMinutes: 2,
        placeType: "Home",
        placeId: null,
        estimatedCost: "Free",
        format: "At home",
        supplies: ["Workbook", "Pen", "Bag"],
        socialMode: "Solo"
      },
      {
        id: "recommendation-stretch",
        visionId: "vision-study",
        routeStepId: "route-5",
        variant: "more",
        title: "Solve three workbook pages at Greenwich Library",
        description: "Use one focused block, stop after three pages, and leave the rest for another day.",
        durationMinutes: 20,
        placeType: "Library",
        placeId: "place-library",
        estimatedCost: "Free",
        format: "In person",
        supplies: ["Workbook", "Pen"],
        socialMode: "Solo"
      },
      {
        id: "recommendation-online-focus",
        visionId: "vision-study",
        routeStepId: "route-4",
        variant: "alternative",
        title: "Join a quiet online focus room for 15 minutes",
        description: "Work alongside others with cameras and conversation optional, then leave after one short block.",
        durationMinutes: 15,
        placeType: "Online",
        placeId: null,
        estimatedCost: "Free",
        format: "Online",
        supplies: ["Workbook", "Device"],
        socialMode: "Alongside others"
      },
      {
        id: "recommendation-home-page",
        visionId: "vision-study",
        routeStepId: "route-2",
        variant: "alternative",
        title: "Complete one workbook page at your desk",
        description: "Open to the next page, complete only that page, and put the book away when it is done.",
        durationMinutes: 10,
        placeType: "Home",
        placeId: null,
        estimatedCost: "Free",
        format: "At home",
        supplies: ["Workbook", "Pen"],
        socialMode: "Solo"
      }
    ],
    mission: null,
    plannedMissions: [],
    missionHistory: [],
    reflections: [],
    savedPlaceIds: ["place-library"],
    places: [
      {
        id: "place-library",
        name: "Greenwich Library",
        type: "Library",
        distanceKm: 0.8,
        cost: "Free",
        socialLoad: "Low",
        accessibility: ["Step-free access", "Accessible restroom", "Quiet seating"],
        description: "A calm public library with individual desks, natural light, and flexible stay time.",
        address: "18 Garden Street",
        hours: "09:00 - 20:00",
        color: "sky"
      },
      {
        id: "place-cafe",
        name: "Common Ground Cafe",
        type: "Cafe",
        distanceKm: 1.2,
        cost: "Low cost",
        socialLoad: "Medium",
        accessibility: ["Step-free access", "Outdoor seating"],
        description: "A neighborhood cafe with a quiet morning window and tables suited to short visits.",
        address: "42 Willow Road",
        hours: "08:00 - 18:00",
        color: "clay"
      },
      {
        id: "place-park",
        name: "Riverside Pocket Park",
        type: "Park",
        distanceKm: 0.5,
        cost: "Free",
        socialLoad: "Low",
        accessibility: ["Paved paths", "Benches"],
        description: "A small open park for a short walk, a pause outdoors, or a low-pressure reset.",
        address: "Riverside Walk",
        hours: "Open all day",
        color: "leaf"
      },
      {
        id: "place-community",
        name: "Northside Community Room",
        type: "Community",
        distanceKm: 1.8,
        cost: "Free",
        socialLoad: "Medium",
        accessibility: ["Step-free access", "Quiet waiting area"],
        description: "A reviewed public venue hosting small, structured activities with clear start and end times.",
        address: "7 Northside Lane",
        hours: "10:00 - 19:00",
        color: "plum"
      }
    ],
    community: [
      {
        id: "community-reading",
        title: "Quiet reading hour",
        host: "Greenwich Library",
        dateLabel: "Thursday, 18:00",
        place: "Greenwich Library",
        capacity: "8 of 12 places",
        socialLoad: "Low",
        description: "Read alongside others for forty minutes. Conversation is optional and there is no group discussion.",
        joined: false
      },
      {
        id: "community-walk",
        title: "Slow neighborhood walk",
        host: "Northside Community Team",
        dateLabel: "Saturday, 10:30",
        place: "Riverside Pocket Park",
        capacity: "5 of 10 places",
        socialLoad: "Medium",
        description: "A reviewed, step-free thirty-minute group walk with a clear route and two pause points.",
        joined: false
      },
      {
        id: "community-create",
        title: "Open sketch table",
        host: "Common Ground Cafe",
        dateLabel: "Sunday, 14:00",
        place: "Common Ground Cafe",
        capacity: "6 of 8 places",
        socialLoad: "Low",
        description: "Bring any small creative task and work quietly at a shared table. Materials are available.",
        joined: false
      }
    ],
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

interface ReNewDatabase extends DBSchema {
  state: {
    key: "app";
    value: AppData;
  };
}

const databasePromise = openDB<ReNewDatabase>("renew-client", 1, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("state")) {
      database.createObjectStore("state");
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

function normalizeMission(
  mission: Partial<Mission>,
  recommendations: RecommendationOption[]
): Mission {
  const matchingOption = recommendations.find((option) => option.id === mission.optionId);
  const fallbackOption = matchingOption ?? recommendations[0];
  const normalizedFromOption = createMissionFromOption(fallbackOption, {
    id: mission.id,
    status: mission.status,
    selectedAt: mission.selectedAt,
    scheduledFor: mission.scheduledFor,
    startedAt: mission.startedAt,
    completedAt: mission.completedAt
  });

  if (matchingOption) {
    return normalizedFromOption;
  }

  return {
    ...normalizedFromOption,
    ...mission,
    visionId: mission.visionId ?? fallbackOption.visionId,
    routeStepId: mission.routeStepId ?? fallbackOption.routeStepId,
    variant: mission.variant ?? fallbackOption.variant,
    placeId: mission.placeId ?? fallbackOption.placeId,
    estimatedCost: mission.estimatedCost ?? fallbackOption.estimatedCost,
    format: mission.format ?? fallbackOption.format,
    supplies: mission.supplies ?? fallbackOption.supplies,
    socialMode: mission.socialMode ?? fallbackOption.socialMode,
    scheduledFor: mission.scheduledFor ?? null
  };
}

export async function loadAppData(): Promise<AppData> {
  const database = await databasePromise;
  const storedData = await database.get("state", "app");

  if (!storedData) {
    return createDefaultAppData();
  }

  const defaults = createDefaultAppData();
  const storedSettings = storedData.settings as Partial<AppData["settings"]>;
  const storedRhythm = storedSettings.checkInRhythm;
  const rhythmTime = storedRhythm?.time ?? storedSettings.checkInTime ?? defaults.settings.checkInTime;
  const rhythmEnabled = storedRhythm?.enabled ?? storedSettings.reminders ?? defaults.settings.reminders;
  const storedMissionData = storedData as AppData & {
    plannedMissions?: Partial<Mission>[];
    missionHistory?: Partial<Mission>[];
  };

  return {
    ...defaults,
    ...storedData,
    profile: { ...defaults.profile, ...storedData.profile },
    preferences: { ...defaults.preferences, ...storedData.preferences },
    vision: { ...defaults.vision, ...storedData.vision },
    recommendations: defaults.recommendations,
    mission: storedData.mission ? normalizeMission(storedData.mission, defaults.recommendations) : null,
    plannedMissions: (storedMissionData.plannedMissions ?? []).map((mission) =>
      normalizeMission(mission, defaults.recommendations)
    ),
    missionHistory: (storedMissionData.missionHistory ?? []).map((mission) =>
      normalizeMission(mission, defaults.recommendations)
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
  await database.put("state", data, "app");
}

export async function clearAppData(): Promise<void> {
  const database = await databasePromise;
  await database.delete("state", "app");
}
