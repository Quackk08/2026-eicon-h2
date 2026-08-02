import { describe, expect, it } from "vitest";
import {
  hasOnlyKnownTemplateIds,
  recommendationResultSchema
} from "./recommendation.js";

const baseResult = {
  contractVersion: 1 as const,
  selectedTemplateId: "study-cafe-10",
  summary: "A short action was selected for the current conditions.",
  userFacingReason: "This keeps the long-term goal while reducing today's load.",
  smallerOptionTemplateId: "walk-to-cafe-entrance",
  extensionOptionTemplateId: null,
  warnings: []
};

describe("recommendation result validation", () => {
  it("accepts only IDs from the server-approved candidate set", () => {
    const result = recommendationResultSchema.parse(baseResult);
    const candidateIds = new Set(["study-cafe-10", "walk-to-cafe-entrance"]);

    expect(hasOnlyKnownTemplateIds(result, candidateIds)).toBe(true);
  });

  it("rejects an AI-selected template outside the candidate set", () => {
    const result = recommendationResultSchema.parse({
      ...baseResult,
      selectedTemplateId: "unreviewed-action"
    });
    const candidateIds = new Set(["study-cafe-10", "walk-to-cafe-entrance"]);

    expect(hasOnlyKnownTemplateIds(result, candidateIds)).toBe(false);
  });
});
