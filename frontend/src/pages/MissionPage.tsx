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
import { adaptMission, updateMissionStatusOrQueue } from "../api/backend";
import { PlacePhoto } from "../components/PlacePhoto";
import { useAppState } from "../state/AppState";

/* ─── Size-adjustment stepper data ───
   Three stops, because that is what adaptation actually does: one ladder
   level down, stay, or one level up. A fourth "minimum" stop used to sit
   here promising "the smallest possible version" while sending the same
   one-step-down request as "lighter". */

const sizeSteps = [
  { key: "lighter", label: "A little lighter", description: "One level smaller — just showing up counts." },
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

  /* ─── Timer state ───
     The countdown is anchored to the Mission's own startedAt rather than to
     seconds ticked away in component state, so leaving for the place detail
     page (or reloading) no longer restarts a Mission that was half done. */
  const totalSeconds = (mission?.durationMinutes ?? 0) * 60;
  const remainingFromMission = () => {
    if (!mission || mission.status !== "in_progress" || !mission.startedAt) return totalSeconds;
    const elapsed = Math.floor((Date.now() - new Date(mission.startedAt).getTime()) / 1000);
    return Math.min(Math.max(totalSeconds - elapsed, 0), totalSeconds);
  };
  const [secondsLeft, setSecondsLeft] = useState(remainingFromMission);
  const [timerRunning, setTimerRunning] = useState(
    () => mission?.status === "in_progress" && remainingFromMission() > 0
  );
  const timerDone = totalSeconds > 0 && secondsLeft === 0;

  /* Start/stop the interval when timerRunning changes */
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  /* The terminal transition lives outside the state updater, where StrictMode
     cannot run it twice. */
  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) setTimerRunning(false);
  }, [secondsLeft, timerRunning]);

  /* Re-anchor when the mission itself changes */
  useEffect(() => {
    const remaining = remainingFromMission();
    setSecondsLeft(remaining);
    setTimerRunning(mission?.status === "in_progress" && remaining > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- anchored to identity + status
  }, [mission?.id, mission?.status, mission?.startedAt]);

  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  /* ─── Size-stepper state ─── */
  const [showStepper, setShowStepper] = useState(false);
  const [activeSize, setActiveSize] = useState<SizeKey>("recommended");
  const [sizeBusy, setSizeBusy] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const stepperToggleRef = useRef<HTMLButtonElement>(null);

  const closeStepper = () => {
    setShowStepper(false);
    stepperToggleRef.current?.focus();
  };

  const applySize = async (key: SizeKey) => {
    if (!mission || sizeBusy) return;
    setSizeError(null);

    if (key === "recommended") {
      // Staying at the suggested size adjusts nothing.
      setShowStepper(false);
      return;
    }

    setSizeBusy(true);
    try {
      await adaptMission(mission.id, key === "more" ? "bigger" : "smaller");
      await refresh();
      setActiveSize(key);
      setShowStepper(false);
      setSizeBusy(false);
      return;
    } catch {
      // Fall through to the locally known option when the backend is unavailable.
    }

    const variantMap: Record<SizeKey, MissionVariant> = {
      lighter: "lighter",
      recommended: "recommended",
      more: "more"
    };
    const target = data.recommendations.find((o) => o.variant === variantMap[key]);
    setSizeBusy(false);
    if (!target) {
      // Nothing cached locally either. Ending in silence with the stepper
      // still open read as a button that does nothing.
      setSizeError("The size could not be adjusted right now. Please check the connection and try again.");
      return;
    }
    updateData((current) => ({
      ...current,
      mission: current.mission
        ? createMissionFromOption(target, {
            id: current.mission.id,
            // Resizing changes the step, not where the person is in it — an
            // in-progress Mission used to snap back to "planned" here and
            // quietly lose its start time.
            status: current.mission.status,
            selectedAt: current.mission.selectedAt,
            scheduledFor: current.mission.scheduledFor,
            startedAt: current.mission.startedAt
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
      void applySize(activeSize);
    } else if (e.key === "Escape") {
      closeStepper();
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
    void updateMissionStatusOrQueue(mission.id, "in_progress")
      .then(({ queued }) => (queued ? undefined : refresh()))
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
    // The reflection that follows also records the outcome, but without this
    // a refresh in between resurrected the Mission as still open. Queued, so
    // that stays true when the connection is gone.
    void updateMissionStatusOrQueue(mission.id, status).catch(() => undefined);
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
              <p className="mission-timer-display">
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
                {!timerDone ? (
                  <button
                    className="secondary-command"
                    type="button"
                    aria-label={timerRunning ? "Pause timer" : "Start timer"}
                    onClick={() => setTimerRunning((r) => !r)}
                  >
                    {timerRunning ? <><Pause aria-hidden="true" /> Pause</> : <><Play aria-hidden="true" /> Resume</>}
                  </button>
                ) : (
                  /* The window ending is not the Mission ending — more time
                     stays one tap away instead of requiring a page round-trip. */
                  <button
                    className="secondary-command"
                    type="button"
                    onClick={() => {
                      setSecondsLeft(Math.max(Math.round(totalSeconds / 2), 60));
                      setTimerRunning(true);
                    }}
                  >
                    <Play aria-hidden="true" /> A little more time
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
            ref={stepperToggleRef}
            aria-expanded={showStepper}
            aria-controls="mission-size-stepper"
            onClick={() => setShowStepper((v) => !v)}
          >
            Make it smaller or bigger
          </button>

          {showStepper && (
            <div id="mission-size-stepper" className="mission-size-stepper">
              <p className="mission-stepper-hint">
                Use the arrow keys or tap a stop to adjust today's size.
              </p>
              {/* The stops are the real, focusable control — a radio group
                  with one tab stop. The old markup hid them from assistive
                  tech with aria-hidden while leaving them in the tab order. */}
              <div
                className="mission-stepper-track"
                role="radiogroup"
                aria-label="Mission size"
                onKeyDown={handleStepperKey}
              >
                {sizeSteps.map((step, i) => (
                  <button
                    key={step.key}
                    className={`mission-stepper-stop${activeSize === step.key ? " is-active" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={activeSize === step.key}
                    aria-label={step.label}
                    tabIndex={activeSize === step.key ? 0 : -1}
                    style={{ left: `${(i / (sizeSteps.length - 1)) * 100}%` }}
                    onClick={() => setActiveSize(step.key)}
                  />
                ))}
                <div
                  className="mission-stepper-fill"
                  aria-hidden="true"
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
              {sizeError && <p className="auth-note" role="alert">{sizeError}</p>}
              <div className="mission-stepper-actions">
                <button
                  className="primary-command"
                  type="button"
                  disabled={sizeBusy}
                  onClick={() => void applySize(activeSize)}
                >
                  {sizeBusy ? "Adjusting..." : "Apply this size"} <ArrowRight aria-hidden="true" />
                </button>
                <button
                  className="secondary-command"
                  type="button"
                  onClick={closeStepper}
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
          {/* The place someone is actually being sent to is worth seeing
              here, not only back on the Places list — this panel was a flat
              colour even when a photograph of the venue existed. */}
          <div className={`mission-place-visual is-${matchingPlace?.color ?? "leaf"}`} aria-hidden="true">
            <PlacePhoto src={matchingPlace?.imageUrl ?? null} className="mission-place-photo" />
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
