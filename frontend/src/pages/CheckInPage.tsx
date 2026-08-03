import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CloudOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { CheckInRecord, EffortLevel } from "../data/appData";
import { submitCheckIn } from "../api/backend";
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
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"quick" | "standard">("quick");
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

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
      await submitCheckIn(record);
    } catch {
      // Kept on this device; it syncs the next time the backend is reachable.
    } finally {
      setSubmitting(false);
    }

    navigate("/app/recommendation");
  };

  return (
    <main className="app-page flow-page checkin-page">
      <header className="flow-heading">
        <Link className="icon-button" to="/app/today" aria-label="Back to Today" title="Back to Today">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <p className="app-kicker">A moment, not a measure</p>
          <h1>What is today giving you to work with?</h1>
          <p>Choose the words that feel closest. This only adjusts the size and setting of your next step.</p>
        </div>
      </header>

      <div className="flow-mode-tabs" role="tablist" aria-label="Check-In length">
        <button
          className={mode === "quick" ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={mode === "quick"}
          onClick={() => setMode("quick")}
        >
          Quick <span>3 signals</span>
        </button>
        <button
          className={mode === "standard" ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={mode === "standard"}
          onClick={() => setMode("standard")}
        >
          Standard <span>6 signals</span>
        </button>
      </div>

      <form className="checkin-form" onSubmit={handleSubmit}>
        <SignalField
          label="Mood"
          prompt="How does your inner weather feel?"
          value={values.mood}
          onChange={(value) => setSignal("mood", value)}
        />
        <SignalField
          label="Energy"
          prompt="How much energy feels available?"
          value={values.energy}
          onChange={(value) => setSignal("energy", value)}
        />
        <SignalField
          label="Everyday capacity"
          prompt="How possible do ordinary tasks feel?"
          value={values.capacity}
          onChange={(value) => setSignal("capacity", value)}
        />

        {mode === "standard" && (
          <>
            <SignalField
              label="Stress load"
              prompt="How much pressure are you carrying?"
              value={values.stress}
              labels={inverseLabels}
              onChange={(value) => setSignal("stress", value)}
            />
            <SignalField
              label="Sleep"
              prompt="How restorative did your recent sleep feel?"
              value={values.sleep}
              onChange={(value) => setSignal("sleep", value)}
            />
            <SignalField
              label="Social load"
              prompt="How demanding does being around people feel?"
              value={values.socialLoad}
              labels={inverseLabels}
              onChange={(value) => setSignal("socialLoad", value)}
            />
          </>
        )}

        <label className="checkin-note">
          Anything worth remembering? <span>Optional</span>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="A short note for your own context"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="local-save-note">
          <CloudOff aria-hidden="true" />
          <p><strong>Saved on this device first.</strong> You can complete a Check-In without a connection.</p>
        </div>

        <button className="primary-command flow-submit" type="submit" disabled={submitting}>
          Find a workable step <ArrowRight aria-hidden="true" />
        </button>
      </form>
    </main>
  );
}
