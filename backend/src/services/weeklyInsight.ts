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
      summary: "아직 이번 주 패턴을 설명할 만큼 기록이 충분하지 않습니다.",
      maintainedNote: null,
      adjustmentSuggestion: null
    };
  }

  const parts: string[] = [];
  parts.push(`이번 주 체크인 ${stats.checkInCount}회, 완료 ${stats.completedCount}회, 일부 완료 ${stats.partiallyCompletedCount}회, 오늘은 하지 않음 ${stats.notTodayCount}회입니다.`);

  if (stats.moodThisWeek !== null && stats.moodPriorWeek !== null) {
    const diff = stats.moodThisWeek - stats.moodPriorWeek;
    if (diff <= -1) parts.push("기분은 지난주보다 다소 낮게 느껴진 편입니다.");
    else if (diff >= 1) parts.push("기분은 지난주보다 나아진 편입니다.");
  }

  const maintainedNote = stats.lowestBurdenTemplateId
    ? `부담이 낮았던 행동은 계속 유지할 만합니다.`
    : null;

  const adjustmentSuggestion = stats.mostPostponedTemplateId
    ? "반복적으로 미룬 행동이 있다면, 다음 주에는 더 작은 단계로 조정해볼 수 있습니다."
    : stats.avgBurden !== null && stats.avgBurden >= 3
      ? "전반적으로 부담도가 높았던 한 주였습니다. 다음 주는 계획을 더 작게 만드는 것을 고려해볼 수 있습니다."
      : null;

  return {
    contractVersion: 1,
    summary: parts.join(" "),
    maintainedNote,
    adjustmentSuggestion
  };
}
