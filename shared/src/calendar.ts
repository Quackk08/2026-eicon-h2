/**
 * Turning Missions into calendar entries someone can keep.
 *
 * Pure and dependency-free on purpose: everything here runs in the browser
 * with no network, which is the whole point — a plan is most useful on the
 * morning it is needed, and that is exactly when a train tunnel takes the
 * connection away.
 */

export interface CalendarEntry {
  /** Stable across exports of the same Mission, so re-importing updates. */
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  /** When it starts, as an ISO instant. */
  startsAt: string;
  durationMinutes: number;
}

/** RFC 5545 wants CRLF, and only CRLF. */
const CRLF = "\r\n";

/**
 * Escapes the four characters that would otherwise end a property early.
 *
 * A comma is the ordinary one to get wrong: "Bring a notebook, a pen" turns
 * into two values and most parsers keep only the first, so the note arrives
 * truncated at the comma rather than visibly broken.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Folds a content line to 75 octets, continuing with a leading space.
 *
 * Measured in octets rather than characters because the limit is on bytes:
 * a line of Korean or an em dash is well under 75 characters and well over
 * 75 bytes, and splitting it by character count would leave a line that
 * strict parsers reject.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  // First line takes 75, continuations take 74 to leave room for the space.
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);

  return parts.join(`${CRLF} `);
}

/** UTC basic format: 20260806T090000Z. */
export function toIcsInstant(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/**
 * A complete .ics document for the given entries.
 *
 * `stamp` is passed in rather than read from the clock so the same export
 * is byte-identical twice — which is what lets a re-import update an event
 * instead of adding a duplicate beside it.
 */
export function buildIcs(entries: CalendarEntry[], stamp: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReNew//Mission Calendar//EN",
    "CALSCALE:GREGORIAN"
  ];

  for (const entry of entries) {
    const end = addMinutes(entry.startsAt, Math.max(entry.durationMinutes, 1));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@renew.app`,
      `DTSTAMP:${toIcsInstant(stamp)}`,
      `DTSTART:${toIcsInstant(entry.startsAt)}`,
      `DTEND:${toIcsInstant(end)}`,
      `SUMMARY:${escapeIcsText(entry.title)}`
    );
    if (entry.description) lines.push(`DESCRIPTION:${escapeIcsText(entry.description)}`);
    if (entry.location) lines.push(`LOCATION:${escapeIcsText(entry.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // Trailing CRLF: the last line is a content line like any other.
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

/**
 * A Google Calendar "add event" link.
 *
 * Deliberately the unauthenticated template URL rather than an API call:
 * it needs no OAuth, no scope review, and no token to store, and it works
 * for someone who has no Google account by simply not being used. The
 * person stays in control — nothing is written to their calendar until
 * they press save on Google's own screen.
 */
export function googleCalendarUrl(entry: CalendarEntry): string {
  const end = addMinutes(entry.startsAt, Math.max(entry.durationMinutes, 1));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${toIcsInstant(entry.startsAt)}/${toIcsInstant(end)}`
  });
  if (entry.description) params.set("details", entry.description);
  if (entry.location) params.set("location", entry.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * The days to draw for a month view, padded to whole weeks.
 *
 * Returns local calendar days as "YYYY-MM-DD". Built from local date parts
 * throughout: taking `toISOString().slice(0, 10)` would shift the grid by a
 * day for anyone east of Greenwich, putting an evening plan on the wrong
 * square.
 */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1 = 1): string[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;

  const start = new Date(year, month, 1 - offset);
  const days: string[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push(
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    );
    // Stop at the end of the week that contains the last day of the month.
    if (i >= 27 && day.getMonth() !== month && (i + 1) % 7 === 0) break;
  }
  return days;
}
