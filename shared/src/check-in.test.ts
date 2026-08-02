import { describe, expect, it } from "vitest";
import { checkInInputSchema, toStateVector } from "./check-in.js";

describe("checkInInputSchema", () => {
  it("keeps unavailable quick-check values as null", () => {
    const checkIn = checkInInputSchema.parse({
      type: "quick",
      localId: "local-check-in-1",
      capturedAt: "2026-08-02T09:00:00+09:00",
      mood: 2,
      energy: 1,
      functionalCapacity: 2
    });

    expect(toStateVector(checkIn)).toEqual({
      mood: 2,
      energy: 1,
      stress: null,
      sleepQuality: null,
      loneliness: null,
      socialLoad: null,
      initiationDifficulty: null,
      functionalCapacity: 2,
      craving: null
    });
  });

  it("rejects scores outside the zero-to-four range", () => {
    const result = checkInInputSchema.safeParse({
      type: "quick",
      localId: "local-check-in-2",
      capturedAt: "2026-08-02T09:00:00+09:00",
      mood: 5,
      energy: 1,
      functionalCapacity: 2
    });

    expect(result.success).toBe(false);
  });
});
