import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleDot, Pause } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { EffortLevel, Reflection } from "../data/appData";
import { submitReflection } from "../api/backend";
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

  if (!mission) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Nothing to reflect on yet</p>
        <h1>Your record begins after a chosen Mission.</h1>
        <p>Start with a Check-In and choose a step that fits today.</p>
        <Link className="primary-command" to="/app/check-in">
          Start Check-In <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const adaptationCopy =
    outcome === "completed" && effort <= 3
      ? "Keep this step available and let the next Check-In decide whether to extend it."
      : outcome === "partly"
        ? "Keep the same direction and begin one level smaller next time."
        : "Pause this step without penalty. Your route will still be here when conditions change.";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const reflection: Reflection = {
      id: crypto.randomUUID(),
      missionId: mission.id,
      outcome,
      effort,
      note: note.trim(),
      createdAt: new Date().toISOString()
    };

    updateData((current) => {
      const currentMission = current.mission;
      const routeStepId = currentMission?.routeStepId ?? current.route.find((item) => !item.completed)?.id;
      const completedAt = new Date().toISOString();

      return {
        ...current,
        reflections: [...current.reflections, reflection],
        route: current.route.map((step) =>
          outcome === "completed" && !step.completed && step.id === routeStepId
            ? { ...step, completed: true }
            : step
        ),
        missionHistory: currentMission
          ? [
              ...current.missionHistory.filter((item) => item.id !== currentMission.id),
              { ...currentMission, status: outcome, completedAt }
            ]
          : current.missionHistory,
        mission: null
      };
    });

    try {
      await submitReflection(mission.id, { outcome, effort, note: reflection.note });
      await refresh();
    } catch {
      // Recorded locally; it syncs the next time the backend is reachable.
    } finally {
      setSaving(false);
    }

    navigate("/app/today");
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

        <fieldset className="effort-options">
          <legend>How much effort did it take?</legend>
          <div>
            {effortLabels.map((label, index) => {
              const value = (index + 1) as EffortLevel;
              return (
                <label className={effort === value ? "is-selected" : ""} key={label}>
                  <input
                    type="radio"
                    name="effort"
                    value={value}
                    checked={effort === value}
                    onChange={() => setEffort(value)}
                  />
                  <i aria-hidden="true" />
                  {label}
                </label>
              );
            })}
          </div>
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

        <button className="primary-command flow-submit" type="submit" disabled={saving}>
          Save reflection <ArrowRight aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}
