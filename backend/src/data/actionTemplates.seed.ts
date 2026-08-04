import type { ActionTemplate } from "@renew/shared";

/** Every domain, so the orienting ladder matches whichever one was picked. */
const ALL_DOMAINS = ["study_school", "sleep_energy", "relationships", "movement_health", "creativity", "daily_independence", "community_participation", "stress_recovery"] as ActionTemplate["goalDomains"];

/**
 * Reviewed Activity Ladder seed data. AI never invents entries here — it
 * can only select among them (docs/IMPLEMENTATION_PLAN.md section 7).
 * Copy is written in the app's UI language (English).
 */
export const actionTemplateSeeds: ActionTemplate[] = [
  // Study & School ladder
  {
    id: "study-notebook-prep",
    goalDomains: ["study_school"],
    title: "Put one notebook and pen in your bag",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 5],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "study-home-desk",
    goalDomains: ["study_school"],
    title: "Study for five minutes at your desk",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 10],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "study-cafe-entrance",
    goalDomains: ["study_school"],
    title: "Walk to a nearby cafe entrance and back",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 15],
    costLevel: 0,
    placeTypes: ["cafe", "library"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "study-cafe-short-stay",
    goalDomains: ["study_school"],
    title: "Open your notebook at a cafe and stay ten minutes",
    minCapacity: 2,
    maxSocialLoad: 1,
    durationRange: [10, 20],
    costLevel: 1,
    placeTypes: ["cafe", "library"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 4,
    safetyTags: []
  },
  {
    id: "study-cafe-full-session",
    goalDomains: ["study_school"],
    title: "Study for twenty minutes at a cafe or library",
    minCapacity: 3,
    maxSocialLoad: 1,
    durationRange: [20, 40],
    costLevel: 1,
    placeTypes: ["cafe", "library"],
    indoorOutdoor: "indoor",
    ladderGroupId: "study-outside-room",
    ladderLevel: 5,
    safetyTags: []
  },

  // Movement & outing ladder
  {
    id: "movement-window",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "Open a window and take in the outside air",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 5],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "movement-doorstep-walk",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "Take a five-minute walk outside your door",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 10],
    costLevel: 0,
    placeTypes: ["street"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "movement-park-visit",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "Sit on a nearby park bench for ten minutes",
    minCapacity: 1,
    maxSocialLoad: 1,
    durationRange: [10, 20],
    costLevel: 0,
    placeTypes: ["park"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "movement-park-walk",
    goalDomains: ["movement_health", "stress_recovery"],
    title: "Walk in the park for fifteen minutes",
    minCapacity: 2,
    maxSocialLoad: 1,
    durationRange: [15, 30],
    costLevel: 0,
    placeTypes: ["park", "trail"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-outing",
    ladderLevel: 4,
    safetyTags: []
  },

  // Relationships / social ladder
  {
    id: "social-message",
    goalDomains: ["relationships"],
    title: "Send one short message to a friend",
    minCapacity: 0,
    maxSocialLoad: 1,
    durationRange: [1, 5],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "social-same-space",
    goalDomains: ["relationships"],
    title: "Spend time in the same room as family",
    minCapacity: 1,
    maxSocialLoad: 1,
    durationRange: [10, 30],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "social-online-cofocus",
    goalDomains: ["relationships", "study_school"],
    title: "Join a quiet online focus room",
    minCapacity: 1,
    maxSocialLoad: 1,
    durationRange: [15, 30],
    costLevel: 0,
    placeTypes: ["online"],
    indoorOutdoor: "indoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "social-short-walk-with-friend",
    goalDomains: ["relationships", "movement_health"],
    title: "Take a short walk with a friend",
    minCapacity: 2,
    maxSocialLoad: 2,
    durationRange: [15, 30],
    costLevel: 0,
    placeTypes: ["park", "street"],
    indoorOutdoor: "outdoor",
    ladderGroupId: "gentle-connection",
    ladderLevel: 4,
    safetyTags: []
  },

  // Daily independence / life-recovery ladder
  {
    id: "life-water",
    goalDomains: ["daily_independence", "sleep_energy"],
    title: "Drink one glass of water",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 3],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "daily-recovery",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "life-tidy-desk",
    goalDomains: ["daily_independence"],
    title: "Tidy your desk for five minutes",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [5, 10],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "daily-recovery",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "life-simple-meal",
    goalDomains: ["daily_independence", "sleep_energy"],
    title: "Prepare and eat one simple meal",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [10, 20],
    costLevel: 1,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "daily-recovery",
    ladderLevel: 3,
    safetyTags: []
  },

  /*
   * Orienting ladder — for a Vision that names no direction yet.
   *
   * "I don't know what I want" is a real answer, and borrowing a goal-shaped
   * ladder from whichever domain was selected would push someone toward
   * something they never said they wanted. These steps look for a direction
   * instead of pursuing one: notice, rule out, sample, observe, try. They
   * carry every domain so whichever one was picked still matches.
   */
  {
    id: "orient-notice-one-thing",
    goalDomains: ALL_DOMAINS,
    title: "Write down one thing today that you did not mind doing",
    minCapacity: 0,
    maxSocialLoad: 0,
    durationRange: [1, 3],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "orienting-start",
    ladderLevel: 1,
    safetyTags: []
  },
  {
    id: "orient-rule-something-out",
    goalDomains: ALL_DOMAINS,
    title: "List two things you would rather not spend a whole day on",
    minCapacity: 1,
    maxSocialLoad: 0,
    durationRange: [3, 8],
    costLevel: 0,
    placeTypes: ["home"],
    indoorOutdoor: "indoor",
    ladderGroupId: "orienting-start",
    ladderLevel: 2,
    safetyTags: []
  },
  {
    id: "orient-sample-a-curiosity",
    goalDomains: ALL_DOMAINS,
    title: "Spend ten minutes on something you were curious about, without deciding whether it matters",
    minCapacity: 2,
    maxSocialLoad: 0,
    durationRange: [5, 12],
    costLevel: 0,
    placeTypes: ["home", "online"],
    indoorOutdoor: "indoor",
    ladderGroupId: "orienting-start",
    ladderLevel: 3,
    safetyTags: []
  },
  {
    id: "orient-watch-in-public",
    goalDomains: ALL_DOMAINS,
    title: "Sit somewhere public for fifteen minutes and notice what people are doing",
    minCapacity: 2,
    maxSocialLoad: 1,
    durationRange: [10, 18],
    costLevel: 0,
    placeTypes: ["park", "library", "cafe"],
    indoorOutdoor: "either",
    ladderGroupId: "orienting-start",
    ladderLevel: 4,
    safetyTags: []
  },
  {
    id: "orient-try-something-once",
    goalDomains: ALL_DOMAINS,
    title: "Try one thing you have never tried, small enough to walk away from",
    minCapacity: 3,
    maxSocialLoad: 1,
    durationRange: [15, 25],
    costLevel: 1,
    placeTypes: ["park", "library", "cafe", "community_center"],
    indoorOutdoor: "either",
    ladderGroupId: "orienting-start",
    ladderLevel: 5,
    safetyTags: []
  }
];
