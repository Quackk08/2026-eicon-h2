import type { RhythmType } from "../repositories/checkinRhythms.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export interface RhythmSettings {
  rhythm_type: RhythmType;
  interval_days: number | null;
  specific_day: string | null;
  preferred_time: string | null;
  paused_until?: string | null;
}

function atTime(date: Date, time: string | null): Date {
  const [h, m] = (time || "19:00").split(":").map(Number);
  const d = new Date(date);
  d.setHours(Number.isFinite(h) ? h : 19, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Returns null for "on_demand"/"custom" — the user manages those themselves. */
export function computeNextCheckinAt(from: Date, rhythm: RhythmSettings): Date | null {
  if (rhythm.paused_until && new Date(rhythm.paused_until).getTime() > from.getTime()) return null;
  const time = rhythm.preferred_time;
  switch (rhythm.rhythm_type) {
    case "on_demand":
      return null;
    case "custom": {
      const days = (rhythm.specific_day ?? "")
        .split(",")
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
      if (days.length === 0) return null;
      let d = addDays(from, 1);
      while (!days.includes(d.getDay())) d = addDays(d, 1);
      return atTime(d, time);
    }
    case "daily":
      return atTime(addDays(from, 1), time);
    case "weekdays": {
      let d = addDays(from, 1);
      while (isWeekend(d)) d = addDays(d, 1);
      return atTime(d, time);
    }
    case "weekends": {
      let d = addDays(from, 1);
      while (!isWeekend(d)) d = addDays(d, 1);
      return atTime(d, time);
    }
    case "every_n_days":
      return atTime(addDays(from, rhythm.interval_days || 2), time);
    case "weekly":
    case "specific_day": {
      if (rhythm.specific_day && WEEKDAY_MAP[rhythm.specific_day] !== undefined) {
        const targetDay = WEEKDAY_MAP[rhythm.specific_day];
        let d = addDays(from, 1);
        while (d.getDay() !== targetDay) d = addDays(d, 1);
        return atTime(d, time);
      }
      return atTime(addDays(from, 7), time);
    }
    default:
      return null;
  }
}
