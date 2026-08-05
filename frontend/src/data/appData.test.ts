import { describe, expect, it } from "vitest";
import { createMissionFromOption, type Mission, type RecommendationOption } from "./appData";

const option: RecommendationOption = {
  id: "template-1",
  visionId: "vision-1",
  variant: "recommended",
  title: "Study at a cafe for 20 minutes",
  description: "About 20 minutes.",
  durationMinutes: 20,
  placeType: "Cafe",
  // What an option carries: the template's category, and usually no place.
  placeId: null,
  estimatedCost: "Low cost",
  format: "In person",
  supplies: [],
  socialMode: "Solo"
};

const optionWithPlace: RecommendationOption = { ...option, placeId: "place-generic-cafe" };

describe("createMissionFromOption", () => {
  /*
   * The regression this file exists for.
   *
   * normalizeMission rebuilds a stored Mission from the option its template
   * came from. placeId was not carried across, so the option's value won,
   * and the reviewed place the backend had actually resolved was replaced
   * on every single load — then written back to IndexedDB, making the loss
   * permanent. It surfaced only as an exported .ics that was one LOCATION
   * line shorter offline than online.
   */
  it("keeps the place the Mission resolved, not the option's", () => {
    const mission = createMissionFromOption(optionWithPlace, {
      id: "mission-1",
      placeId: "place-mapo-central-library",
      placeType: "Library"
    });
    expect(mission.placeId).toBe("place-mapo-central-library");
    expect(mission.placeType).toBe("Library");
  });

  it("respects a Mission that deliberately has no place", () => {
    // An action made smaller until it no longer needs anywhere to be. With
    // `??` instead of an undefined check, the option's place came straight
    // back and sent someone to a cafe they had opted out of.
    const mission = createMissionFromOption(optionWithPlace, {
      id: "mission-2",
      placeId: null
    });
    expect(mission.placeId).toBeNull();
  });

  it("falls back to the option when the Mission never carried a place", () => {
    const mission = createMissionFromOption(optionWithPlace, { id: "mission-3" });
    expect(mission.placeId).toBe("place-generic-cafe");
  });

  it("carries the option's own fields through unchanged", () => {
    const mission = createMissionFromOption(option, { id: "mission-4" });
    expect(mission).toMatchObject({
      id: "mission-4",
      optionId: option.id,
      visionId: option.visionId,
      title: option.title,
      durationMinutes: option.durationMinutes,
      socialMode: option.socialMode,
      status: "planned"
    });
  });

  it("only sets startedAt and completedAt when they actually happened", () => {
    const plain = createMissionFromOption(option, { id: "m" });
    expect("startedAt" in plain).toBe(false);
    expect("completedAt" in plain).toBe(false);

    const finished = createMissionFromOption(option, {
      id: "m",
      status: "completed",
      completedAt: "2026-08-06T10:00:00.000Z"
    });
    expect(finished.completedAt).toBe("2026-08-06T10:00:00.000Z");
  });
});

describe("Mission status vocabulary", () => {
  it("uses the UI's own words, which are not the API's", () => {
    // The client says "partly"; the server says "partially_completed". The
    // mapper is the only place that knows both, and a test that asserts the
    // union here is what stops one of them drifting into the other.
    const statuses: Mission["status"][] = [
      "planned",
      "in_progress",
      "completed",
      "partly",
      "not_today"
    ];
    for (const status of statuses) {
      expect(createMissionFromOption(option, { id: "m", status }).status).toBe(status);
    }
  });
});
