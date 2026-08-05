import { planLongTermMission, summariseProgress } from "@renew/shared";
import type { LongTermMissionProgress } from "@renew/shared";
import type { RhythmType } from "../repositories/checkinRhythms.js";
import type { LongTermMissionRow } from "../repositories/longTermMissions.js";
import { countCompletedTowards } from "../repositories/longTermMissions.js";

/**
 * How often the Check-In rhythm implies someone intends to show up.
 *
 * Not a promise about attendance — it is the cadence they chose for
 * themselves, which is the only honest basis for telling them how long
 * something will take. `on_demand` is the default for a profile that has
 * never set one, so it takes a deliberately modest two rather than
 * assuming a daily habit nobody agreed to.
 */
export function sessionsPerWeekFor(rhythm: RhythmType, intervalDays: number | null): number {
  switch (rhythm) {
    case "daily":
      return 7;
    case "weekdays":
      return 5;
    case "weekends":
      return 2;
    case "weekly":
    case "specific_day":
      return 1;
    case "every_n_days":
      return intervalDays && intervalDays > 0 ? Math.max(7 / intervalDays, 1) : 3;
    case "custom":
    case "on_demand":
    default:
      return 2;
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface DerivedLongTermPlan {
  title: string;
  rationale: string;
  startsOn: string;
  endsOn: string;
  targetCount: number;
}

/**
 * Turns a Vision and its Route into a one-to-two month commitment.
 *
 * The Route already names the destination, so this adds only what it was
 * missing: by when, and how many times. Entirely rule-based — a person is
 * being told they will get somewhere in seven weeks, and that has to be
 * reproducible and explainable rather than a sentence a model produced
 * once.
 */
export function deriveLongTermPlan(input: {
  visionSummary: string;
  ladderSteps: number;
  rhythm: RhythmType;
  intervalDays: number | null;
  today?: Date;
}): DerivedLongTermPlan {
  const sessionsPerWeek = sessionsPerWeekFor(input.rhythm, input.intervalDays);
  const { horizonDays, targetCount, rationale } = planLongTermMission({
    sessionsPerWeek,
    ladderSteps: input.ladderSteps
  });

  const start = input.today ? new Date(input.today) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + horizonDays);

  // The Vision in the person's own words is the title. Inventing a
  // motivational headline on top of what they already wrote would be
  // putting a goal in their mouth.
  //
  // Only its first paragraph, though: a Vision summary is the title and the
  // longer description joined by a blank line, and taking the whole thing
  // put a two-sentence paragraph where a heading belongs.
  const summary = input.visionSummary.split(/\n\s*\n/)[0].trim();
  const title = summary.length > 0 ? summary : "Keep going with this Route";

  return {
    title: title.slice(0, 200),
    rationale,
    startsOn: toIsoDate(start),
    endsOn: toIsoDate(end),
    targetCount
  };
}

/** Attaches the counting to a stored row, the same way everywhere. */
export async function withProgress(
  row: LongTermMissionRow,
  today = new Date()
): Promise<LongTermMissionProgress> {
  const completedCount = await countCompletedTowards(row.id);
  const { ratio, daysRemaining, targetMet } = summariseProgress(
    row.target_count,
    completedCount,
    row.ends_on,
    toIsoDate(today)
  );

  return {
    id: row.id,
    visionId: row.vision_id,
    routeId: row.route_id,
    title: row.title,
    rationale: row.rationale,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    targetCount: row.target_count,
    status: row.status,
    completedCount,
    ratio,
    daysRemaining,
    targetMet
  };
}
