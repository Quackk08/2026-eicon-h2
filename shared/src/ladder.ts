import { z } from "zod";

/**
 * A step the model proposes for someone's Life Vision. Deliberately narrow:
 * every field is bounded, so a generated ladder can still be filtered by the
 * same capacity/cost/social rules that reviewed steps go through.
 */
export const generatedLadderStepSchema = z.object({
  title: z.string().min(3).max(120),
  ladderLevel: z.number().int().min(1).max(5),
  estMinutes: z.number().int().min(1).max(120),
  minCapacity: z.number().int().min(0).max(4),
  maxSocialLoad: z.number().int().min(0).max(4),
  costLevel: z.number().int().min(0).max(4),
  placeTypes: z.array(z.string().min(1).max(40)).max(4),
  indoorOutdoor: z.enum(["indoor", "outdoor", "either"])
});

export const generatedLadderSchema = z.object({
  contractVersion: z.literal(1),
  steps: z.array(generatedLadderStepSchema).min(3).max(6)
});

export type GeneratedLadderStep = z.infer<typeof generatedLadderStepSchema>;
export type GeneratedLadder = z.infer<typeof generatedLadderSchema>;

/**
 * Wording that must never reach a user from a generated step. ReNew is a
 * lifestyle product, not a clinical one, and a generated action is not a
 * reviewed one — anything advising treatment, substances, fasting, or
 * self-harm is rejected outright rather than shown and corrected later.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(medicat|medicine|pill|dose|dosage|prescri|antidepress|therapy session|therapist|diagnos|psychiatr)/i,
  /\b(self[- ]?harm|suicid|hurt yourself|cut yourself)\b/i,
  /\b(fast(ing)?\s+for|skip (meals|eating)|starv|purge|laxative)\b/i,
  /\b(alcohol|drink(ing)? (beer|wine|liquor)|drug|weed|cannabis|smoke|cigarette|vape)\b/i,
  /\b(stop taking|quit taking|off your meds)\b/i
];

export function isSafeLadderStepTitle(title: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(title));
}

/**
 * A ladder is only usable if it climbs: each level must be at least as
 * demanding as the one below it, or "make it smaller" has no meaning.
 */
export function isCoherentLadder(steps: GeneratedLadderStep[]): boolean {
  const ordered = [...steps].sort((a, b) => a.ladderLevel - b.ladderLevel);

  const levels = ordered.map((step) => step.ladderLevel);
  if (new Set(levels).size !== levels.length) return false;

  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].minCapacity < ordered[i - 1].minCapacity) return false;
    if (ordered[i].estMinutes < ordered[i - 1].estMinutes) return false;
  }
  return true;
}
