import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Download,
  LogOut,
  Moon,
  RefreshCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { CheckInRhythm } from "../data/appData";
import { useAppState } from "../state/AppState";

const weekDays = [
  { value: 0, short: "Sun", long: "Sunday" },
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" }
] as const;

export function SettingsPage() {
  const navigate = useNavigate();
  const { data, ready, updateData, resetDemo } = useAppState();
  const [name, setName] = useState(data.profile.name);
  const [email, setEmail] = useState(data.profile.email);
  const [resetOpen, setResetOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((current) => ({
      ...current,
      profile: { ...current.profile, name: name.trim(), email: email.trim() }
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const updateSetting = <Key extends keyof typeof data.settings>(
    key: Key,
    value: (typeof data.settings)[Key]
  ) => {
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value }
    }));
  };

  const updateRhythm = (updates: Partial<CheckInRhythm>) => {
    updateData((current) => {
      const checkInRhythm = { ...current.settings.checkInRhythm, ...updates };
      return {
        ...current,
        settings: {
          ...current.settings,
          checkInTime: checkInRhythm.time,
          reminders: checkInRhythm.enabled,
          checkInRhythm
        }
      };
    });
  };

  const updateFrequency = (frequency: CheckInRhythm["frequency"]) => {
    const days =
      frequency === "daily"
        ? [0, 1, 2, 3, 4, 5, 6]
        : frequency === "weekdays"
          ? [1, 2, 3, 4, 5]
          : frequency === "weekly"
            ? [data.settings.checkInRhythm.days[0] ?? 1]
            : data.settings.checkInRhythm.days.length > 0
              ? data.settings.checkInRhythm.days
              : [1];
    updateRhythm({ frequency, days });
  };

  const toggleCustomDay = (day: number) => {
    const currentDays = data.settings.checkInRhythm.days;
    const days = currentDays.includes(day)
      ? currentDays.length > 1
        ? currentDays.filter((item) => item !== day)
        : currentDays
      : [...currentDays, day].sort((a, b) => a - b);
    updateRhythm({ days });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `renew-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const performReset = async () => {
    await resetDemo();
    setResetOpen(false);
    navigate("/onboarding");
  };

  const signOut = () => {
    updateData((current) => ({
      ...current,
      profile: { ...current.profile, signedIn: false }
    }));
    navigate("/login");
  };

  if (!ready) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span /><p>Loading settings stored on this device...</p>
      </main>
    );
  }

  return (
    <main className="app-page settings-page">
      <header className="settings-heading">
        <p className="app-kicker">Settings</p>
        <h1>Keep ReNew on your terms.</h1>
        <p>Manage timing, comfort, local data, and the connections you choose to keep.</p>
      </header>

      <div className="settings-layout">

        {/* ── Group 1: Account ── */}
        <section className="settings-section settings-group" aria-labelledby="group-account">
          <div className="settings-group-heading">
            <UserRound aria-hidden="true" />
            <h2 id="group-account">Account</h2>
          </div>
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="field-group">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field-group">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="primary-command" type="submit">
              <Save aria-hidden="true" /> {saved ? "Saved" : "Save profile"}
            </button>
          </form>
          <div className="settings-links">
            <button className="settings-link-row secondary-command" type="button" onClick={exportData}>
              <Download aria-hidden="true" /><span>Export data<strong>Download your records as JSON</strong></span>
            </button>
            <button className="settings-link-row text-button" type="button" onClick={signOut}>
              <LogOut aria-hidden="true" /><span>Sign out</span>
            </button>
            <button className="settings-link-row text-button danger-command" type="button" onClick={() => setResetOpen(true)}>
              <RefreshCcw aria-hidden="true" /><span>Reset demo data</span>
            </button>
          </div>
        </section>

        {/* ── Group 2: Check-in & Notifications ── */}
        <section className="settings-section settings-group" aria-labelledby="group-checkin">
          <div className="settings-group-heading">
            <Moon aria-hidden="true" />
            <h2 id="group-checkin">Check-in &amp; Notifications</h2>
          </div>
          <div className="settings-rows">
            <label className="settings-row">
              <div><strong>Frequency</strong><span>Choose when ReNew should offer a Check-In</span></div>
              <select
                value={data.settings.checkInRhythm.frequency}
                onChange={(e) => updateFrequency(e.target.value as CheckInRhythm["frequency"])}
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {data.settings.checkInRhythm.frequency === "weekly" && (
              <label className="settings-row">
                <div><strong>Day</strong><span>The weekly Check-In day</span></div>
                <select
                  value={data.settings.checkInRhythm.days[0] ?? 1}
                  onChange={(e) => updateRhythm({ days: [Number(e.target.value)] })}
                >
                  {weekDays.map((day) => <option value={day.value} key={day.value}>{day.long}</option>)}
                </select>
              </label>
            )}
            {data.settings.checkInRhythm.frequency === "custom" && (
              <fieldset className="settings-custom-days">
                <legend>Check-In days</legend>
                <div>
                  {weekDays.map((day) => (
                    <button
                      className={data.settings.checkInRhythm.days.includes(day.value) ? "is-active" : ""}
                      type="button"
                      aria-pressed={data.settings.checkInRhythm.days.includes(day.value)}
                      onClick={() => toggleCustomDay(day.value)}
                      key={day.value}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="settings-row">
              <div><strong>Check-In time</strong><span>A gentle time reference for a scheduled day</span></div>
              <select value={data.settings.checkInRhythm.time} onChange={(e) => updateRhythm({ time: e.target.value })}>
                {["08:00", "12:00", "18:00", "20:00", "22:00"].map((t) => <option value={t} key={t}>{t}</option>)}
              </select>
            </label>
            <label className="settings-row">
              <div><strong>Reminders</strong><span>Keep the reminder preference on this device</span></div>
              <input
                className="switch-input"
                type="checkbox"
                checked={data.settings.checkInRhythm.enabled}
                onChange={(e) => updateRhythm({ enabled: e.target.checked })}
              />
            </label>
          </div>
        </section>

        {/* ── Group 3: Preferences & Constraints ── */}
        <section className="settings-section settings-group" aria-labelledby="group-prefs">
          <div className="settings-group-heading">
            <SlidersHorizontal aria-hidden="true" />
            <h2 id="group-prefs">Preferences &amp; Constraints</h2>
          </div>
          <div className="settings-rows">
            <label className="settings-row">
              <div><strong>Reduced motion</strong><span>Reduce decorative and transition motion</span></div>
              <input
                className="switch-input"
                type="checkbox"
                checked={data.settings.reducedMotion}
                onChange={(e) => updateSetting("reducedMotion", e.target.checked)}
              />
            </label>
          </div>
          <div className="settings-links">
            <Link to="/app/vision">
              <span>Life Vision</span><strong>{data.vision.title}</strong><ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/onboarding">
              <span>Distance, cost &amp; social preferences</span>
              <strong>{data.preferences.availableMinutes} min / {data.preferences.maxDistanceKm} km / {data.preferences.socialPreference}</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Group 4: Privacy & Data ── */}
        <section className="settings-section settings-group settings-data" aria-labelledby="group-privacy">
          <div className="settings-group-heading">
            <ShieldCheck aria-hidden="true" />
            <h2 id="group-privacy">Privacy &amp; Data</h2>
          </div>
          <p>Frontend records are stored in IndexedDB on this browser. Nothing is sent to a server in this build.</p>
          {/* C2: Trusted Contact — read-only summary, edit in Support */}
          <div className="settings-trusted-contact-summary">
            <span className="app-kicker">Trusted Contact</span>
            {data.trustedContact ? (
              <p><strong>{data.trustedContact.name}</strong> — {data.trustedContact.relationship}</p>
            ) : (
              <p>No trusted contact saved yet.</p>
            )}
            <Link className="inline-arrow-link" to="/app/support">
              Manage in Support <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

      </div>

      {resetOpen && (
        <section className="reset-confirm" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div>
            <p className="app-kicker">Confirm reset</p>
            <h2 id="reset-title">Remove all local ReNew data?</h2>
            <p>This clears the profile, Vision, Route, Check-Ins, Missions, reflections, saved places, and trusted contact on this browser.</p>
          </div>
          <div>
            <button className="secondary-command" type="button" onClick={() => setResetOpen(false)}>Keep my data</button>
            <button className="primary-command danger-command" type="button" onClick={() => void performReset()}>Reset everything</button>
          </div>
        </section>
      )}
    </main>
  );
}
