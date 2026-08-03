import { supabase } from "../supabase/client.js";
import type { WeeklyInsightResult, WeeklyInsightStats } from "@renew/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

function average(values: number[]): number | null {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null;
}

/**
 * All aggregate counts and averages — never raw check-in notes or exact
 * timestamps of individual entries — per PRODUCT_GUARDRAILS.md ("Do not
 * log raw Check-In values, sensitive notes... AI receives the minimum
 * data needed for the current task").
 */
export async function computeWeeklyInsightStats(profileId: string): Promise<WeeklyInsightStats> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
  const twoWeeksAgo = new Date(now - 14 * DAY_MS).toISOString();

  const { data: thisWeekCheckIns, error: e1 } = await supabase
    .from("check_ins")
    .select("mood, energy")
    .eq("profile_id", profileId)
    .gte("created_at", weekAgo);
  if (e1) throw e1;

  const { data: priorWeekCheckIns, error: e2 } = await supabase
    .from("check_ins")
    .select("mood, energy")
    .eq("profile_id", profileId)
    .gte("created_at", twoWeeksAgo)
    .lt("created_at", weekAgo);
  if (e2) throw e2;

  const { data: reflections, error: e3 } = await supabase
    .from("reflections")
    .select("result, burden, mission_id, missions!inner(template_id)")
    .eq("profile_id", profileId)
    .gte("created_at", weekAgo);
  if (e3) throw e3;

  const { count: participationCount, error: e4 } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("status", "joined")
    .gte("created_at", weekAgo);
  if (e4) throw e4;

  type ReflectionJoinRow = {
    result: string;
    burden: number | null;
    missions: { template_id: string } | { template_id: string }[] | null;
  };
  const rows = (reflections ?? []) as ReflectionJoinRow[];

  function templateIdOf(row: ReflectionJoinRow): string | null {
    const m = row.missions;
    if (!m) return null;
    return Array.isArray(m) ? (m[0]?.template_id ?? null) : m.template_id;
  }

  const completed = rows.filter((r) => r.result === "completed");
  const partiallyCompleted = rows.filter((r) => r.result === "partially_completed");
  const notToday = rows.filter((r) => r.result === "not_today");

  const burdenValues = rows.map((r) => r.burden).filter((b): b is number => typeof b === "number");

  function mostFrequent(list: (string | null)[]): string | null {
    const counts = new Map<string, number>();
    for (const id of list) {
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }

  const completedTemplateIds = completed.map(templateIdOf);
  const notTodayTemplateIds = notToday.map(templateIdOf);

  const burdenByTemplate = new Map<string, number[]>();
  for (const r of completed) {
    const id = templateIdOf(r);
    if (!id || typeof r.burden !== "number") continue;
    const list = burdenByTemplate.get(id) ?? [];
    list.push(r.burden);
    burdenByTemplate.set(id, list);
  }
  let lowestBurdenTemplateId: string | null = null;
  let lowestBurdenAvg = Infinity;
  for (const [id, values] of burdenByTemplate) {
    const avg = average(values) ?? Infinity;
    if (avg < lowestBurdenAvg) {
      lowestBurdenAvg = avg;
      lowestBurdenTemplateId = id;
    }
  }

  const checkInCount = thisWeekCheckIns?.length ?? 0;

  return {
    windowDays: 7,
    hasEnoughData: checkInCount >= 2 || rows.length >= 2,
    checkInCount,
    completedCount: completed.length,
    partiallyCompletedCount: partiallyCompleted.length,
    notTodayCount: notToday.length,
    avgBurden: average(burdenValues),
    mostFrequentTemplateId: mostFrequent(completedTemplateIds),
    lowestBurdenTemplateId,
    mostPostponedTemplateId: mostFrequent(notTodayTemplateIds),
    communityParticipationCount: participationCount ?? 0,
    moodThisWeek: average((thisWeekCheckIns ?? []).map((c) => c.mood).filter((v): v is number => typeof v === "number")),
    moodPriorWeek: average((priorWeekCheckIns ?? []).map((c) => c.mood).filter((v): v is number => typeof v === "number")),
    energyThisWeek: average((thisWeekCheckIns ?? []).map((c) => c.energy).filter((v): v is number => typeof v === "number")),
    energyPriorWeek: average(
      (priorWeekCheckIns ?? []).map((c) => c.energy).filter((v): v is number => typeof v === "number")
    )
  };
}

export function buildRuleBasedWeeklySummary(stats: WeeklyInsightStats): WeeklyInsightResult {
  if (!stats.hasEnoughData) {
    return {
      contractVersion: 1,
      summary: "There is not enough recorded activity yet to describe this week's pattern.",
      maintainedNote: null,
      adjustmentSuggestion: null
    };
  }

  const parts: string[] = [];
  parts.push(
    `This week: ${stats.checkInCount} Check-Ins, ${stats.completedCount} completed, ${stats.partiallyCompletedCount} partly completed, and ${stats.notTodayCount} left for another day.`
  );

  if (stats.moodThisWeek !== null && stats.moodPriorWeek !== null) {
    const diff = stats.moodThisWeek - stats.moodPriorWeek;
    if (diff <= -1) parts.push("Mood was recorded lower than the previous week.");
    else if (diff >= 1) parts.push("Mood was recorded higher than the previous week.");
  }

  const maintainedNote = stats.lowestBurdenTemplateId
    ? "The action that took the least effort is worth keeping available."
    : null;

  const adjustmentSuggestion = stats.mostPostponedTemplateId
    ? "One action was postponed more than once. It can be made smaller next week."
    : stats.avgBurden !== null && stats.avgBurden >= 3
      ? "Recorded effort was high overall. Making next week's plan smaller stays an option."
      : null;

  return {
    contractVersion: 1,
    summary: parts.join(" "),
    maintainedNote,
    adjustmentSuggestion
  };
}
