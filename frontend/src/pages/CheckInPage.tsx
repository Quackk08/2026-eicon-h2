import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CloudOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { EffortLevel } from "../data/appData";
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
  prompt,
  value,
  labels = responseLabels,
  onChange
}: {
  label: string;
  prompt: string;
  value: EffortLevel;
  labels?: readonly string[];
  onChange: (value: EffortLevel) => void;
}) {
  return (
    <fieldset className="signal-field">
      <legend>{label}</legend>
      <p>{prompt}</p>
      <div>
        {labels.map((item, index) => {
          const optionValue = (index + 1) as EffortLevel;
          return (
            <label className={value === optionValue ? "is-selected" : ""} key={item}>
              <input
                type="radio"
                name={label}
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
  const { updateData } = useAppState();
  const [mode, setMode] = useState<"quick" | "standard">("quick");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<CheckInValues>({
    mood: 3,
    energy: 3,
    capacity: 3,
    stress: 3,
    sleep: 3,
    socialLoad: 3
  });
  const [note, setNote] = useState("");

  const setSignal = (key: keyof CheckInValues, value: EffortLevel) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const totalSteps = mode === "quick" ? 5 : 8; // mode + 3 signals + note (or + 3 more signals for standard)
  const stepTitle = () => {
    if (step === 0) return "How deep today?";
    if (step === 1) return "Inner weather";
    if (step === 2) return "Available energy";
    if (step === 3) return "Everyday capacity";
    if (step === 4 && mode === "standard") return "Pressure carried";
    if (step === 5 && mode === "standard") return "Recent sleep";
    if (step === 6 && mode === "standard") return "Social demand";
    if (step === totalSteps - 1) return "Optional note";
    return "";
  };

  const submitCheckIn = () => {
    const record = {
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

    updateData((current) => ({ ...current, checkIns: [...current.checkIns, record] }));
    navigate("/app/recommendation");
  };

  const canContinue = () => {
    if (step === 0) return true; // mode is always selectable
    return true; // all signal fields have defaults
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
            <button
              type="button"
              className={`checkin-mode-card ${mode === "quick" ? "is-selected" : ""}`}
              onClick={() => { setMode("quick"); setStep(1); }}
            >
              <strong>Quick</strong>
              <span>3 signals</span>
              <small>Mood, energy, capacity</small>
            </button>
            <button
              type="button"
              className={`checkin-mode-card ${mode === "standard" ? "is-selected" : ""}`}
              onClick={() => { setMode("standard"); setStep(1); }}
            >
              <strong>Standard</strong>
              <span>6 signals</span>
              <small>Adds stress, sleep, and social load</small>
            </button>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <SignalField
          label="Mood"
          prompt="How does your inner weather feel?"
          value={values.mood}
          onChange={(value) => setSignal("mood", value)}
        />
      );
    }

    if (step === 2) {
      return (
        <SignalField
          label="Energy"
          prompt="How much energy feels available?"
          value={values.energy}
          onChange={(value) => setSignal("energy", value)}
        />
      );
    }

    if (step === 3) {
      return (
        <SignalField
          label="Everyday capacity"
          prompt="How possible do ordinary tasks feel?"
          value={values.capacity}
          onChange={(value) => setSignal("capacity", value)}
        />
      );
    }

    if (mode === "standard" && step === 4) {
      return (
        <SignalField
          label="Stress load"
          prompt="How much pressure are you carrying?"
          value={values.stress}
          labels={inverseLabels}
          onChange={(value) => setSignal("stress", value)}
        />
      );
    }

    if (mode === "standard" && step === 5) {
      return (
        <SignalField
          label="Sleep"
          prompt="How restorative did your recent sleep feel?"
          value={values.sleep}
          onChange={(value) => setSignal("sleep", value)}
        />
      );
    }

    if (mode === "standard" && step === 6) {
      return (
        <SignalField
          label="Social load"
          prompt="How demanding does being around people feel?"
          value={values.socialLoad}
          labels={inverseLabels}
          onChange={(value) => setSignal("socialLoad", value)}
        />
      );
    }

    // Final step: Optional note
    return (
      <div className="checkin-step">
        <p className="app-kicker">Step {step + 1} of {totalSteps}</p>
        <h1>Anything worth remembering?</h1>
        <p>This is optional. Write a short note for your own context, or skip ahead.</p>
        <label className="checkin-note">
          <span>Optional note</span>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="A short note for your own context"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
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

      <div className="checkin-actions">
        {step > 0 && (
          <button className="secondary-command" type="button" onClick={goBack}>
            Back
          </button>
        )}
        {step < totalSteps - 1 ? (
          <button className="primary-command" type="button" onClick={goNext} disabled={!canContinue()}>
            Continue <ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <button className="primary-command flow-submit" type="button" onClick={submitCheckIn}>
            Find a workable step <ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>
    </main>
  );
}
