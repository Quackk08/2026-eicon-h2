import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CloudOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { CheckInRecord, EffortLevel } from "../data/appData";
import { requestDailyRecommendation, submitCheckInOrQueue } from "../api/backend";
import { useAppState } from "../state/AppState";

const responseLabels = ["Very low", "Low", "In between", "Good", "Strong"] as const;
const inverseLabels = ["Very light", "Light", "Manageable", "Heavy", "Very heavy"] as const;

interface CheckInValues {
  mood: EffortLevel;
  energy: EffortLevel;
  capacity: EffortLevel;
  stress: EffortLevel;
  sleep: EffortLevel;
  socialLoad: EffortLevel;
}

function SignalField({
  label,
  fieldId,
  prompt,
  value,
  labels = responseLabels,
  onChange
}: {
  label: string;
  fieldId: string;
  prompt: string;
  value: EffortLevel;
  labels?: readonly string[];
  onChange: (value: EffortLevel) => void;
}) {
  const fillPct = ((value - 1) / 4) * 100;

  return (
    <fieldset className="signal-field">
      <legend>{label}</legend>
      <p>{prompt}</p>
      <div className="signal-fill-track" aria-hidden="true">
        <span className="signal-fill-bar" style={{ width: `${fillPct}%` }} />
      </div>
      {/* Pointer-friendly duplicate of the radio group below; one control is
          enough for assistive tech, so this one stays out of its way. */}
      <input
        type="range"
        className="signal-range-slider"
        id={`${fieldId}-slider`}
        min={1}
        max={5}
        step={1}
        value={value}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => onChange(Number(e.target.value) as EffortLevel)}
      />
      <div role="radiogroup" aria-labelledby={`${fieldId}-legend`}>
        <span id={`${fieldId}-legend`} className="sr-only">{label} — select a value</span>
        {labels.map((item, index) => {
          const optionValue = (index + 1) as EffortLevel;
          return (
            <label className={value === optionValue ? "is-selected" : ""} key={item}>
              <input
                type="radio"
                name={fieldId}
                value={optionValue}
                checked={value === optionValue}
                onChange={() => onChange(optionValue)}
              />
              <span aria-hidden="true" />
              {item}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CheckInPage() {
  const navigate = useNavigate();
  const { data, updateData, refresh } = useAppState();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"quick" | "standard">("quick");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<CheckInValues>({
    mood: 3, energy: 3, capacity: 3, stress: 3, sleep: 3, socialLoad: 3
  });
  const [note, setNote] = useState("");
  // Saved here, not on the server yet — the one thing worth saying plainly at
  // the moment it happens.
  const [queuedLocally, setQueuedLocally] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const location = useLocation();

  /*
   * Navigating to Check-In while already standing on the confirmation does
   * not remount this page, so without this the "Saved on this device" screen
   * would answer every later attempt and the sidebar's Check-In link would
   * appear to do nothing. Keyed on the location rather than the path, since
   * both are /app/check-in.
   */
  useEffect(() => setQueuedLocally(false), [location.key]);

  /* A1: Guard — Vision must exist before Check-In is useful */
  if (!data.vision.title.trim()) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Set your direction first</p>
        <h1>Check-In works best once you have a Life Vision.</h1>
        <p>A Vision gives every Check-In a destination to aim toward.</p>
        <Link className="primary-command" to="/app/vision">
          Create a Life Vision <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  /*
   * The Check-In is recorded; only today's suggestion is missing, and it is
   * missing for a reason that will pass. Framing it as saved rather than
   * failed matters — this is a record of how someone actually was, and the
   * app promises never to lose one.
   */
  if (queuedLocally) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Saved on this device</p>
        <h1>Your Check-In is recorded.</h1>
        <p>
          Today's step needs the connection back. It will arrive on its own once ReNew can
          reach the server — nothing here is lost in the meantime.
        </p>
        <Link className="primary-command" to="/app/today">
          Back to Today <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const setSignal = (key: keyof CheckInValues, value: EffortLevel) =>
    setValues((current) => ({ ...current, [key]: value }));

  const totalSteps = mode === "quick" ? 5 : 8;

  const submitCheckIn = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const record: CheckInRecord = {
      id: crypto.randomUUID(),
      type: mode,
      createdAt: new Date().toISOString(),
      mood: values.mood,
      energy: values.energy,
      capacity: values.capacity,
      ...(mode === "standard"
        ? { stress: values.stress, sleep: values.sleep, socialLoad: values.socialLoad }
        : {}),
      ...(note.trim() ? { note: note.trim() } : {})
    };
    // Written locally first so a Check-In is never lost to a failed request.
    updateData((current) => ({ ...current, checkIns: [...current.checkIns, record] }));

    try {
      const { queued } = await submitCheckInOrQueue(record);
      // Offline, the Check-In is in the outbox and there is nothing for the
      // server to base a new suggestion on yet — asking would only fail.
      if (queued) {
        // Sending someone to a suggestion that cannot exist yet reads as the
        // Check-In having vanished. Say where it went instead.
        setQueuedLocally(true);
        return;
      }
    } catch {
      // The server refused the record outright (not a connection problem, or
      // it would have been queued). Silently moving on read as success while
      // the record only existed on this device.
      setSubmitError(
        "This Check-In is kept on this device, but the server did not accept it. You can continue — today's suggestion will be based on your previous records."
      );
      setSubmitting(false);
      return;
    }

    // A Check-In is what today's suggestion is based on, so ask for a new one
    // now rather than leaving the previous pick on screen. Failing to get one
    // is not failing the Check-In — the Recommendation page explains itself.
    try {
      await requestDailyRecommendation();
    } catch {
      // No recommendation could be generated (e.g. no active Vision yet).
    }
    await refresh().catch(() => undefined);
    setSubmitting(false);
    navigate("/app/recommendation");
  };

  const continueDespiteError = () => {
    setSubmitError(null);
    navigate("/app/recommendation");
  };

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="checkin-step">
          <p className="app-kicker">A moment, not a measure</p>
          <h1>What is today giving you to work with?</h1>
          <p>Choose the depth that feels right right now.</p>
          <div className="checkin-mode-cards">
            <button type="button" className={`checkin-mode-card ${mode === "quick" ? "is-selected" : ""}`}
              onClick={() => { setMode("quick"); setStep(1); }}>
              <strong>Quick</strong><span>3 signals</span><small>Mood, energy, capacity</small>
            </button>
            <button type="button" className={`checkin-mode-card ${mode === "standard" ? "is-selected" : ""}`}
              onClick={() => { setMode("standard"); setStep(1); }}>
              <strong>Standard</strong><span>6 signals</span><small>Adds stress, sleep, and social load</small>
            </button>
          </div>
        </div>
      );
    }
    if (step === 1) return <SignalField label="Mood" fieldId="checkin-mood" prompt="How does your inner weather feel?" value={values.mood} onChange={(v) => setSignal("mood", v)} />;
    if (step === 2) return <SignalField label="Energy" fieldId="checkin-energy" prompt="How much energy feels available?" value={values.energy} onChange={(v) => setSignal("energy", v)} />;
    if (step === 3) return <SignalField label="Everyday capacity" fieldId="checkin-capacity" prompt="How possible do ordinary tasks feel?" value={values.capacity} onChange={(v) => setSignal("capacity", v)} />;
    if (mode === "standard" && step === 4) return <SignalField label="Stress load" fieldId="checkin-stress" prompt="How much pressure are you carrying?" value={values.stress} labels={inverseLabels} onChange={(v) => setSignal("stress", v)} />;
    if (mode === "standard" && step === 5) return <SignalField label="Sleep" fieldId="checkin-sleep" prompt="How restorative did your recent sleep feel?" value={values.sleep} onChange={(v) => setSignal("sleep", v)} />;
    if (mode === "standard" && step === 6) return <SignalField label="Social load" fieldId="checkin-social" prompt="How demanding does being around people feel?" value={values.socialLoad} labels={inverseLabels} onChange={(v) => setSignal("socialLoad", v)} />;
    return (
      <div className="checkin-step">
        <h1>Anything worth remembering?</h1>
        <p>This is optional. Write a short note for your own context, or skip ahead.</p>
        <label className="checkin-note">
          <span>Optional note</span>
          <textarea rows={4} maxLength={500} placeholder="A short note for your own context" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="local-save-note">
          <CloudOff aria-hidden="true" />
          <p><strong>Saved on this device first.</strong> You can complete a Check-In without a connection.</p>
        </div>
      </div>
    );
  };

  return (
    <main className="app-page flow-page checkin-page">
      <header className="checkin-header">
        {step > 0 ? (
          <button className="icon-button" type="button" onClick={goBack} aria-label="Back" title="Back">
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : (
          <Link className="icon-button" to="/app/today" aria-label="Back to Today" title="Back to Today">
            <ArrowLeft aria-hidden="true" />
          </Link>
        )}
        <div className="checkin-progress">
          <span>Step {Math.min(step + 1, totalSteps)} of {totalSteps}</span>
          <div className="checkin-progress-bar" aria-hidden="true">
            <i style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>
      </header>

      {renderStep()}

      {submitError && (
        <div className="checkin-submit-error" role="alert">
          <p>{submitError}</p>
          <button className="secondary-command" type="button" onClick={continueDespiteError}>
            Continue anyway <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="checkin-actions">
        {step < totalSteps - 1 ? (
          <button className="primary-command" type="button" onClick={goNext}>
            Continue <ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <button className="primary-command flow-submit" type="button" disabled={submitting} onClick={submitCheckIn}>
            Find a workable step <ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>
    </main>
  );
}
