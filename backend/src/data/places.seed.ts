import type { Place } from "@renew/shared";

/**
 * Reviewed places only — never AI-generated. costLevel is the same 0-4
 * ordinal scale used by ActionTemplate.costLevel.
 *
 * These are real public places around Stanford Hotel Seoul in Sangam-dong,
 * Mapo-gu, so a demo points at somewhere a person could actually walk to.
 * Distances are from the hotel; opening hours are the published ones and
 * should be re-checked before real use, since public facilities change them
 * seasonally.
 */
export const placeSeeds: Omit<Place, "isPartner">[] = [
  {
    id: "place-mapo-central-library",
    name: "Mapo Central Library",
    category: "library",
    addressRegion: "Seongsan-dong, Mapo-gu",
    distanceBucket: "medium",
    hours: "09:00 - 20:00 (closed Mondays)",
    costLevel: 0,
    crowdLevel: "medium",
    socialLevel: "low",
    accessibility: "step-free entrance, elevator available, accessible toilets",
    verifiedAt: "2026-08-04",
    notes: "Large public library with open reading floors. No membership needed to sit and read."
  },
  {
    id: "place-worldcup-peace-park",
    name: "World Cup Park (Peace Park)",
    category: "park",
    addressRegion: "Sangam-dong, Mapo-gu",
    distanceBucket: "near",
    hours: "Open all day",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "none",
    accessibility: "paved paths, benches throughout, step-free",
    verifiedAt: "2026-08-04",
    notes: "Flat paved loops and plenty of benches, quietest on weekday mornings."
  },
  {
    id: "place-haneul-park",
    name: "Haneul Park",
    category: "park",
    addressRegion: "Sangam-dong, Mapo-gu",
    distanceBucket: "near",
    hours: "Sunrise - sunset",
    costLevel: 0,
    crowdLevel: "medium",
    socialLevel: "none",
    accessibility: "long stair climb, shuttle available for a small fee",
    verifiedAt: "2026-08-04",
    notes: "Grass field on top of a hill. The climb is real — the shuttle exists for days when it is not."
  },
  {
    id: "place-oil-tank-culture-park",
    name: "Oil Tank Culture Park",
    category: "community_center",
    addressRegion: "Seongsan-dong, Mapo-gu",
    distanceBucket: "near",
    hours: "10:00 - 18:00 (closed Mondays)",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "low",
    accessibility: "step-free routes between tanks, gravel in places",
    verifiedAt: "2026-08-04",
    notes: "Repurposed fuel tanks with indoor halls and outdoor seating. Free to enter and rarely crowded on weekdays."
  },
  {
    id: "place-nanji-hangang-park",
    name: "Nanji Hangang Park",
    category: "trail",
    addressRegion: "Sangam-dong, Mapo-gu",
    distanceBucket: "medium",
    hours: "Open all day",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "none",
    accessibility: "flat riverside path, step-free from the pedestrian bridge",
    verifiedAt: "2026-08-04",
    notes: "Riverside path along the Han. Long and flat, so any distance works as a turning point."
  },
  {
    id: "place-dmc-cafe-street",
    name: "DMC Cafe Street",
    category: "cafe",
    addressRegion: "Sangam-dong, Mapo-gu",
    distanceBucket: "near",
    hours: "Most open 08:00 - 22:00",
    costLevel: 1,
    crowdLevel: "medium",
    socialLevel: "low",
    accessibility: "street level, most cafes step-free",
    verifiedAt: "2026-08-04",
    // Named as a street rather than one business on purpose: individual
    // cafes open and close, and sending someone to a shuttered storefront
    // is worse than pointing at the row it stands on.
    notes: "The row of cafes under the DMC office towers. Quiet between 14:00 and 17:00, once the lunch crowd clears."
  },
  {
    id: "place-worldcup-stadium-concourse",
    name: "Seoul World Cup Stadium Concourse",
    category: "gym",
    addressRegion: "Sangam-dong, Mapo-gu",
    distanceBucket: "near",
    hours: "06:00 - 22:00 on non-match days",
    costLevel: 0,
    crowdLevel: "low",
    socialLevel: "low",
    accessibility: "step-free concourse, elevators inside",
    verifiedAt: "2026-08-04",
    notes: "The outer walkway is open and sheltered on non-match days. Useful when weather rules out the parks."
  }
];

/**
 * One small, concrete thing to do at each place — written for this seed
 * data, not generated. Keyed by place id, so a place without one simply
 * shows no mission.
 *
 * Each describes the place and the action only, never an effect on the
 * person, and each is sized so arriving and leaving again already counts.
 */
export const placeMissions: Record<string, string> = {
  "place-mapo-central-library":
    "Go up to a reading floor, take one book off the new-arrivals shelf, and read a single page before deciding whether to stay.",
  "place-worldcup-peace-park":
    "Walk to the first bench you see and sit for five minutes. The full loop is there if you want it.",
  "place-haneul-park":
    "Take the shuttle up, stand at the edge of the field for a few minutes, and come back down. The stairs can wait.",
  "place-oil-tank-culture-park":
    "Walk through one tank hall and out again. Seeing the inside of one is a complete visit.",
  "place-nanji-hangang-park":
    "Follow the riverside path to the first bridge pillar, then turn around there.",
  "place-dmc-cafe-street":
    "Order the smallest drink on the menu, take a seat facing the window, and stay ten minutes.",
  "place-worldcup-stadium-concourse":
    "Walk one side of the outer concourse at your own pace, then stop."
};
