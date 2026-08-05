import { z } from "zod";

/**
 * The two sizes a Mission comes in, named once so the client, the API, and
 * the rule engine cannot drift on what the words mean.
 *
 * - `short_term` is today's action: one reviewed step, one day, one
 *   outcome. It is the existing Mission and nothing about it changes.
 * - `long_term` is a one-to-two month commitment: reach the top of this
 *   Route, this many times, by this date.
 *
 * The distinction is horizon and unit of completion, not importance. A
 * long-term mission is never "done" by a single act — it is finished by an
 * accumulation of short-term ones — which is the whole reason it exists
 * separately: it is the only place a person can see that today's ten
 * minutes were part of something.
 */
export const MISSION_HORIZONS = ["short_term", "long_term"] as const;
export const missionHorizonSchema = z.enum(MISSION_HORIZONS);

export const LONG_TERM_MISSION_STATUSES = ["active", "paused", "achieved", "ended"] as const;
export const longTermMissionStatusSchema = z.enum(LONG_TERM_MISSION_STATUSES);

/** Bounds the product's promise: one to two months, never longer. */
export const LONG_TERM_MIN_DAYS = 30;
export const LONG_TERM_MAX_DAYS = 60;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const longTermMissionSchema = z.object({
  id: z.string().uuid(),
  visionId: z.string().uuid(),
  routeId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  /**
   * Why this horizon and this target. Written by the rule engine at
   * creation and stored, so "why two months" has the same answer in a
   * month's time, when the preferences it was derived from have moved on.
   */
  rationale: z.string().max(600).nullable(),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema,
  targetCount: z.number().int().positive(),
  status: longTermMissionStatusSchema
});

/**
 * A long-term mission with the counting done. Progress is derived from
 * short-term missions rather than stored, so it cannot fall out of step
 * with what actually happened.
 */
export const longTermMissionProgressSchema = longTermMissionSchema.extend({
  completedCount: z.number().int().nonnegative(),
  /** 0-1. Capped, because finishing early should read as finished, not 120%. */
  ratio: z.number().min(0).max(1),
  daysRemaining: z.number().int(),
  /**
   * True once the target is met. Deliberately not the same as `status`:
   * the row only becomes `achieved` when something writes that, and a
   * dashboard should be able to say "you got there" the moment it is true.
   */
  targetMet: z.boolean()
});

export type MissionHorizon = z.infer<typeof missionHorizonSchema>;
export type LongTermMissionStatus = z.infer<typeof longTermMissionStatusSchema>;
export type LongTermMission = z.infer<typeof longTermMissionSchema>;
export type LongTermMissionProgress = z.infer<typeof longTermMissionProgressSchema>;

/** How often someone has said they intend to show up, per week. */
export interface CadenceInput {
  /** Sessions per week implied by the Check-In rhythm. 1-7. */
  sessionsPerWeek: number;
  /** How many steps this Vision's Route has. */
  ladderSteps: number;
}

export interface LongTermPlan {
  horizonDays: number;
  targetCount: number;
  rationale: string;
}

/**
 * Turns a cadence and a ladder into a horizon and a target.
 *
 * Deterministic on purpose. This is a rule-engine decision, not a model
 * one: a person is being told they will get somewhere in seven weeks, and
 * that claim has to be reproducible, explainable, and the same tomorrow.
 *
 * The shape of it: aim to practise every rung about four times, work out
 * how long that takes at the cadence they chose, then clamp to the one-to-
 * two month promise. Clamping down would leave a target that cannot fit in
 * the horizon, so the target is refitted afterwards — better to ask for
 * fewer sessions than to hand someone a goal that was impossible on the day
 * it was set.
 */
export function planLongTermMission({ sessionsPerWeek, ladderSteps }: CadenceInput): LongTermPlan {
  const cadence = Math.min(Math.max(Math.round(sessionsPerWeek), 1), 7);
  const steps = Math.max(Math.round(ladderSteps), 1);

  const idealCount = steps * 4;
  const idealDays = Math.ceil(idealCount / cadence) * 7;
  const horizonDays = Math.min(Math.max(idealDays, LONG_TERM_MIN_DAYS), LONG_TERM_MAX_DAYS);

  // What actually fits in the horizon at this cadence, never below one pass
  // through the ladder — a goal worth naming has to reach the top of it.
  const fits = Math.floor((horizonDays / 7) * cadence);
  const targetCount = Math.max(steps, Math.min(idealCount, fits));

  const weeks = Math.round(horizonDays / 7);
  const rationale =
    `${targetCount} sessions over about ${weeks} weeks — ` +
    `${cadence} ${cadence === 1 ? "day" : "days"} a week at the rhythm you set, ` +
    `enough to work through all ${steps} steps of this Route rather than only reach the top once.`;

  return { horizonDays, targetCount, rationale };
}

/** Progress, counted the same way wherever it is shown. */
export function summariseProgress(
  targetCount: number,
  completedCount: number,
  endsOn: string,
  today: string
): { ratio: number; daysRemaining: number; targetMet: boolean } {
  const ratio = targetCount <= 0 ? 0 : Math.min(completedCount / targetCount, 1);
  const daysRemaining = Math.round(
    (Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  );
  return { ratio, daysRemaining, targetMet: completedCount >= targetCount };
}
