import { describe, expect, it } from "vitest";
import {
  classifyAdjustment,
  describeAdjustment,
  isMissionAdjustment,
  MISSION_ADJUSTMENTS
} from "./mission-intent.js";

describe("classifyAdjustment", () => {
  it("hears a hard day as a smaller step", () => {
    for (const said of [
      "I'm exhausted",
      "today has been rough",
      "barely slept last night",
      "way too much on at work",
      "I have no energy for this",
      "not up to going out"
    ]) {
      expect(classifyAdjustment(said).adjustment, said).toBe("smaller");
    }
  });

  it("hears a good day as room for more", () => {
    for (const said of [
      "feeling good today",
      "slept well and I'm rested",
      "I have plenty of time",
      "up for something longer"
    ]) {
      expect(classifyAdjustment(said).adjustment, said).toBe("bigger");
    }
  });

  it("does not read a negated positive as a good day", () => {
    // "not great" said as-is used to match the "great" cue and offer
    // somebody a bigger step on the day they said they could not manage.
    for (const said of ["not great today", "I don't feel ready", "not feeling strong"]) {
      expect(classifyAdjustment(said).adjustment, said).not.toBe("bigger");
    }
  });

  it("keeps the step when nothing was actually said", () => {
    for (const said of ["", "   ", "ok", "hello"]) {
      const reading = classifyAdjustment(said);
      expect(reading.adjustment, said).toBe("keep");
      expect(reading.confidence).toBe("unsure");
    }
  });

  it("keeps the step when the day is described as both", () => {
    // "no time but feeling good" is genuinely ambiguous, and guessing at it
    // would be changing somebody's plan on a coin flip.
    expect(classifyAdjustment("no time but feeling good").adjustment).toBe("keep");
  });

  it("does not treat a negation elsewhere as cancelling an unrelated cue", () => {
    expect(classifyAdjustment("no time today, everything is hard").adjustment).toBe("smaller");
  });

  it("shows which words it read", () => {
    const reading = classifyAdjustment("I am exhausted and overwhelmed");
    expect(reading.matched).toContain("exhausted");
    expect(reading.confidence).toBe("clear");
  });

  it("never answers outside the closed set", () => {
    const samples = ["", "take my medication", "!!!", "🙂", "a".repeat(500), "smaller bigger keep"];
    for (const said of samples) {
      expect(MISSION_ADJUSTMENTS).toContain(classifyAdjustment(said).adjustment);
    }
  });
});

describe("isMissionAdjustment", () => {
  it("accepts only the three sanctioned answers", () => {
    expect(isMissionAdjustment("smaller")).toBe(true);
    expect(isMissionAdjustment("keep")).toBe(true);
    expect(isMissionAdjustment("bigger")).toBe(true);
    for (const bad of ["SMALLER", "skip", "delete the mission", "", null, 3, {}]) {
      expect(isMissionAdjustment(bad), String(bad)).toBe(false);
    }
  });
});

describe("describeAdjustment", () => {
  it("says what will happen for every value in the set", () => {
    for (const adjustment of MISSION_ADJUSTMENTS) {
      expect(describeAdjustment(adjustment).length).toBeGreaterThan(0);
    }
  });
});
