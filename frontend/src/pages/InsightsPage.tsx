import { ArrowRight, CalendarRange, CheckCircle2, Info, Route as RouteIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppState";

export function InsightsPage() {
  const { data } = useAppState();
  const [range, setRange] = useState<7 | 28>(7);
  const cutoff = useMemo(() => Date.now() - range * 24 * 60 * 60 * 1000, [range]);
  const recentCheckIns = data.checkIns.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
  const recentReflections = data.reflections.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
  const enoughData = recentCheckIns.length >= 3;
  const completedReflections = recentReflections.filter((item) => item.outcome === "completed").length;
  const lighterReflections = recentReflections.filter((item) => item.effort <= 2).length;
  const completedRoute = data.route.filter((step) => step.completed).length;
  const averageEnergy = recentCheckIns.length
    ? recentCheckIns.reduce((sum, item) => sum + item.energy, 0) / recentCheckIns.length
    : null;

  const observation =
    averageEnergy === null
      ? "No recent energy notes yet."
      : averageEnergy >= 3.5
        ? "Your recent records often included more energy being available."
        : averageEnergy <= 2
          ? "Your recent records often called for smaller, lower-pressure steps."
          : "Your recent energy notes moved between lower and steadier days.";

  const dayActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    return {
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date).slice(0, 1),
      active:
        data.checkIns.some((item) => item.createdAt.startsWith(dateKey)) ||
        data.reflections.some((item) => item.createdAt.startsWith(dateKey))
    };
  });

  return (
    <main className="app-page insight-page">
      <header className="insight-heading">
        <div>
          <p className="app-kicker">Personal patterns, never rankings</p>
          <h1>Your recent life, with room for context.</h1>
          <p>Insights describe your own records. They do not diagnose, predict risk, or compare you with anyone else.</p>
        </div>
        <div className="insight-range" role="tablist" aria-label="Insight range">
          <button className={range === 7 ? "is-active" : ""} type="button" role="tab" aria-selected={range === 7} onClick={() => setRange(7)}>7 days</button>
          <button className={range === 28 ? "is-active" : ""} type="button" role="tab" aria-selected={range === 28} onClick={() => setRange(28)}>28 days</button>
        </div>
      </header>

      {!enoughData && (
        <aside className="insight-notice">
          <Info aria-hidden="true" />
          <div>
            <strong>More context is needed</strong>
            <p>{recentCheckIns.length} of 3 Check-Ins recorded for a basic pattern. ReNew will not estimate the missing days.</p>
          </div>
        </aside>
      )}

      <section className="insight-stats" aria-label={`${range}-day record summary`}>
        <article><span>{recentCheckIns.length}</span><p>Check-Ins recorded</p></article>
        <article><span>{recentReflections.length}</span><p>Mission reflections</p></article>
        <article><span>{completedReflections}</span><p>Chosen endings reached</p></article>
        <article><span>{lighterReflections}</span><p>Steps that felt light</p></article>
      </section>

      <div className="insight-grid">
        <section className="weekly-rhythm" aria-labelledby="weekly-rhythm-title">
          <div className="section-title-row">
            <div>
              <p className="app-kicker">Seven-day rhythm</p>
              <h2 id="weekly-rhythm-title">Records, not streaks</h2>
            </div>
            <CalendarRange aria-hidden="true" />
          </div>
          <div className="insight-week-row">
            {dayActivity.map((day, index) => (
              <div className={day.active ? "is-active" : ""} key={`${day.label}-${index}`}>
                <span>{day.label}</span>
                <i aria-hidden="true" />
              </div>
            ))}
          </div>
          <p>Blank days stay blank. They are not treated as broken streaks or failed participation.</p>
        </section>

        <section className="signal-observation" aria-labelledby="signal-observation-title">
          <p className="app-kicker">Current observation</p>
          <h2 id="signal-observation-title">{enoughData ? observation : "A pattern will appear after more Check-Ins."}</h2>
          <p>{enoughData ? "This description uses only your recent entries and can change as conditions change." : "Until then, each Check-In can still adjust the next Mission on its own."}</p>
          <Link className="inline-arrow-link" to="/app/check-in">Add today’s context <ArrowRight aria-hidden="true" /></Link>
        </section>

        <section className="route-insight" aria-labelledby="route-insight-title">
          <div className="section-title-row">
            <div>
              <p className="app-kicker">Life Route</p>
              <h2 id="route-insight-title">Progress can move in both directions</h2>
            </div>
            <RouteIcon aria-hidden="true" />
          </div>
          <div className="route-insight-progress">
            <div aria-hidden="true"><i style={{ width: `${data.route.length ? (completedRoute / data.route.length) * 100 : 0}%` }} /></div>
            <span>{completedRoute} of {data.route.length} steps explored</span>
          </div>
          <p>Returning to a smaller step remains part of the Route. It does not erase earlier progress.</p>
          <Link className="inline-arrow-link" to="/app/route">Review your Route <ArrowRight aria-hidden="true" /></Link>
        </section>

        <section className="reflection-insight" aria-labelledby="reflection-insight-title">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <p className="app-kicker">Recent reflections</p>
            <h2 id="reflection-insight-title">{recentReflections.length ? `${recentReflections.length} choices carried forward` : "No reflections in this range yet"}</h2>
            <p>Each reflection can change the next action size without changing your Life Vision.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
