import { describe, expect, it } from "vitest";
import {
  LONG_TERM_MAX_DAYS,
  LONG_TERM_MIN_DAYS,
  planLongTermMission,
  summariseProgress
} from "./long-term.js";

const CADENCES = [1, 2, 3, 5, 7];
const LADDERS = [1, 3, 5, 6, 8];

describe("planLongTermMission", () => {
  it("always lands inside the one-to-two month promise", () => {
    for (const sessionsPerWeek of CADENCES) {
      for (const ladderSteps of LADDERS) {
        const { horizonDays } = planLongTermMission({ sessionsPerWeek, ladderSteps });
        expect(horizonDays, `${sessionsPerWeek}/wk × ${ladderSteps} steps`).toBeGreaterThanOrEqual(
          LONG_TERM_MIN_DAYS
        );
        expect(horizonDays).toBeLessThanOrEqual(LONG_TERM_MAX_DAYS);
      }
    }
  });

  it("never sets a target that cannot fit in the horizon it just set", () => {
    // The failure this guards against: clamping a long plan down to 60 days
    // while keeping the target it needed 20 weeks for, handing someone a
    // goal that was already impossible on the day it was written.
    for (const sessionsPerWeek of CADENCES) {
      for (const ladderSteps of LADDERS) {
        const { horizonDays, targetCount } = planLongTermMission({ sessionsPerWeek, ladderSteps });
        const sessionsAvailable = Math.floor((horizonDays / 7) * sessionsPerWeek);
        // The one exception is a ladder taller than the cadence allows: a
        // goal has to reach the top of the Route at least once to be worth
        // naming, so the ladder height is the floor.
        expect(targetCount, `${sessionsPerWeek}/wk × ${ladderSteps} steps`).toBeLessThanOrEqual(
          Math.max(sessionsAvailable, ladderSteps)
        );
      }
    }
  });

  it("always asks for at least one pass through every step of the Route", () => {
    for (const sessionsPerWeek of CADENCES) {
      for (const ladderSteps of LADDERS) {
        const { targetCount } = planLongTermMission({ sessionsPerWeek, ladderSteps });
        expect(targetCount).toBeGreaterThanOrEqual(ladderSteps);
      }
    }
  });

  it("gives a rare cadence more weeks than a daily one", () => {
    const weekly = planLongTermMission({ sessionsPerWeek: 1, ladderSteps: 5 });
    const daily = planLongTermMission({ sessionsPerWeek: 7, ladderSteps: 5 });
    expect(weekly.horizonDays).toBeGreaterThan(daily.horizonDays);
    expect(weekly.targetCount).toBeLessThan(daily.targetCount);
  });

  it("survives nonsense input rather than producing a nonsense plan", () => {
    const zero = planLongTermMission({ sessionsPerWeek: 0, ladderSteps: 0 });
    expect(zero.horizonDays).toBeGreaterThanOrEqual(LONG_TERM_MIN_DAYS);
    expect(zero.targetCount).toBeGreaterThan(0);

    const absurd = planLongTermMission({ sessionsPerWeek: 99, ladderSteps: 5 });
    expect(absurd.horizonDays).toBeLessThanOrEqual(LONG_TERM_MAX_DAYS);
  });

  it("explains itself in terms a person could check", () => {
    const { rationale, targetCount } = planLongTermMission({ sessionsPerWeek: 5, ladderSteps: 5 });
    expect(rationale).toContain(String(targetCount));
    expect(rationale).toContain("5 steps");
  });
});

describe("summariseProgress", () => {
  it("caps a finished goal at whole rather than overflowing", () => {
    const { ratio, targetMet } = summariseProgress(20, 27, "2026-09-01", "2026-08-05");
    expect(ratio).toBe(1);
    expect(targetMet).toBe(true);
  });

  it("counts the days left, and past the end date counts them negative", () => {
    expect(summariseProgress(20, 3, "2026-08-12", "2026-08-05").daysRemaining).toBe(7);
    expect(summariseProgress(20, 3, "2026-08-01", "2026-08-05").daysRemaining).toBe(-4);
  });

  it("treats an empty target as no progress instead of dividing by zero", () => {
    expect(summariseProgress(0, 5, "2026-09-01", "2026-08-05").ratio).toBe(0);
  });
});
