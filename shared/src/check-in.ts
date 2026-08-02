import { z } from "zod";

export const stateScoreSchema = z.number().int().min(0).max(4);
export const nullableStateScoreSchema = stateScoreSchema.nullable();

export const checkInTypeSchema = z.enum(["quick", "standard", "weekly"]);

const checkInBaseSchema = z.object({
  localId: z.string().min(1).max(100),
  capturedAt: z.string().datetime({ offset: true }),
  mood: stateScoreSchema,
  energy: stateScoreSchema,
  functionalCapacity: stateScoreSchema,
  note: z.string().trim().max(2000).optional()
});

export const quickCheckInSchema = checkInBaseSchema.extend({
  type: z.literal("quick")
});

export const standardCheckInSchema = checkInBaseSchema.extend({
  type: z.literal("standard"),
  stress: stateScoreSchema,
  sleepQuality: stateScoreSchema,
  loneliness: stateScoreSchema,
  socialLoad: stateScoreSchema,
  initiationDifficulty: stateScoreSchema,
  craving: stateScoreSchema.optional()
});

export const weeklyCheckInSchema = checkInBaseSchema.extend({
  type: z.literal("weekly"),
  stress: stateScoreSchema.optional(),
  sleepQuality: stateScoreSchema.optional(),
  loneliness: stateScoreSchema.optional(),
  socialLoad: stateScoreSchema.optional(),
  initiationDifficulty: stateScoreSchema.optional(),
  craving: stateScoreSchema.optional()
});

export const checkInInputSchema = z.discriminatedUnion("type", [
  quickCheckInSchema,
  standardCheckInSchema,
  weeklyCheckInSchema
]);

export const stateVectorSchema = z.object({
  mood: nullableStateScoreSchema,
  energy: nullableStateScoreSchema,
  stress: nullableStateScoreSchema,
  sleepQuality: nullableStateScoreSchema,
  loneliness: nullableStateScoreSchema,
  socialLoad: nullableStateScoreSchema,
  initiationDifficulty: nullableStateScoreSchema,
  functionalCapacity: nullableStateScoreSchema,
  craving: nullableStateScoreSchema.optional()
});

export type CheckInInput = z.infer<typeof checkInInputSchema>;
export type StateVector = z.infer<typeof stateVectorSchema>;

export function toStateVector(checkIn: CheckInInput): StateVector {
  return {
    mood: checkIn.mood,
    energy: checkIn.energy,
    stress: "stress" in checkIn ? (checkIn.stress ?? null) : null,
    sleepQuality: "sleepQuality" in checkIn ? (checkIn.sleepQuality ?? null) : null,
    loneliness: "loneliness" in checkIn ? (checkIn.loneliness ?? null) : null,
    socialLoad: "socialLoad" in checkIn ? (checkIn.socialLoad ?? null) : null,
    initiationDifficulty:
      "initiationDifficulty" in checkIn ? (checkIn.initiationDifficulty ?? null) : null,
    functionalCapacity: checkIn.functionalCapacity,
    craving: "craving" in checkIn ? (checkIn.craving ?? null) : null
  };
}
