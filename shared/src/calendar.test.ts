import { describe, expect, it } from "vitest";
import {
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  googleCalendarUrl,
  monthGrid,
  toIcsInstant,
  type CalendarEntry
} from "./calendar.js";

const entry: CalendarEntry = {
  id: "mission-1",
  title: "Study at a cafe for 20 minutes",
  description: "Bring a notebook, a pen; and nothing else",
  location: "DMC Cafe Street",
  startsAt: "2026-08-06T09:00:00.000Z",
  durationMinutes: 20
};

const STAMP = "2026-08-05T17:00:00.000Z";

describe("escapeIcsText", () => {
  it("escapes the characters that would end a property early", () => {
    // The comma is the one that matters: unescaped, most parsers keep only
    // what came before it and the note arrives silently truncated.
    expect(escapeIcsText("a, b; c\\ d")).toBe("a\\, b\\; c\\\\ d");
  });

  it("turns real newlines into the literal escape", () => {
    expect(escapeIcsText("one\ntwo")).toBe("one\\ntwo");
    expect(escapeIcsText("one\r\ntwo")).toBe("one\\ntwo");
  });
});

describe("foldIcsLine", () => {
  it("leaves a short line alone", () => {
    expect(foldIcsLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds by octets, not characters", () => {
    // 40 Korean characters is 120 bytes in UTF-8 but well under 75
    // characters — folding by character count would leave a line strict
    // parsers reject.
    const line = `SUMMARY:${"가".repeat(40)}`;
    const folded = foldIcsLine(line);
    expect(folded).toContain("\r\n ");
    for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
  });

  it("loses nothing it folded", () => {
    const line = `DESCRIPTION:${"a".repeat(300)}`;
    const rebuilt = foldIcsLine(line).split("\r\n ").join("");
    expect(rebuilt).toBe(line);
  });
});

describe("toIcsInstant", () => {
  it("writes the UTC basic format", () => {
    expect(toIcsInstant("2026-08-06T09:00:00.000Z")).toBe("20260806T090000Z");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs([entry], STAMP);

  it("wraps the events in a calendar", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("uses CRLF everywhere, including the last line", () => {
    expect(ics.split("\n").every((line, index, all) => index === all.length - 1 || line.endsWith("\r"))).toBe(true);
  });

  it("ends the event after its duration", () => {
    expect(ics).toContain("DTSTART:20260806T090000Z");
    expect(ics).toContain("DTEND:20260806T092000Z");
  });

  it("gives the same Mission the same UID, so a re-import updates", () => {
    const again = buildIcs([entry], STAMP);
    expect(again).toBe(ics);
    expect(ics).toContain("UID:mission-1@renew.app");
  });

  it("never emits a zero-length event", () => {
    const instant = buildIcs([{ ...entry, durationMinutes: 0 }], STAMP);
    expect(instant).toContain("DTSTART:20260806T090000Z");
    expect(instant).toContain("DTEND:20260806T090100Z");
  });

  it("omits optional properties rather than writing them empty", () => {
    const bare = buildIcs([{ ...entry, description: null, location: null }], STAMP);
    expect(bare).not.toContain("DESCRIPTION:");
    expect(bare).not.toContain("LOCATION:");
  });
});

describe("googleCalendarUrl", () => {
  it("builds an unauthenticated template link", () => {
    const url = new URL(googleCalendarUrl(entry));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260806T090000Z/20260806T092000Z");
    expect(url.searchParams.get("text")).toBe(entry.title);
    expect(url.searchParams.get("location")).toBe("DMC Cafe Street");
  });
});

describe("monthGrid", () => {
  it("starts on the configured weekday and covers whole weeks", () => {
    const days = monthGrid(2026, 7, 1); // August 2026
    expect(days.length % 7).toBe(0);
    expect(new Date(`${days[0]}T12:00:00`).getDay()).toBe(1);
  });

  it("contains every day of the month exactly once", () => {
    const days = monthGrid(2026, 7, 1);
    const inMonth = days.filter((day) => day.startsWith("2026-08"));
    expect(inMonth).toHaveLength(31);
    expect(new Set(inMonth).size).toBe(31);
  });

  it("pads with the neighbouring months rather than blanks", () => {
    const days = monthGrid(2026, 7, 1);
    expect(days[0] < "2026-08-01" || days[0] === "2026-08-01").toBe(true);
    expect(days.at(-1)! >= "2026-08-31").toBe(true);
  });

  it("handles a February that starts on the week boundary", () => {
    const days = monthGrid(2027, 1, 1); // February 2027 starts on a Monday
    expect(days[0]).toBe("2027-02-01");
    expect(days.filter((d) => d.startsWith("2027-02"))).toHaveLength(28);
  });
});
