import type { Place } from "@renew/shared";

/**
 * Reviewed places only — never AI-generated. costLevel is the same 0-4
 * ordinal scale used by ActionTemplate.costLevel.
 */
export const placeSeeds: Omit<Place, "isPartner">[] = [
  {
    id: "place-riverside-library",
    name: "Riverside Quiet Library",
    category: "library",
    addressRegion: "Riverside District",
    distanceBucket: "near",
    hours: "09:00 - 20:00",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "low",
    accessibility: "wheelchair accessible, elevator available",
    verifiedAt: "2026-06-15",
    notes: "Quiet study floor on level 2. No membership required for day visits."
  },
  {
    id: "place-maple-cafe",
    name: "Maple Street Cafe",
    category: "cafe",
    addressRegion: "Maple Street",
    distanceBucket: "near",
    hours: "07:00 - 22:00",
    costLevel: 1,
    crowdLevel: "medium",
    socialLevel: "low",
    accessibility: "step-free entrance",
    verifiedAt: "2026-05-20",
    notes: "Window seats good for solo studying. Gets busy 12:00-14:00."
  },
  {
    id: "place-downtown-park",
    name: "Downtown Green Park",
    category: "park",
    addressRegion: "Downtown",
    distanceBucket: "near",
    hours: "24 hours",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "none",
    accessibility: "paved paths, benches throughout",
    verifiedAt: "2026-06-01",
    notes: "Benches near the east entrance are usually free."
  },
  {
    id: "place-eastside-trail",
    name: "Eastside Walking Trail",
    category: "trail",
    addressRegion: "Eastside",
    distanceBucket: "medium",
    hours: "06:00 - 21:00",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "none",
    accessibility: "flat gravel path",
    verifiedAt: "2026-04-18",
    notes: "Loop is about 1.2km, good for a short walk."
  },
  {
    id: "place-harbor-studyroom",
    name: "Harbor District Study Room",
    category: "study_room",
    addressRegion: "Harbor District",
    distanceBucket: "medium",
    hours: "10:00 - 22:00",
    costLevel: 2,
    crowdLevel: "medium",
    socialLevel: "medium",
    accessibility: "elevator access",
    verifiedAt: "2026-05-02",
    notes: "Pay-per-hour shared study space, quiet zone available."
  },
  {
    id: "place-arts-district-studio",
    name: "Arts District Community Studio",
    category: "studio",
    addressRegion: "Arts District",
    distanceBucket: "medium",
    hours: "10:00 - 18:00",
    costLevel: 1,
    crowdLevel: "low",
    socialLevel: "medium",
    accessibility: "ground floor, step-free",
    verifiedAt: "2026-03-30",
    notes: "Drop-in creative space, drawing and craft materials on site."
  },
  {
    id: "place-willow-community-center",
    name: "Willow Creek Community Center",
    category: "community_center",
    addressRegion: "Willow Creek",
    distanceBucket: "far",
    hours: "09:00 - 18:00",
    costLevel: 0,
    crowdLevel: "medium",
    socialLevel: "high",
    accessibility: "wheelchair accessible",
    verifiedAt: "2026-02-10",
    notes: "Hosts small group programs; front desk can point to today's activities."
  },
  {
    id: "place-midtown-gym",
    name: "Midtown Public Gym",
    category: "gym",
    addressRegion: "Midtown",
    distanceBucket: "medium",
    hours: "06:00 - 22:00",
    costLevel: 1,
    crowdLevel: "medium",
    socialLevel: "low",
    accessibility: "step-free entrance, accessible changing room",
    verifiedAt: "2026-05-11",
    notes: "Public facility, day passes available at front desk."
  }
];
