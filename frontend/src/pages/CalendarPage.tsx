import { CalendarPlus, ChevronLeft, ChevronRight, Download, Flag } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildIcs, googleCalendarUrl, monthGrid } from "@renew/shared";
import { toDateKey } from "../data/dates";
import { buildMissionsByDay, toCalendarEntries, type DayKind } from "../data/missionCalendar";
import { useAppState } from "../state/AppState";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_LABEL: Record<DayKind, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Completed",
  partly: "Partly completed",
  not_today: "Left for another day"
};

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
}

function dayNumber(key: string): string {
  return String(Number(key.slice(8, 10)));
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Everything planned and everything done, on a month.
 *
 * Built entirely from what is already in IndexedDB, so it opens with no
 * connection — which is deliberate: a plan matters most on the morning it
 * is needed, and that is exactly when someone is on a train with no signal.
 *
 * The export is the same bet. An .ics file is generated in the browser and
 * a Google Calendar link is the unauthenticated template URL, so neither
 * needs an account, a token, or a scope review, and nothing is written to
 * anyone's calendar until they press save on Google's own screen.
 */
export function CalendarPage() {
  const { data, online } = useAppState();
  const today = toDateKey(new Date());

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(today);

  const missionsByDay = useMemo(() => buildMissionsByDay(data), [data]);
  const days = useMemo(() => monthGrid(cursor.year, cursor.month, 1), [cursor]);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const goal = data.longTermMission;
  const inHorizon = (day: string) =>
    Boolean(goal && goal.status === "active" && day >= goal.startsOn && day <= goal.endsOn);

  const selectedEntries = missionsByDay.get(selectedDay) ?? [];

  /** Everything still ahead this month, for a single download. */
  const exportable = useMemo(() => {
    const entries = days
      .filter((day) => day.startsWith(monthPrefix) && day >= today)
      .flatMap((day) => toCalendarEntries(missionsByDay.get(day) ?? []));
    return entries;
  }, [days, missionsByDay, monthPrefix, today]);

  const downloadIcs = () => {
    const ics = buildIcs(exportable, new Date().toISOString());
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `renew-${monthPrefix}.ics`;
    link.click();
    // Revoked on the next tick so the click has already taken the blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <main className="app-page calendar-page">
      <header className="discovery-heading">
        <div>
          <p className="app-kicker">Plan · Do · Review</p>
          <h1>Your months, one day at a time.</h1>
          <p>
            Everything you have planned and everything you have done. Stored on this device, so it
            opens whether or not there is a connection.
          </p>
        </div>
        <button
          className="secondary-command"
          type="button"
          onClick={downloadIcs}
          disabled={exportable.length === 0}
          title={
            exportable.length === 0
              ? "Nothing is planned ahead this month yet"
              : `Download ${exportable.length} planned ${exportable.length === 1 ? "Mission" : "Missions"}`
          }
        >
          <Download aria-hidden="true" /> Export month
        </button>
      </header>

      {goal && goal.status === "active" && (
        <p className="calendar-horizon" role="note">
          <Flag aria-hidden="true" />
          <span>
            <strong>{goal.title}</strong> runs to {goal.endsOn} — {goal.completedCount} of{" "}
            {goal.targetCount} sessions so far.
          </span>
        </p>
      )}

      <div className="calendar-toolbar">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft aria-hidden="true" />
        </button>
        <h2 aria-live="polite">{monthLabel(cursor.year, cursor.month)}</h2>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="calendar-grid" role="grid" aria-label={monthLabel(cursor.year, cursor.month)}>
        <div className="calendar-weekdays" role="row">
          {WEEKDAYS.map((label) => (
            <span key={label} role="columnheader">
              {label}
            </span>
          ))}
        </div>
        <div className="calendar-days" role="rowgroup">
          {days.map((day) => {
            const entries = missionsByDay.get(day) ?? [];
            const outside = !day.startsWith(monthPrefix);
            const classes = [
              "calendar-day",
              outside ? "is-outside" : "",
              day === today ? "is-today" : "",
              day === selectedDay ? "is-selected" : "",
              inHorizon(day) ? "is-in-horizon" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                className={classes}
                type="button"
                role="gridcell"
                key={day}
                aria-current={day === today ? "date" : undefined}
                aria-pressed={day === selectedDay}
                // The count is in the label because the dots below are
                // decorative — nothing here is carried by a shape alone.
                aria-label={`${day}${entries.length ? `, ${entries.length} ${entries.length === 1 ? "Mission" : "Missions"}` : ", nothing planned"}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="calendar-day-number">{dayNumber(day)}</span>
                {entries.length > 0 && (
                  <span className="calendar-day-marks" aria-hidden="true">
                    {entries.slice(0, 3).map((entry) => (
                      <i className={`is-${entry.kind}`} key={entry.mission.id} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="calendar-detail" aria-live="polite">
        <h2>
          {new Intl.DateTimeFormat("en", {
            weekday: "long",
            month: "long",
            day: "numeric"
          }).format(new Date(`${selectedDay}T12:00:00`))}
        </h2>

        {selectedEntries.length === 0 ? (
          <p className="calendar-empty">
            Nothing on this day.{" "}
            {selectedDay >= today ? (
              <Link to="/app/today">Plan something from Today</Link>
            ) : (
              "A day without a Mission is not a missed one."
            )}
          </p>
        ) : (
          <ul className="calendar-entries">
            {selectedEntries.map((entry) => {
              const exportEntry = toCalendarEntries([entry])[0];
              return (
                <li key={entry.mission.id}>
                  <div className={`calendar-entry-mark is-${entry.kind}`} aria-hidden="true" />
                  <div className="calendar-entry-copy">
                    <p className="app-kicker">
                      {timeLabel(entry.at)} · {KIND_LABEL[entry.kind]}
                    </p>
                    <h3>{entry.mission.title}</h3>
                    <p>
                      {entry.mission.durationMinutes} min
                      {entry.placeName ? ` · ${entry.placeName}` : ""}
                    </p>
                  </div>
                  {exportEntry && (
                    /* Opens Google's own "add event" screen with the fields
                       filled in. Nothing is saved until they press save
                       there, which is why this needs no account of ours. */
                    <a
                      className="calendar-entry-add"
                      href={googleCalendarUrl(exportEntry)}
                      target="_blank"
                      rel="noreferrer"
                      title={online ? "Add to Google Calendar" : "Needs a connection"}
                      aria-disabled={!online}
                      onClick={(event) => {
                        if (!online) event.preventDefault();
                      }}
                    >
                      <CalendarPlus aria-hidden="true" />
                      <span className="sr-only">Add {entry.mission.title} to Google Calendar</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
