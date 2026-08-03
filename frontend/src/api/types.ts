/** Wire shapes returned by the backend, kept separate from the UI's AppData types. */

export interface ApiPreferences {
  profile_id: string;
  max_minutes: number | null;
  max_distance_meters: number | null;
  max_cost: number | null;
  social_preference: "solo" | "low" | "medium" | "high" | null;
  accessibility_needs: string[];
  updated_at: string;
}

export interface ApiProfile {
  id: string;
  locale: string;
  timezone: string;
  created_at: string;
  preferences: ApiPreferences | null;
}

export type ApiLifeDomain =
  | "study_school"
  | "sleep_energy"
  | "relationships"
  | "movement_health"
  | "creativity"
  | "daily_independence"
  | "community_participation"
  | "stress_recovery";

export interface ApiVision {
  id: string;
  profile_id: string;
  domain: ApiLifeDomain;
  summary: string;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
}

export interface ApiActionTemplate {
  id: string;
  /** "ai" steps were generated for this user and had no prior human review. */
  source?: "seed" | "ai";
  goalDomains: ApiLifeDomain[];
  title: string;
  minCapacity: number;
  maxSocialLoad: number;
  durationRange: [number, number];
  costLevel: number;
  placeTypes: string[];
  indoorOutdoor: "indoor" | "outdoor" | "either";
  ladderGroupId: string;
  ladderLevel: number;
  safetyTags: string[];
}

export interface ApiRouteStep {
  id: string;
  route_id: string;
  sequence: number;
  template_id: string;
  ladder_level: number;
  status: "pending" | "current" | "done" | "skipped";
  created_at: string;
}

export interface ApiRoute {
  id: string;
  vision_id: string;
  status: "active" | "paused";
  version: number;
  created_at: string;
  updated_at: string;
  steps: ApiRouteStep[];
}

export interface ApiCheckIn {
  id: string;
  profile_id: string;
  local_id: string;
  type: "quick" | "standard" | "weekly";
  captured_at: string;
  mood: number;
  energy: number;
  functional_capacity: number;
  stress: number | null;
  sleep_quality: number | null;
  loneliness: number | null;
  social_load: number | null;
  initiation_difficulty: number | null;
  craving: number | null;
  note: string | null;
  created_at: string;
}

export interface ApiRecommendation {
  id: string;
  profile_id: string;
  check_in_id: string | null;
  selected_template_id: string;
  smaller_template_id: string | null;
  extension_template_id: string | null;
  summary: string;
  user_facing_reason: string;
  source: "rules" | "ai";
  warnings: string[];
  created_at: string;
  stateTags: string[];
}

export type ApiMissionStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "partially_completed"
  | "not_today"
  | "cancelled";

export interface ApiMission {
  id: string;
  profile_id: string;
  recommendation_id: string | null;
  template_id: string;
  route_step_id: string | null;
  place_id: string | null;
  status: ApiMissionStatus;
  scheduled_for: string;
  created_at: string;
  updated_at: string;
  template?: ApiActionTemplate | null;
  place?: ApiPlace | null;
}

export interface ApiReflection {
  id: string;
  mission_id: string;
  profile_id: string;
  result: "completed" | "partially_completed" | "not_today";
  burden: number | null;
  social_mode: "alone" | "with_someone" | null;
  want_repeat: boolean | null;
  note: string | null;
  created_at: string;
}

export interface ApiPlace {
  id: string;
  name: string;
  category: string;
  addressRegion: string | null;
  distanceBucket: "near" | "medium" | "far" | null;
  hours: string | null;
  costLevel: number | null;
  crowdLevel: string | null;
  socialLevel: string | null;
  accessibility: string | null;
  isPartner: boolean;
  verifiedAt: string | null;
  notes: string | null;
}

export interface ApiPlaceSearchResult {
  selectedPlaceId: string;
  summary: string;
  userFacingReason: string;
  alternatePlaceIds: string[];
  warnings: string[];
  source: "rules" | "ai";
  candidates: ApiPlace[];
}

export interface ApiCommunityActivity {
  id: string;
  title: string;
  domain: string | null;
  startsAt: string | null;
  isOnline: boolean;
  location: string | null;
  durationMinutes: number | null;
  socialLoad: number | null;
  maxParticipants: number | null;
  requiredItems: string | null;
  joinedCount: number;
  isFull: boolean;
  myStatus: "joined" | "cancelled" | null;
}

export interface ApiWeeklyInsight {
  contractVersion: 1;
  summary: string;
  maintainedNote: string | null;
  adjustmentSuggestion: string | null;
  source: "rules" | "ai";
  stats: {
    windowDays: 7;
    hasEnoughData: boolean;
    checkInCount: number;
    completedCount: number;
    partiallyCompletedCount: number;
    notTodayCount: number;
    avgBurden: number | null;
    mostFrequentTemplateId: string | null;
    lowestBurdenTemplateId: string | null;
    mostPostponedTemplateId: string | null;
    communityParticipationCount: number;
    moodThisWeek: number | null;
    moodPriorWeek: number | null;
    energyThisWeek: number | null;
    energyPriorWeek: number | null;
  };
}
