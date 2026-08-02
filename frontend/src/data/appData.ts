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

export interface RecommendationOption {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  placeType: string;
  effort: "Light" | "Balanced" | "Stretch";
}

export interface Mission {
  id: string;
  optionId: string;
  title: string;
  description: string;
  durationMinutes: number;
  placeType: string;
  status: "planned" | "in_progress" | "completed" | "not_today";
  selectedAt: string;
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
  reflections: Reflection[];
  savedPlaceIds: string[];
  places: Place[];
  community: CommunityActivity[];
  settings: {
    checkInTime: string;
    reminders: boolean;
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
        title: "Open your notebook at a nearby cafe",
        description: "Arrive, choose a quiet seat, and stay for ten minutes. Finishing a task is optional.",
        durationMinutes: 10,
        placeType: "Cafe",
        effort: "Balanced"
      },
      {
        id: "recommendation-light",
        title: "Pack one notebook for later",
        description: "Prepare the next step without needing to leave home today.",
        durationMinutes: 2,
        placeType: "Home",
        effort: "Light"
      },
      {
        id: "recommendation-stretch",
        title: "Study at the library for twenty minutes",
        description: "Use a familiar public space and stop after one short focus block.",
        durationMinutes: 20,
        placeType: "Library",
        effort: "Stretch"
      }
    ],
    mission: null,
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

export async function loadAppData(): Promise<AppData> {
  const database = await databasePromise;
  return (await database.get("state", "app")) ?? createDefaultAppData();
}

export async function saveAppData(data: AppData): Promise<void> {
  const database = await databasePromise;
  await database.put("state", data, "app");
}

export async function clearAppData(): Promise<void> {
  const database = await databasePromise;
  await database.delete("state", "app");
}
