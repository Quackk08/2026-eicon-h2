import { describe, expect, it } from "vitest";
import { isSafeLadderStepTitle } from "./ladder.js";

describe("isSafeLadderStepTitle", () => {
  it("blocks medical, substance, and self-harm wording", () => {
    const blocked = [
      "Take your medication before breakfast",
      "Adjust the dosage with breakfast",
      "Take two pills after eating",
      "Book a therapy session this week",
      "Ask a therapist for a diagnosis",
      "Stop taking your prescription",
      "Have a glass of wine to relax",
      "Try fasting for a day",
      "Skip meals until dinner"
    ];
    for (const title of blocked) {
      expect(isSafeLadderStepTitle(title), title).toBe(false);
    }
  });

  it("allows ordinary words that merely contain a blocked word", () => {
    // "pillow" and "pillar" start with "pill". Rejecting them silently threw
    // away otherwise good ladders, which is why the boundary matters.
    const allowed = [
      "Put the sketchbook and a pencil on the pillow",
      "Rest your head on a pillow for five minutes",
      "Photograph a pillar on your street",
      "Pilot a small project this week",
      "Smoked paprika goes in at the end",
      "Pull the weeds along the front path"
    ];
    for (const title of allowed) {
      expect(isSafeLadderStepTitle(title), title).toBe(true);
    }
  });
});
