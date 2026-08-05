import { Flag } from "lucide-react";
import type { LongTermMission } from "../data/appData";

function describeRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) return "The horizon has passed";
  if (daysRemaining === 0) return "Last day of the horizon";
  if (daysRemaining === 1) return "1 day left";
  if (daysRemaining < 14) return `${daysRemaining} days left`;
  const weeks = Math.round(daysRemaining / 7);
  return `about ${weeks} weeks left`;
}

/**
 * The one-to-two month goal today's Mission belongs to.
 *
 * The point of it on this page is a single sentence: today's ten minutes
 * were part of something. Before this existed a person had a Life Vision
 * with no horizon and a Mission that expired at midnight, and nothing that
 * connected the two.
 *
 * Deliberately not a score. It counts sessions someone chose to do and days
 * that remain, and it never says they are behind — the product does not
 * treat a day not taken as a failure (docs/PRODUCT_GUARDRAILS.md), so a
 * bar that filled slower than the calendar would be doing exactly that by
 * implication. Reaching the target early reads as arrived; not reaching it
 * reads as time still available.
 */
export function LongTermProgress({ mission }: { mission: LongTermMission }) {
  const percent = Math.round(mission.ratio * 100);

  return (
    <section className="long-term-progress" aria-labelledby="long-term-title">
      <div className="long-term-heading">
        <p className="app-kicker">
          <Flag aria-hidden="true" /> This month's direction
        </p>
        <h2 id="long-term-title">{mission.title}</h2>
      </div>

      <div className="long-term-meter">
        {/* The number is written out beside the bar, so nothing here is
            carried by the fill alone. */}
        <div
          className="long-term-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={mission.targetCount}
          aria-valuenow={mission.completedCount}
          aria-valuetext={`${mission.completedCount} of ${mission.targetCount} sessions done`}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="long-term-count">
          <strong>{mission.completedCount}</strong> of {mission.targetCount} sessions
          <span> · {describeRemaining(mission.daysRemaining)}</span>
        </p>
      </div>

      {mission.targetMet ? (
        <p className="long-term-note" role="status">
          You reached what this stretch was for. Keep going, or set a new direction from your Life
          Vision.
        </p>
      ) : (
        mission.rationale && <p className="long-term-note">{mission.rationale}</p>
      )}
    </section>
  );
}
