import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Pause,
  Play
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createMissionFromOption, type MissionVariant } from "../data/appData";
import { getMissionPlace } from "../data/missionLogic";
import { adaptMission, updateMission as updateMissionOnServer } from "../api/backend";
import { useAppState } from "../state/AppState";

/* ─── Size-adjustment stepper data ─── */

const sizeSteps = [
  { key: "minimum", label: "Minimum action", description: "The smallest possible version — just showing up counts." },
  { key: "lighter", label: "A little lighter", description: "Shorter duration or a simpler location." },
  { key: "recommended", label: "Recommended size", description: "Today's suggested step, matched to your conditions." },
  { key: "more", label: "A little more", description: "A bit further or longer if energy allows." }
] as const;
type SizeKey = typeof sizeSteps[number]["key"];

/* ─── Timer helpers ─── */

function formatCountdown(seconds: number): string {
  const m = Math.floor(Math.max(seconds, 0) / 60);
  const s = Math.max(seconds, 0) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MissionPage() {
  const navigate = useNavigate();
  const { data, updateData, refresh } = useAppState();
  const mission = data.mission;
  const matchingPlace = mission ? getMissionPlace(data, mission) : null;
  const reducedMotion = data.settings.reducedMotion;

  /* ─── Timer state ─── */
  const totalSeconds = (mission?.durationMinutes ?? 0) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Start/stop the interval when timerRunning changes */
  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimerRunning(false);
          setTimerDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  /* Reset timer if mission changes */
  useEffect(() => {
    setSecondsLeft((mission?.durationMinutes ?? 0) * 60);
    setTimerRunning(false);
    setTimerDone(false);
  }, [mission?.id]);

  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  /* ─── Size-stepper state ─── */
  const [showStepper, setShowStepper] = useState(false);
  const [activeSize, setActiveSize] = useState<SizeKey>("recommended");
  const stepperRef = useRef<HTMLDivElement>(null);

  const applySize = async (key: SizeKey) => {
    if (!mission) return;

    if (key === "minimum" || key === "lighter" || key === "more") {
      try {
        await adaptMission(mission.id, key === "more" ? "bigger" : "smaller");
        await refresh();
        setActiveSize(key);
        setShowStepper(false);
        return;
      } catch {
        // Fall through to the locally known option when the backend is unavailable.
      }
    }

    const variantMap: Record<SizeKey, MissionVariant> = {
      minimum: "different",
      lighter: "lighter",
      recommended: "recommended",
      more: "more"
    };
    const targetVariant = variantMap[key];
    const target = data.recommendations.find((o) => o.variant === targetVariant)
      ?? data.recommendations.find((o) => o.variant === "lighter")
      ?? data.recommendations[0];
    if (!target || !mission) return;
    updateData((current) => ({
      ...current,
      mission: current.mission
        ? createMissionFromOption(target, {
            id: current.mission.id,
            status: "planned",
            selectedAt: current.mission.selectedAt,
            scheduledFor: current.mission.scheduledFor
          })
        : null
    }));
    setActiveSize(key);
    setShowStepper(false);
  };

  const handleStepperKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = sizeSteps.findIndex((s) => s.key === activeSize);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = sizeSteps[Math.min(idx + 1, sizeSteps.length - 1)];
      setActiveSize(next.key);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = sizeSteps[Math.max(idx - 1, 0)];
      setActiveSize(prev.key);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      applySize(activeSize);
    } else if (e.key === "Escape") {
      setShowStepper(false);
    }
  };

  /* A1: Guard — need an active mission to reach this page */
  if (!mission) {
    const hasCheckIn = data.checkIns.length > 0;
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">No Mission selected yet</p>
        <h1>Choose a workable step first.</h1>
        <p>Start with a Check-In and pick the size that fits today.</p>
        {hasCheckIn ? (
          <Link className="primary-command" to="/app/recommendation">
            See recommendations <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <Link className="primary-command" to="/app/check-in">
            Start Check-In <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </main>
    );
  }

  const setMissionStatus = (status: "planned" | "in_progress" | "completed" | "not_today") => {
    updateData((current) => ({
      ...current,
      mission: current.mission
        ? {
            ...current.mission,
            status,
            ...(status === "in_progress" ? { startedAt: new Date().toISOString() } : {})
          }
        : null
    }));
  };

  const startMission = () => {
    setMissionStatus("in_progress");
    setTimerRunning(true);
    void updateMissionOnServer(mission.id, { status: "in_progress" })
      .then(() => refresh())
      .catch(() => undefined);
  };

  const finishMission = (status: "completed" | "not_today") => {
    setTimerRunning(false);
    updateData((current) => ({
      ...current,
      mission: current.mission
        ? {
            ...current.mission,
            status,
            ...(status === "completed" ? { completedAt: new Date().toISOString() } : {})
          }
        : null
    }));
    navigate("/app/reflection");
  };

  const activeStepInfo = sizeSteps.find((s) => s.key === activeSize) ?? sizeSteps[2];

  return (
    <main className="app-page flow-page mission-page">
      <header className="mission-topbar">
        <Link className="icon-button" to="/app/today" aria-label="Back to Today" title="Back to Today">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <span className={`mission-status is-${mission.status}`}>{mission.status.replace("_", " ")}</span>
      </header>

      <section className="mission-hero">
        <p className="app-kicker">Today's Mission</p>
        <h1>{mission.title}</h1>
        <p>{mission.description}</p>
        <div>
          <span><Clock3 aria-hidden="true" /> {mission.durationMinutes} minutes</span>
          <span><MapPin aria-hidden="true" /> {mission.placeType}</span>
        </div>
      </section>

      <div className="mission-layout">
        <section className="mission-actions" aria-labelledby="mission-action-title">
          <p className="app-kicker">Choose the next moment</p>
          <h2 id="mission-action-title">The Mission follows your pace.</h2>

          {/* ── In-progress timer ── */}
          {mission.status === "in_progress" && (
            <div className="mission-timer" role="timer" aria-live="off" aria-label="Mission timer">
              {/* Numeric countdown — always visible, primary element */}
              <p className="mission-timer-display" aria-atomic="true">
                {timerDone ? "Time's up" : formatCountdown(secondsLeft)}
              </p>
              {timerDone && (
                <p className="mission-timer-done" aria-live="polite">
                  Your {mission.durationMinutes}-minute Mission window is complete.
                </p>
              )}

              {/* SVG ring — secondary, skipped when reduced motion */}
              {!reducedMotion && totalSeconds > 0 && (
                <svg
                  className="mission-timer-ring"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <circle cx="50" cy="50" r="44" />
                  <circle
                    className="mission-timer-progress"
                    cx="50"
                    cy="50"
                    r="44"
                    style={{
                      strokeDashoffset: `${276.46 * (1 - progressPct / 100)}`
                    }}
                  />
                </svg>
              )}

              <div className="mission-timer-controls">
                {!timerDone && (
                  <button
                    className="secondary-command"
                    type="button"
                    aria-label={timerRunning ? "Pause timer" : "Start timer"}
                    onClick={() => setTimerRunning((r) => !r)}
                  >
                    {timerRunning ? <><Pause aria-hidden="true" /> Pause</> : <><Play aria-hidden="true" /> Resume</>}
                  </button>
                )}
                <button
                  className="primary-command"
                  type="button"
                  onClick={() => finishMission("completed")}
                >
                  <CheckCircle2 aria-hidden="true" /> Mark complete
                </button>
              </div>
            </div>
          )}

          {mission.status === "planned" && (
            <button className="primary-command" type="button" onClick={startMission}>
              <Play aria-hidden="true" /> Start this step
            </button>
          )}

          {(mission.status === "completed" || mission.status === "partly" || mission.status === "not_today") && (
            <button className="primary-command" type="button" onClick={() => navigate("/app/reflection")}>
              <ArrowRight aria-hidden="true" /> Open reflection
            </button>
          )}

          {/* ── Visual size-adjustment stepper ── */}
          <button
            className="secondary-command"
            type="button"
            aria-expanded={showStepper}
            aria-controls="mission-size-stepper"
            onClick={() => setShowStepper((v) => !v)}
          >
            Make it smaller or bigger
          </button>

          {showStepper && (
            <div
              id="mission-size-stepper"
              className="mission-size-stepper"
              ref={stepperRef}
              role="group"
              aria-label="Adjust Mission size"
              tabIndex={0}
              onKeyDown={handleStepperKey}
            >
              <p className="mission-stepper-hint">
                Drag or use arrow keys to adjust today's size.
              </p>
              <div className="mission-stepper-track" aria-hidden="true">
                {sizeSteps.map((step, i) => (
                  <button
                    key={step.key}
                    className={`mission-stepper-stop${activeSize === step.key ? " is-active" : ""}`}
                    type="button"
                    aria-pressed={activeSize === step.key}
                    aria-label={step.label}
                    style={{ left: `${(i / (sizeSteps.length - 1)) * 100}%` }}
                    onClick={() => setActiveSize(step.key)}
                  />
                ))}
                <div
                  className="mission-stepper-fill"
                  style={{
                    width: `${(sizeSteps.findIndex((s) => s.key === activeSize) / (sizeSteps.length - 1)) * 100}%`
                  }}
                />
              </div>
              <div className="mission-stepper-labels" aria-hidden="true">
                {sizeSteps.map((step) => (
                  <span key={step.key} className={activeSize === step.key ? "is-active" : ""}>{step.label}</span>
                ))}
              </div>
              <p className="mission-stepper-description" aria-live="polite">
                {activeStepInfo.description}
              </p>
              <div className="mission-stepper-actions">
                <button
                  className="primary-command"
                  type="button"
                  onClick={() => applySize(activeSize)}
                >
                  Apply this size <ArrowRight aria-hidden="true" />
                </button>
                <button
                  className="secondary-command"
                  type="button"
                  onClick={() => setShowStepper(false)}
                >
                  Keep current
                </button>
              </div>
            </div>
          )}

          <button className="mission-text-action" type="button" onClick={() => finishMission("not_today")}>
            <Pause aria-hidden="true" /> Not today
          </button>

          <details className="mission-boundaries">
            <summary>Any part of this still counts</summary>
            <div>
              <p>Stopping after arrival</p>
              <p>Changing the place</p>
              <p>Trying only the first two minutes</p>
              <p>Choosing not to continue today</p>
            </div>
          </details>
        </section>

        <section className="mission-place" aria-labelledby="mission-place-title">
          <div className={`mission-place-visual is-${matchingPlace?.color ?? "leaf"}`} aria-hidden="true">
            <span>{matchingPlace?.type ?? mission.format}</span>
          </div>
          <div>
            <p className="app-kicker">Mission setting</p>
            <h2 id="mission-place-title">{matchingPlace?.name ?? mission.placeType}</h2>
            <p>
              {matchingPlace ? `${matchingPlace.distanceKm} km / ${matchingPlace.cost}` : `No travel / ${mission.estimatedCost}`}
              {` / ${mission.socialMode}`}
            </p>
            <p>{mission.supplies.length > 0 ? `Bring: ${mission.supplies.join(", ")}` : "Nothing extra to bring"}</p>
            {matchingPlace && (
              <Link className="inline-arrow-link" to={`/app/places/${matchingPlace.id}`}>
                View place details <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
