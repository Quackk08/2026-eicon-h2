import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleDot, Pause } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { EffortLevel, Reflection } from "../data/appData";
import { submitReflectionOrQueue } from "../api/backend";
import { useAppState } from "../state/AppState";

const outcomes = [
  { value: "completed", label: "Completed", copy: "I reached the ending I chose.", icon: Check },
  { value: "partly", label: "Partly", copy: "I tried part of it or changed the shape.", icon: CircleDot },
  { value: "not_today", label: "Not today", copy: "Today called for a different choice.", icon: Pause }
] as const;

const effortLabels = ["Very light", "Light", "Manageable", "Heavy", "Very heavy"];

export function ReflectionPage() {
  const navigate = useNavigate();
  const { data, updateData, refresh } = useAppState();
  const mission = data.mission;
  const initialOutcome = mission?.status === "not_today" ? "not_today" : "completed";
  const [outcome, setOutcome] = useState<Reflection["outcome"]>(initialOutcome);
  const [effort, setEffort] = useState<EffortLevel>(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queuedNote, setQueuedNote] = useState(false);
  const effortStopRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveEffort = (next: EffortLevel) => {
    setEffort(next);
    // Roving tabindex: focus travels with the checked stop.
    effortStopRefs.current[next - 1]?.focus();
  };

  // On a hard load the mission arrives after the first render, so the
  // preselection derived from it has to catch up — otherwise a Mission left
  // for another day opened with "Completed" already chosen.
  useEffect(() => {
    setOutcome(mission?.status === "not_today" ? "not_today" : "completed");
  }, [mission?.id, mission?.status]);

  // Checked before the mission guard: saving clears the mission, and this
  // screen is the answer to "did it save?" — not "nothing to reflect on".
  if (queuedNote) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Saved on this device</p>
        <h1>Your reflection is recorded.</h1>
        <p>It will reach the server on its own once ReNew can connect again — nothing is lost in the meantime.</p>
        <Link className="primary-command" to="/app/today">
          Back to Today <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  if (!mission) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Nothing to reflect on yet</p>
        <h1>Your record begins after a chosen Mission.</h1>
        <p>Start with a Check-In and choose a step that fits today.</p>
        <Link className="primary-command" to="/app/today">
          Back to Today <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const adaptationCopy =
    outcome === "completed" && effort <= 3
      ? "Keep this step available and let the next Check-In decide whether to extend it."
      : outcome === "completed"
        ? "This step stays at its current size — completing it with that much effort is the signal, not a problem."
        : outcome === "partly"
          ? "Keep the same direction and begin one level smaller next time."
          : "Pause this step without penalty. Your route will still be here when conditions change.";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSubmitError(null);
    const reflection: Reflection = {
      id: crypto.randomUUID(),
      missionId: mission.id,
      outcome,
      effort,
      note: note.trim(),
      createdAt: new Date().toISOString()
    };

    // The server (or the sync replay) also records the outcome and advances
    // the Route on a completed reflection; a rejection has to keep the form
    // on screen instead of navigating away from an unsaved record.
    let queued = false;
    try {
      ({ queued } = await submitReflectionOrQueue(mission.id, {
        outcome,
        effort,
        note: reflection.note
      }));
    } catch {
      setSubmitError(
        "The reflection could not be saved. Nothing was recorded on the server — please try again."
      );
      setSaving(false);
      return;
    }

    updateData((current) => {
      const currentMission = current.mission;
      // Only the step this Mission actually belongs to may advance. Guessing
      // "the first incomplete step" used to tick off an unrelated level when
      // the Mission carried no routeStepId.
      const routeStepId = currentMission?.routeStepId ?? null;
      const completedAt = new Date().toISOString();

      return {
        ...current,
        reflections: [...current.reflections, reflection],
        route: current.route.map((step) =>
          outcome === "completed" && routeStepId !== null && !step.completed && step.id === routeStepId
            ? { ...step, completed: true }
            : step
        ),
        missionHistory: currentMission
          ? [
              ...current.missionHistory.filter((item) => item.id !== currentMission.id),
              {
                ...currentMission,
                status: outcome,
                ...(outcome !== "not_today" ? { completedAt } : {})
              }
            ]
          : current.missionHistory,
        mission: null
      };
    });

    if (queued) {
      // Same situation as an offline Check-In, same promise: recorded here,
      // synced when the connection returns.
      setQueuedNote(true);
      setSaving(false);
      return;
    }

    await refresh().catch(() => undefined);
    setSaving(false);
    navigate("/app/today", { replace: true });
  };

  return (
    <main className="app-page flow-page reflection-page">
      <header className="flow-heading">
        <Link className="icon-button" to="/app/mission" aria-label="Back to Mission" title="Back to Mission">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <p className="app-kicker">Reflection, not evaluation</p>
          <h1>What did this step feel like?</h1>
          <p>Your answer changes the next suggestion. It does not become a score.</p>
        </div>
      </header>

      <div className="reflection-mission">
        <span>Mission</span>
        <p>{mission.title}</p>
      </div>

      <form className="reflection-form" onSubmit={handleSubmit}>
        <fieldset className="outcome-options">
          <legend>How did today unfold?</legend>
          <div>
            {outcomes.map(({ value, label, copy, icon: Icon }) => (
              <label className={outcome === value ? "is-selected" : ""} key={value}>
                <input
                  type="radio"
                  name="outcome"
                  value={value}
                  checked={outcome === value}
                  onChange={() => setOutcome(value)}
                />
                <Icon aria-hidden="true" />
                <strong>{label}</strong>
                <span>{copy}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="effort-options effort-fillbar">
          <legend>How much effort did it take?</legend>
          {/* Fill-bar — a radio group with one tab stop; arrows move the value. */}
          <div className="effort-track" role="radiogroup" aria-label="Effort level">
            <div
              className="effort-fill"
              aria-hidden="true"
              style={{ width: `${((effort - 1) / 4) * 100}%` }}
            />
            {effortLabels.map((label, index) => {
              const value = (index + 1) as EffortLevel;
              const pct = (index / 4) * 100;
              return (
                <button
                  key={label}
                  type="button"
                  ref={(element) => { effortStopRefs.current[index] = element; }}
                  className={`effort-stop${effort === value ? " is-active" : ""}`}
                  style={{ left: `${pct}%` }}
                  role="radio"
                  aria-checked={effort === value}
                  aria-label={label}
                  tabIndex={effort === value ? 0 : -1}
                  onClick={() => setEffort(value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                      e.preventDefault();
                      moveEffort(Math.min(5, effort + 1) as EffortLevel);
                    }
                    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                      e.preventDefault();
                      moveEffort(Math.max(1, effort - 1) as EffortLevel);
                    }
                  }}
                />
              );
            })}
          </div>
          {/* Axis labels */}
          <div className="effort-axis" aria-hidden="true">
            {effortLabels.map((label, index) => (
              <span key={label} className={effort === (index + 1) as EffortLevel ? "is-active" : ""}>{label}</span>
            ))}
          </div>
          {/* Screen-reader announced selection */}
          <p className="sr-only" aria-live="polite">
            Effort: {effortLabels[effort - 1]}
          </p>
        </fieldset>

        <label className="checkin-note">
          Keep a note for next time <span>Optional</span>
          <textarea
            rows={4}
            maxLength={500}
            value={note}
            placeholder="What helped, what got in the way, or what changed"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <aside className="next-adjustment">
          <p className="app-kicker">What ReNew will carry forward</p>
          <p>{adaptationCopy}</p>
        </aside>

        {submitError && <p className="auth-note" role="alert">{submitError}</p>}

        <button className="primary-command flow-submit" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save reflection"} <ArrowRight aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}
