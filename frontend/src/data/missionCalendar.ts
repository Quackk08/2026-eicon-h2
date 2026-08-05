import type { CalendarEntry } from "@renew/shared";
import { toDateKey } from "./dates";
import type { AppData, Mission } from "./appData";

export type DayKind = "planned" | "done" | "partly" | "not_today" | "in_progress";

export interface DayEntry {
  mission: Mission;
  kind: DayKind;
  /** The moment this belongs on the calendar, ISO. */
  at: string;
  placeName: string | null;
}

const OUTCOME_KIND: Record<Mission["status"], DayKind> = {
  planned: "planned",
  in_progress: "in_progress",
  completed: "done",
  partly: "partly",
  not_today: "not_today"
};

/**
 * When a Mission belongs on the calendar.
 *
 * A planned one sits on the day it was scheduled for; a finished one sits
 * on the day it was finished, not the day it was chosen. Those are usually
 * the same day and occasionally are not — someone picks an action in the
 * evening and does it the next morning — and putting it on the day it was
 * chosen would show effort on a day nothing happened.
 */
function momentFor(mission: Mission): string | null {
  if (mission.status === "planned" || mission.status === "in_progress") {
    return mission.scheduledFor ?? mission.selectedAt ?? null;
  }
  return mission.completedAt ?? mission.scheduledFor ?? mission.selectedAt ?? null;
}

/**
 * Every Mission this person has, keyed by the local calendar day it falls
 * on.
 *
 * Local day throughout, via toDateKey — slicing an ISO string would use the
 * UTC day and drop an evening plan onto the square before it for anyone
 * east of Greenwich.
 */
export function buildMissionsByDay(data: AppData): Map<string, DayEntry[]> {
  const byDay = new Map<string, DayEntry[]>();
  const seen = new Set<string>();

  const add = (mission: Mission) => {
    if (seen.has(mission.id)) return;
    seen.add(mission.id);

    const at = momentFor(mission);
    if (!at) return;

    const key = toDateKey(new Date(at));
    const place = mission.placeId
      ? data.places.find((item) => item.id === mission.placeId)?.name ?? null
      : null;

    const list = byDay.get(key) ?? [];
    list.push({ mission, kind: OUTCOME_KIND[mission.status], at, placeName: place });
    byDay.set(key, list);
  };

  // Today's Mission first, so a Mission that is both current and in the
  // history list keeps its live status rather than a stale copy's.
  if (data.mission) add(data.mission);
  data.plannedMissions.forEach(add);
  data.missionHistory.forEach(add);

  for (const list of byDay.values()) {
    list.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  }
  return byDay;
}

/**
 * The entries worth handing to a calendar application.
 *
 * Only what is still ahead: exporting a month of finished Missions would
 * fill somebody's calendar with things they have already done, and the
 * point of the export is to put a plan somewhere they will actually be
 * looking on the morning it matters.
 */
export function toCalendarEntries(entries: DayEntry[]): CalendarEntry[] {
  return entries
    .filter((entry) => entry.kind === "planned" || entry.kind === "in_progress")
    .map(({ mission, at, placeName }) => ({
      id: mission.id,
      title: mission.title,
      description: [mission.description, mission.supplies.length ? `Bring: ${mission.supplies.join(", ")}` : null]
        .filter(Boolean)
        .join("\n\n"),
      location: placeName ?? (mission.format === "At home" ? "Home" : mission.format === "Online" ? "Online" : null),
      startsAt: at,
      durationMinutes: mission.durationMinutes
    }));
}
