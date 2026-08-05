import { describe, expect, it } from "vitest";
import { createDefaultAppData, createMissionFromOption, type AppData, type RecommendationOption } from "./appData";
import { buildMissionsByDay, toCalendarEntries } from "./missionCalendar";
import { toDateKey } from "./dates";

const option: RecommendationOption = {
  id: "template-1",
  visionId: "vision-1",
  variant: "recommended",
  title: "Study at a cafe for 20 minutes",
  description: "About 20 minutes.",
  durationMinutes: 20,
  placeType: "Cafe",
  placeId: "place-dmc-cafe-street",
  estimatedCost: "Low cost",
  format: "In person",
  supplies: ["A notebook"],
  socialMode: "Solo"
};

function appDataWith(partial: Partial<AppData>): AppData {
  return {
    ...createDefaultAppData(),
    places: [
      {
        id: "place-dmc-cafe-street",
        name: "DMC Cafe Street",
        type: "Cafe",
        distanceKm: 1,
        cost: "Low cost",
        socialLoad: "Low",
        accessibility: [],
        description: "",
        address: "",
        hours: "",
        color: "clay",
        mission: null,
        imageUrl: null
      }
    ],
    ...partial
  };
}

describe("buildMissionsByDay", () => {
  it("puts a planned Mission on the day it is scheduled for", () => {
    const scheduledFor = "2026-08-08T01:00:00.000Z";
    const data = appDataWith({
      plannedMissions: [createMissionFromOption(option, { id: "m1", status: "planned", scheduledFor })]
    });
    const byDay = buildMissionsByDay(data);
    const key = toDateKey(new Date(scheduledFor));
    expect(byDay.get(key)?.[0]?.kind).toBe("planned");
  });

  it("puts a finished Mission on the day it was finished, not chosen", () => {
    // Someone picks an action at 11pm and does it the next morning. Filing
    // it under the day it was chosen would show effort on a day when
    // nothing happened.
    const data = appDataWith({
      missionHistory: [
        createMissionFromOption(option, {
          id: "m2",
          status: "completed",
          selectedAt: "2026-08-06T14:00:00.000Z",
          completedAt: "2026-08-07T01:00:00.000Z"
        })
      ]
    });
    const byDay = buildMissionsByDay(data);
    expect(byDay.get(toDateKey(new Date("2026-08-07T01:00:00.000Z")))?.[0]?.kind).toBe("done");
    expect(byDay.has(toDateKey(new Date("2026-08-06T14:00:00.000Z")))).toBe(false);
  });

  it("uses the local calendar day, not the UTC one", () => {
    // The bug this guards: iso.slice(0, 10) is the UTC day, so for anyone
    // east of Greenwich an evening plan lands on the square before it.
    const evening = new Date(2026, 7, 8, 22, 30);
    const data = appDataWith({
      plannedMissions: [
        createMissionFromOption(option, { id: "m3", status: "planned", scheduledFor: evening.toISOString() })
      ]
    });
    const byDay = buildMissionsByDay(data);
    expect([...byDay.keys()]).toEqual(["2026-08-08"]);
  });

  it("keeps the live Mission's status when history holds a stale copy", () => {
    const live = createMissionFromOption(option, { id: "same", status: "in_progress", scheduledFor: "2026-08-08T01:00:00.000Z" });
    const stale = createMissionFromOption(option, { id: "same", status: "planned", scheduledFor: "2026-08-08T01:00:00.000Z" });
    const byDay = buildMissionsByDay(appDataWith({ mission: live, missionHistory: [stale] }));
    const entries = [...byDay.values()].flat();
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("in_progress");
  });

  it("resolves the place name so the calendar can show where", () => {
    const data = appDataWith({
      plannedMissions: [
        createMissionFromOption(option, { id: "m4", status: "planned", scheduledFor: "2026-08-08T01:00:00.000Z" })
      ]
    });
    const entry = [...buildMissionsByDay(data).values()].flat()[0];
    expect(entry.placeName).toBe("DMC Cafe Street");
  });

  it("skips a Mission with no moment rather than throwing", () => {
    const orphan = createMissionFromOption(option, { id: "m5", status: "planned" });
    const byDay = buildMissionsByDay(appDataWith({ plannedMissions: [{ ...orphan, selectedAt: "", scheduledFor: null }] }));
    expect([...byDay.values()].flat()).toHaveLength(0);
  });
});

describe("toCalendarEntries", () => {
  const data = appDataWith({
    plannedMissions: [
      createMissionFromOption(option, { id: "planned", status: "planned", scheduledFor: "2026-08-08T01:00:00.000Z" })
    ],
    missionHistory: [
      createMissionFromOption(option, {
        id: "done",
        status: "completed",
        completedAt: "2026-08-06T01:00:00.000Z"
      })
    ]
  });
  const all = [...buildMissionsByDay(data).values()].flat();

  it("exports only what is still ahead", () => {
    // Handing somebody a month of finished Missions would fill their
    // calendar with things they have already done.
    const entries = toCalendarEntries(all);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("planned");
  });

  it("carries the place and the supplies into the entry", () => {
    const entry = toCalendarEntries(all)[0];
    expect(entry.location).toBe("DMC Cafe Street");
    expect(entry.description).toContain("A notebook");
    expect(entry.durationMinutes).toBe(20);
  });
});
