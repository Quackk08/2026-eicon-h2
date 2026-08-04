import { describe, expect, it } from "vitest";
import { coarsenCoordinate, isSafeNearbySuggestion, isSafePlaceTip } from "./nearby.js";

describe("coarsenCoordinate", () => {
  it("rounds to roughly a kilometre so an exact position never leaves the device", () => {
    expect(coarsenCoordinate(37.566826)).toBe(37.57);
    expect(coarsenCoordinate(126.978656)).toBe(126.98);
    expect(coarsenCoordinate(-33.868821)).toBe(-33.87);
  });
});

describe("isSafePlaceTip", () => {
  it("allows a tip that describes the thing", () => {
    const allowed = [
      "Order a warm drink and take the seat by the window.",
      "Head for the travel writing shelf near the back.",
      "The benches on the north side stay shaded in the afternoon.",
      "A pot of tea costs about the same as a coffee and lasts longer."
    ];
    for (const tip of allowed) {
      expect(isSafePlaceTip(tip), tip).toBe(true);
    }
  });

  it("rejects a tip that claims an effect on the person", () => {
    const blocked = [
      "Chamomile tea will calm your anxiety.",
      "A green tea is good for focus and helps stress.",
      "Because you seem tired, order something with caffeine.",
      "Your mood suggests a decaf today.",
      "This blend reduces anxiety over time."
    ];
    for (const tip of blocked) {
      expect(isSafePlaceTip(tip), tip).toBe(false);
    }
  });

  it("rejects substances the product never suggests", () => {
    expect(isSafePlaceTip("Order a glass of wine and relax at the bar.")).toBe(false);
    expect(isSafePlaceTip("Pick up a supplement and take two pills with water.")).toBe(false);
  });
});

describe("isSafeNearbySuggestion", () => {
  const base = {
    name: "Riverside Library",
    category: "library",
    approxWalkMinutes: 8,
    arrivalTip: null as string | null
  };

  it("allows a venue described by its setting", () => {
    expect(
      isSafeNearbySuggestion({ ...base, whyItSuitsTheAction: "Quiet upper floor with single desks." })
    ).toBe(true);
  });

  it("rejects a venue whose description drifts into clinical wording", () => {
    expect(
      isSafeNearbySuggestion({ ...base, whyItSuitsTheAction: "Staff can refer you to a therapist." })
    ).toBe(false);
  });

  it("holds the arrival tip to the tip rules, not just the wordlist", () => {
    const suits = "Quiet upper floor with single desks.";
    expect(
      isSafeNearbySuggestion({ ...base, whyItSuitsTheAction: suits, arrivalTip: "Start at the short-story shelf by the window." })
    ).toBe(true);
    expect(
      isSafeNearbySuggestion({ ...base, whyItSuitsTheAction: suits, arrivalTip: "A herbal tea here will calm your anxiety." })
    ).toBe(false);
    expect(
      isSafeNearbySuggestion({ ...base, whyItSuitsTheAction: suits, arrivalTip: "Since you seem low on energy, grab a coffee." })
    ).toBe(false);
  });
});
