import {
  Activity,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  MapPin,
  NotebookText,
  Route as RouteIcon,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import type { CheckInRecord, Mission, Reflection } from "../data/appData";
import { getMissionPlace } from "../data/missionLogic";
import { useAppState } from "../state/AppState";

/* ─── Inline SVG bar chart (no external deps) ─── */
interface BarChartProps {
  bars: { label: string; value: number; maxValue: number }[];
  color?: string;
  height?: number;
}

function BarChart({ bars, color = "var(--color-forest)", height = 80 }: BarChartProps) {
  if (!bars.length) return null;
  const hasData = bars.some((b) => b.value > 0);
  return (
    <div className="insight-bar-chart" aria-hidden="true" style={{ height }}>
      {bars.map((bar, i) => {
        const pct = bar.maxValue > 0 ? (bar.value / bar.maxValue) * 100 : 0;
        return (
          <div key={i} className="insight-bar-col">
            <div className="insight-bar-track">
              <div
                className="insight-bar-fill"
                style={{ height: `${pct}%`, background: color }}
              />
            </div>
            <span className="insight-bar-label">{bar.label}</span>
          </div>
        );
      })}
      {!hasData && <span className="insight-chart-empty">No data yet</span>}
    </div>
  );
}

/* ─── Inline SVG line chart ─── */
interface LineChartProps {
  points: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

function LineChart({ points, labels, color = "var(--color-forest)", height = 80 }: LineChartProps) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const w = 100;
  const h = height;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => ({
    x: i * step,
    y: h - (p / max) * (h - 8) - 4
  }));
  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  return (
    <div className="insight-line-chart" aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {labels && (
        <div className="insight-line-labels">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

type InsightView = "overview" | "activity" | "patterns";
type InsightRange = 7 | 28 | "all";
type ActivityFilter = "all" | "missions" | "checkins" | "plans";
type ActivityKind = Exclude<ActivityFilter, "all">;

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  eyebrow: string;
  title: string;
  detail: string;
  status?: Mission["status"];
}

interface MissionCheckInPair {
  mission: Mission;
  checkIn: CheckInRecord;
}

const dayMs = 24 * 60 * 60 * 1000;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSchedule(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatRecordedMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function getMissionResultLabel(status: Mission["status"]) {
  if (status === "completed") return "Completed";
  if (status === "partly") return "Partly completed";
  if (status === "not_today") return "Not today";
  if (status === "in_progress") return "In progress";
  return "Planned";
}

function getMissionEventDetail(mission: Mission, placeName: string | null) {
  const setting = placeName ?? mission.placeType;
  return `${mission.durationMinutes} min · ${setting} · ${mission.estimatedCost}`;
}

function getActivityIcon(kind: ActivityKind): ComponentType<{ "aria-hidden"?: boolean }> {
  if (kind === "checkins") return SlidersHorizontal;
  if (kind === "plans") return CalendarClock;
  return Activity;
}

function averageDuration(missions: Mission[]) {
  if (!missions.length) return 0;
  return Math.round(missions.reduce((sum, mission) => sum + mission.durationMinutes, 0) / missions.length);
}

export function InsightsPage() {
  const { data, ready } = useAppState();
  const [view, setView] = useState<InsightView>("overview");
  const [range, setRange] = useState<InsightRange>(7);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const now = Date.now();
  const cutoff = range === "all" ? null : now - range * dayMs;
  const inRange = (value: string) => cutoff === null || new Date(value).getTime() >= cutoff;

  const recentHistory = useMemo(
    () =>
      [...data.missionHistory]
        .filter((mission) => inRange(mission.completedAt ?? mission.selectedAt))
        .sort(
          (left, right) =>
            new Date(right.completedAt ?? right.selectedAt).getTime() -
            new Date(left.completedAt ?? left.selectedAt).getTime()
        ),
    [data.missionHistory, cutoff]
  );

  const recentCheckIns = useMemo(
    () => data.checkIns.filter((record) => inRange(record.createdAt)),
    [data.checkIns, cutoff]
  );

  const recentReflections = useMemo(
    () => data.reflections.filter((reflection) => inRange(reflection.createdAt)),
    [data.reflections, cutoff]
  );

  const upcomingPlans = useMemo(
    () =>
      [...data.plannedMissions]
        .filter((mission) => {
          if (!mission.scheduledFor) return false;
          const scheduledAt = new Date(mission.scheduledFor).getTime();
          return scheduledAt >= now && scheduledAt <= now + 7 * dayMs;
        })
        .sort(
          (left, right) =>
            new Date(left.scheduledFor ?? 0).getTime() - new Date(right.scheduledFor ?? 0).getTime()
        ),
    [data.plannedMissions, now]
  );

  const selectedMissions = useMemo(() => {
    const missions = [...recentHistory];
    if (
      data.mission &&
      inRange(data.mission.selectedAt) &&
      !missions.some((mission) => mission.id === data.mission?.id)
    ) {
      missions.push(data.mission);
    }
    return missions;
  }, [data.mission, recentHistory, cutoff]);

  const outcomeCounts = {
    completed: recentHistory.filter((mission) => mission.status === "completed").length,
    partly: recentHistory.filter((mission) => mission.status === "partly").length,
    notToday: recentHistory.filter((mission) => mission.status === "not_today").length
  };

  const recordedMinutes = recentHistory.reduce((total, mission) => {
    if (!mission.startedAt || !mission.completedAt) return total;
    const duration = Math.round(
      (new Date(mission.completedAt).getTime() - new Date(mission.startedAt).getTime()) / 60000
    );
    return duration > 0 && duration <= 240 ? total + duration : total;
  }, 0);

  const activityEvents = useMemo<ActivityEvent[]>(() => {
    const events: ActivityEvent[] = recentHistory.map((mission) => {
      const place = getMissionPlace(data, mission);
      return {
        id: `mission-${mission.id}`,
        kind: "missions",
        at: mission.completedAt ?? mission.selectedAt,
        eyebrow: getMissionResultLabel(mission.status),
        title: mission.title,
        detail: getMissionEventDetail(mission, place?.name ?? null),
        status: mission.status
      };
    });

    if (
      data.mission &&
      inRange(data.mission.startedAt ?? data.mission.selectedAt) &&
      !recentHistory.some((mission) => mission.id === data.mission?.id)
    ) {
      const place = getMissionPlace(data, data.mission);
      events.push({
        id: `current-${data.mission.id}`,
        kind: "missions",
        at: data.mission.startedAt ?? data.mission.selectedAt,
        eyebrow: data.mission.status === "in_progress" ? "Mission started" : "Mission chosen",
        title: data.mission.title,
        detail: getMissionEventDetail(data.mission, place?.name ?? null),
        status: data.mission.status
      });
    }

    data.plannedMissions.forEach((mission) => {
      if (!mission.scheduledFor || !inRange(mission.scheduledFor)) return;
      const place = getMissionPlace(data, mission);
      events.push({
        id: `plan-${mission.id}`,
        kind: "plans",
        at: mission.scheduledFor,
        eyebrow: "Scheduled mission",
        title: mission.title,
        detail: getMissionEventDetail(mission, place?.name ?? null),
        status: "planned"
      });
    });

    recentCheckIns.forEach((checkIn) => {
      events.push({
        id: `checkin-${checkIn.id}`,
        kind: "checkins",
        at: checkIn.createdAt,
        eyebrow: checkIn.type === "quick" ? "Quick Check-In" : "Standard Check-In",
        title: `Energy ${checkIn.energy}/5 · Capacity ${checkIn.capacity}/5`,
        detail: checkIn.note?.trim() || "No note added"
      });
    });

    recentReflections.forEach((reflection) => {
      if (events.some((event) => event.id === `mission-${reflection.missionId}`)) return;
      events.push({
        id: `reflection-${reflection.id}`,
        kind: "missions",
        at: reflection.createdAt,
        eyebrow: "Mission reflection",
        title: reflection.outcome === "completed" ? "Mission completed" : reflection.outcome === "partly" ? "Mission partly completed" : "Mission left for another day",
        detail: reflection.note?.trim() || `Recorded effort ${reflection.effort}/5`
      });
    });

    return events.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  }, [data, recentCheckIns, recentHistory, recentReflections, cutoff]);

  const filteredEvents =
    activityFilter === "all"
      ? activityEvents
      : activityEvents.filter((event) => event.kind === activityFilter);

  const missionCheckInPairs = useMemo<MissionCheckInPair[]>(() => {
    return recentHistory.flatMap((mission) => {
      const selectedAt = new Date(mission.selectedAt).getTime();
      const checkIn = [...data.checkIns]
        .filter((record) => {
          const checkInAt = new Date(record.createdAt).getTime();
          return checkInAt <= selectedAt && selectedAt - checkInAt <= dayMs;
        })
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

      return checkIn ? [{ mission, checkIn }] : [];
    });
  }, [data.checkIns, recentHistory]);

  const durationGroups = [
    { label: "5 min or less", count: recentHistory.filter((mission) => mission.durationMinutes <= 5).length },
    { label: "6 to 15 min", count: recentHistory.filter((mission) => mission.durationMinutes > 5 && mission.durationMinutes <= 15).length },
    { label: "16 to 30 min", count: recentHistory.filter((mission) => mission.durationMinutes > 15 && mission.durationMinutes <= 30).length },
    { label: "More than 30 min", count: recentHistory.filter((mission) => mission.durationMinutes > 30).length }
  ];

  const settingGroups = (["In person", "At home", "Online"] as const).map((format) => ({
    label: format,
    count: recentHistory.filter((mission) => mission.format === format).length
  }));

  const lowEnergyMissions = missionCheckInPairs
    .filter(({ checkIn }) => checkIn.energy <= 2 || checkIn.capacity <= 2)
    .map(({ mission }) => mission);
  const otherEnergyMissions = missionCheckInPairs
    .filter(({ checkIn }) => checkIn.energy > 2 && checkIn.capacity > 2)
    .map(({ mission }) => mission);
  const completedRoute = data.route.filter((step) => step.completed).length;
  const routePercent = data.route.length ? Math.round((completedRoute / data.route.length) * 100) : 0;
  const maxOutcomeCount = Math.max(outcomeCounts.completed, outcomeCounts.partly, outcomeCounts.notToday, 1);
  const maxDurationCount = Math.max(...durationGroups.map((group) => group.count), 1);
  const maxSettingCount = Math.max(...settingGroups.map((group) => group.count), 1);
  const rangeLabel = range === "all" ? "All activity" : `Last ${range} days`;

  if (!ready) {
    return (
      <main className="app-page activity-insights activity-insights-loading">
        <p>Loading your activity...</p>
      </main>
    );
  }

  return (
    <main className="app-page activity-insights">
      <header className="activity-insights-header">
        <div>
          <p className="app-kicker">Your records</p>
          <h1>Your activity, in one place.</h1>
          <p>See what you chose, what happened, and what is already planned next.</p>
        </div>
        <div className="activity-range" aria-label="Activity range">
          {([7, 28, "all"] as InsightRange[]).map((option) => (
            <button
              className={range === option ? "is-active" : ""}
              type="button"
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              key={option}
            >
              {option === "all" ? "All" : `${option} days`}
            </button>
          ))}
        </div>
      </header>

      <nav className="insight-view-tabs" aria-label="Insight views">
        {(["overview", "activity", "patterns"] as InsightView[]).map((option) => (
          <button
            className={view === option ? "is-active" : ""}
            type="button"
            aria-current={view === option ? "page" : undefined}
            onClick={() => setView(option)}
            key={option}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </nav>

      {view === "overview" && (
        <div className="insight-view-panel">
          <section className="activity-summary" aria-labelledby="activity-summary-title">
            <div className="activity-summary-heading">
              <p className="app-kicker">{rangeLabel}</p>
              <h2 id="activity-summary-title">Activity summary</h2>
            </div>
            <dl>
              <div>
                <dt>Missions chosen</dt>
                <dd>{selectedMissions.length}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{outcomeCounts.completed}</dd>
              </div>
              <div>
                <dt>Partly completed</dt>
                <dd>{outcomeCounts.partly}</dd>
              </div>
              <div>
                <dt>Not today</dt>
                <dd>{outcomeCounts.notToday}</dd>
              </div>
              <div>
                <dt>Recorded time</dt>
                <dd>{formatRecordedMinutes(recordedMinutes)}</dd>
              </div>
              <div>
                <dt>Next 7 days</dt>
                <dd>{upcomingPlans.length} planned</dd>
              </div>
            </dl>
          </section>

          {/* ── Weekly missions trend chart ── */}
          {recentHistory.length >= 2 ? (() => {
            // Build last-7-day buckets labelled Mon–Sun relative to today
            const buckets: { label: string; value: number }[] = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              const label = new Intl.DateTimeFormat("en", { weekday: "short" }).format(d);
              const value = recentHistory.filter(m => {
                const at = (m.completedAt ?? m.selectedAt).slice(0,10);
                return at === key;
              }).length;
              return { label, value };
            });
            const maxVal = Math.max(...buckets.map(b => b.value), 1);
            return (
              <section className="insight-weekly-chart" aria-labelledby="weekly-chart-title">
                <p className="app-kicker">Last 7 days</p>
                <h2 id="weekly-chart-title">Mission activity</h2>
                {recentHistory.length > 0 ? (
                  <>
                    <BarChart
                      bars={buckets.map(b => ({ label: b.label, value: b.value, maxValue: maxVal }))}
                      color="var(--color-sky)"
                      height={72}
                    />
                    {/* Screen-reader table equivalent */}
                    <table className="sr-only">
                      <caption>Missions per day, last 7 days</caption>
                      <tbody>
                        {buckets.map(b => (
                          <tr key={b.label}><th scope="row">{b.label}</th><td>{b.value}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="insight-chart-empty-text">Not enough data yet. Complete a Mission to see your first chart.</p>
                )}
              </section>
            );
          })() : null}

          <div className="insight-overview-layout">
            <section className="insight-recent" aria-labelledby="recent-activity-title">
              <div className="insight-section-heading">
                <div>
                  <p className="app-kicker">Latest records</p>
                  <h2 id="recent-activity-title">Recent activity</h2>
                </div>
                <button type="button" onClick={() => setView("activity")}>View all <ChevronRight aria-hidden="true" /></button>
              </div>

              {activityEvents.length ? (
                <ol className="activity-timeline activity-timeline-compact">
                  {activityEvents.slice(0, 4).map((event) => {
                    const Icon = getActivityIcon(event.kind);
                    return (
                      <li key={event.id}>
                        <time dateTime={event.at}><span>{formatDate(event.at)}</span>{formatTime(event.at)}</time>
                        <div className={`activity-event-icon is-${event.kind}`}><Icon aria-hidden /></div>
                        <div className="activity-event-copy">
                          <span>{event.eyebrow}</span>
                          <h3>{event.title}</h3>
                          <p>{event.detail}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="insight-empty-state">
                  <NotebookText aria-hidden="true" />
                  <h3>No activity in this range yet</h3>
                  <p>Your first chosen mission or Check-In will appear here.</p>
                  <Link to="/app/today">Choose a mission <ArrowRight aria-hidden="true" /></Link>
                </div>
              )}
            </section>

            <aside className="insight-next-plans" aria-labelledby="next-plans-title">
              <div className="insight-section-heading">
                <div>
                  <p className="app-kicker">Coming up</p>
                  <h2 id="next-plans-title">Next 7 days</h2>
                </div>
                <CalendarClock aria-hidden="true" />
              </div>
              {upcomingPlans.length ? (
                <ol>
                  {upcomingPlans.slice(0, 3).map((mission) => {
                    const place = getMissionPlace(data, mission);
                    return (
                      <li key={mission.id}>
                        <time dateTime={mission.scheduledFor ?? undefined}>{formatSchedule(mission.scheduledFor ?? mission.selectedAt)}</time>
                        <strong>{mission.title}</strong>
                        <span><Clock3 aria-hidden="true" /> {mission.durationMinutes} min</span>
                        <span><MapPin aria-hidden="true" /> {place?.name ?? mission.placeType}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="insight-empty-state insight-empty-state-small">
                  <CalendarClock aria-hidden="true" />
                  <h3>Nothing scheduled yet</h3>
                  <p>Plan a mission from your Dashboard when a day and time feel clear.</p>
                  <Link to="/app/today">Open Dashboard <ArrowRight aria-hidden="true" /></Link>
                </div>
              )}
            </aside>
          </div>

          <section className="insight-route-strip" aria-labelledby="route-strip-title">
            <RouteIcon aria-hidden="true" />
            <div>
              <p className="app-kicker">Connected direction</p>
              <h2 id="route-strip-title">{data.vision.title}</h2>
              <p>{completedRoute} of {data.route.length} Route levels explored</p>
            </div>
            <div className="insight-route-progress" aria-label={`${routePercent}% of Route steps explored`}>
              <span><i style={{ width: `${routePercent}%` }} /></span>
              <strong>{routePercent}%</strong>
            </div>
            <Link to="/app/route">View Route <ArrowRight aria-hidden="true" /></Link>
          </section>
        </div>
      )}

      {view === "activity" && (
        <section className="insight-view-panel insight-activity-view" aria-labelledby="activity-log-title">
          <div className="insight-section-heading insight-activity-heading">
            <div>
              <p className="app-kicker">{rangeLabel}</p>
              <h2 id="activity-log-title">Activity log</h2>
            </div>
            <div className="activity-filters" aria-label="Filter activity">
              {(["all", "missions", "checkins", "plans"] as ActivityFilter[]).map((option) => (
                <button
                  className={activityFilter === option ? "is-active" : ""}
                  type="button"
                  aria-pressed={activityFilter === option}
                  onClick={() => setActivityFilter(option)}
                  key={option}
                >
                  {option === "all" ? "All" : option === "checkins" ? "Check-Ins" : option[0].toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredEvents.length ? (
            <ol className="activity-timeline">
              {filteredEvents.map((event) => {
                const Icon = getActivityIcon(event.kind);
                return (
                  <li key={event.id}>
                    <time dateTime={event.at}><span>{formatDate(event.at)}</span>{formatTime(event.at)}</time>
                    <div className={`activity-event-icon is-${event.kind}`}><Icon aria-hidden /></div>
                    <div className="activity-event-copy">
                      <span>{event.eyebrow}</span>
                      <h3>{event.title}</h3>
                      <p>{event.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="insight-empty-state insight-empty-state-wide">
              <CircleDashed aria-hidden="true" />
              <h3>No matching activity</h3>
              <p>Try another filter or record a new mission from your Dashboard.</p>
              <Link to="/app/today">Go to Dashboard <ArrowRight aria-hidden="true" /></Link>
            </div>
          )}
        </section>
      )}

      {view === "patterns" && (
        <div className="insight-view-panel insight-patterns-view">
          <header className="patterns-heading">
            <p className="app-kicker">{rangeLabel}</p>
            <h2>Patterns from your records</h2>
            <p>These comparisons describe your activity only. They do not score or diagnose you.</p>
          </header>

          <section className="pattern-section" aria-labelledby="outcomes-title">
            <div className="pattern-section-title">
              <span>01</span>
              <div><p>Mission results</p><h3 id="outcomes-title">How selected missions ended</h3></div>
            </div>
            {recentHistory.length ? (
              <>
                <BarChart
                  bars={[
                    { label: "Completed", value: outcomeCounts.completed, maxValue: maxOutcomeCount },
                    { label: "Partly", value: outcomeCounts.partly, maxValue: maxOutcomeCount },
                    { label: "Not today", value: outcomeCounts.notToday, maxValue: maxOutcomeCount }
                  ]}
                  color="var(--color-sky)"
                  height={88}
                />
                {/* Accessible text fallback */}
                <table className="sr-only">
                  <caption>Mission outcomes</caption>
                  <tbody>
                    <tr><th>Completed</th><td>{outcomeCounts.completed}</td></tr>
                    <tr><th>Partly completed</th><td>{outcomeCounts.partly}</td></tr>
                    <tr><th>Not today</th><td>{outcomeCounts.notToday}</td></tr>
                  </tbody>
                </table>
                {/* Legacy bar rows kept visible for labelled counts */}
                <div className="pattern-bars">
                  {[
                    { label: "Completed", count: outcomeCounts.completed, icon: Check },
                    { label: "Partly completed", count: outcomeCounts.partly, icon: CircleDashed },
                    { label: "Not today", count: outcomeCounts.notToday, icon: X }
                  ].map(({ label, count, icon: Icon }) => (
                    <div key={label}>
                      <span><Icon aria-hidden="true" /> {label}</span>
                      <i aria-hidden="true"><b style={{ width: `${(count / maxOutcomeCount) * 100}%` }} /></i>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pattern-empty">Mission results will appear after a mission is reflected on.</p>
            )}
          </section>

          <section className="pattern-section" aria-labelledby="mission-size-title">
            <div className="pattern-section-title">
              <span>02</span>
              <div><p>Mission size</p><h3 id="mission-size-title">Planned length of completed records</h3></div>
            </div>
            {recentHistory.length ? (
              <>
                <BarChart
                  bars={durationGroups.map(g => ({ label: g.label, value: g.count, maxValue: maxDurationCount }))}
                  color="var(--color-sky)"
                  height={88}
                />
                <table className="sr-only">
                  <caption>Mission durations</caption>
                  <tbody>{durationGroups.map(g => <tr key={g.label}><th>{g.label}</th><td>{g.count}</td></tr>)}</tbody>
                </table>
                <div className="pattern-bars is-compact">
                  {durationGroups.map((group) => (
                    <div key={group.label}>
                      <span>{group.label}</span>
                      <i aria-hidden="true"><b style={{ width: `${(group.count / maxDurationCount) * 100}%` }} /></i>
                      <strong>{group.count}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pattern-empty">No mission sizes are available in this range.</p>
            )}
          </section>

          <section className="pattern-section" aria-labelledby="setting-title">
            <div className="pattern-section-title">
              <span>03</span>
              <div><p>Setting</p><h3 id="setting-title">Where missions took place</h3></div>
            </div>
            {recentHistory.length ? (
              <>
                <BarChart
                  bars={settingGroups.map(g => ({ label: g.label, value: g.count, maxValue: maxSettingCount }))}
                  color="var(--color-sky)"
                  height={88}
                />
                <table className="sr-only">
                  <caption>Mission settings</caption>
                  <tbody>{settingGroups.map(g => <tr key={g.label}><th>{g.label}</th><td>{g.count}</td></tr>)}</tbody>
                </table>
                <div className="pattern-bars is-compact">
                  {settingGroups.map((group) => (
                    <div key={group.label}>
                      <span>{group.label}</span>
                      <i aria-hidden="true"><b style={{ width: `${(group.count / maxSettingCount) * 100}%` }} /></i>
                      <strong>{group.count}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="pattern-empty">Mission settings will appear once activity is recorded.</p>
            )}
          </section>

          <section className="pattern-section condition-pattern" aria-labelledby="condition-title">
            <div className="pattern-section-title">
              <span>04</span>
              <div><p>Conditions and action</p><h3 id="condition-title">Mission size after a Check-In</h3></div>
            </div>
            {missionCheckInPairs.length >= 3 && lowEnergyMissions.length && otherEnergyMissions.length ? (
              <div className="condition-comparison">
                <div><span>Lower energy or capacity</span><strong>{averageDuration(lowEnergyMissions)} min</strong><p>Average planned mission length</p></div>
                <div><span>Other recorded Check-Ins</span><strong>{averageDuration(otherEnergyMissions)} min</strong><p>Average planned mission length</p></div>
                <p>Based on {missionCheckInPairs.length} missions selected within 24 hours of a Check-In.</p>
              </div>
            ) : (
              <div className="condition-empty">
                <SlidersHorizontal aria-hidden="true" />
                <div>
                  <h4>More paired records are needed</h4>
                  <p>{missionCheckInPairs.length} of 3 mission and Check-In pairs recorded. Missing days are not estimated.</p>
                  <Link to="/app/check-in">Add a Check-In <ArrowRight aria-hidden="true" /></Link>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
