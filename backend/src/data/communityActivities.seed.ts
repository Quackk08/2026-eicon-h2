import type { CommunityActivity } from "@renew/shared";

/**
 * Reviewed Community Steps only — small, structured, low-pressure shared
 * actions, not an open social feed. socialLoad mirrors the same 0-4 scale
 * used elsewhere: 0-1 = "being present together" without conversation,
 * up to 3-4 = taking on a role or organizing. Copy is written in the app's
 * UI language (English).
 *
 * `location` must name a place from places.seed.ts exactly. The client links
 * an activity to its venue by that name, so an invented one silently costs
 * the venue photograph and the "View venue details" link — which is what
 * these were doing: they still carried placeholder venues from before the
 * place list was localised to Sangam-dong.
 */
export const communityActivitySeeds: CommunityActivity[] = [
  {
    id: "community-silent-cofocus-online",
    title: "Silent online focus block",
    domain: "study_school",
    startsAt: null,
    isOnline: true,
    location: null,
    durationMinutes: 25,
    socialLoad: 1,
    maxParticipants: 12,
    requiredItems: null
  },
  {
    id: "community-library-silent-study",
    title: "Library silent study",
    domain: "study_school",
    startsAt: null,
    isOnline: false,
    location: "Mapo Central Library",
    durationMinutes: 40,
    socialLoad: 1,
    maxParticipants: 8,
    requiredItems: "A notebook or a book"
  },
  {
    id: "community-short-park-walk",
    title: "Short neighborhood walk",
    domain: "movement_health",
    startsAt: null,
    isOnline: false,
    location: "World Cup Park (Peace Park)",
    durationMinutes: 10,
    socialLoad: 2,
    maxParticipants: 6,
    requiredItems: null
  },
  {
    id: "community-cafe-parallel-study",
    title: "Study side by side at a cafe",
    domain: "study_school",
    startsAt: null,
    isOnline: false,
    location: "DMC Cafe Street",
    durationMinutes: 30,
    socialLoad: 2,
    maxParticipants: 6,
    requiredItems: "Money for a drink"
  },
  {
    id: "community-weekly-planning",
    title: "Sunday evening weekly planning",
    domain: "daily_independence",
    startsAt: null,
    isOnline: true,
    location: null,
    durationMinutes: 20,
    socialLoad: 2,
    maxParticipants: 10,
    requiredItems: null
  },
  {
    id: "community-studio-dropin",
    title: "Drop-in sketch and craft table",
    domain: "creativity",
    startsAt: null,
    isOnline: false,
    location: "Oil Tank Culture Park",
    durationMinutes: 45,
    socialLoad: 3,
    maxParticipants: 8,
    requiredItems: null
  }
];
