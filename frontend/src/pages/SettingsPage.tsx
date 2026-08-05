import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { signOut as supabaseSignOut, updateAccountEmail } from "../api/auth";
import { saveCheckInRhythm, savePreferences, saveProfile as saveProfileOnServer } from "../api/backend";
import { clearAppData, createDefaultAppData } from "../data/appData";
import type { CheckInRhythm, UserPreferences } from "../data/appData";
import { ConfirmDialog } from "../components/ConfirmDialog";
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
  const { data, ready, updateData, refresh, resetDemo } = useAppState();
  const [name, setName] = useState(data.profile.name);
  const [email, setEmail] = useState(data.profile.email);
  const [profileDirty, setProfileDirty] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * True only after the person changed the rhythm on this page. The autosave
   * effect used to fire on hydration too — racing the server pull and
   * PATCHing the local defaults over whatever was actually saved.
   */
  const rhythmDirty = useRef(false);

  // Server hydration can land after mount; follow it while the fields are
  // untouched so the form shows the account's real name and email.
  useEffect(() => {
    if (profileDirty) return;
    setName(data.profile.name);
    setEmail(data.profile.email);
  }, [profileDirty, data.profile.name, data.profile.email]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    setStatusNote(null);
    const nextName = name.trim();
    const nextEmail = email.trim();
    const emailChanged = nextEmail !== data.profile.email;
    updateData((current) => ({
      ...current,
      // The email is not changed locally yet: with auth on, it only takes
      // effect after the person confirms from the new address.
      profile: { ...current.profile, name: nextName }
    }));
    try {
      await saveProfileOnServer(nextName);
      if (data.profile.signedIn && emailChanged) {
        const result = await updateAccountEmail(nextEmail);
        if (!result.ok) throw new Error(result.error ?? "Email could not be updated.");
        setStatusNote(
          `A confirmation email is on its way to ${nextEmail}. The address changes once you confirm it there.`
        );
      }
      await refresh();
      setProfileDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile could not be saved.");
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (!ready || !rhythmDirty.current) return;
    const timeout = window.setTimeout(() => {
      void saveCheckInRhythm(data.settings.checkInRhythm).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [
    ready,
    data.settings.checkInRhythm.frequency,
    data.settings.checkInRhythm.time,
    data.settings.checkInRhythm.enabled,
    data.settings.checkInRhythm.days.join(",")
  ]);

  const savePreferenceChange = (updates: Partial<UserPreferences>) => {
    const next = { ...data.preferences, ...updates };
    updateData((current) => ({ ...current, preferences: next }));
    void savePreferences(next).catch(() => undefined);
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
    rhythmDirty.current = true;
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
    // Firefox only honours a synthetic click on an anchor that is in the
    // document, and revoking the URL synchronously can cancel the download.
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusNote("Export started — check your downloads.");
  };

  const performReset = async () => {
    setError(null);
    try {
      await resetDemo();
      setResetOpen(false);
      navigate("/onboarding");
    } catch {
      setError("ReNew data could not be reset while the server is unavailable.");
    }
  };

  const signOut = async () => {
    try {
      await supabaseSignOut();
      // Records live on the server under the account, so the local copy is
      // cleared too — otherwise the next person on this browser would open
      // the previous account's Vision and Check-Ins.
      await clearAppData();
      updateData(() => createDefaultAppData());
      navigate("/login");
    } catch {
      setSignOutOpen(false);
      setError("Signing out did not complete. Please try again.");
    }
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
              <input
                id="profile-name"
                value={name}
                maxLength={80}
                onChange={(e) => {
                  setName(e.target.value);
                  setProfileDirty(true);
                }}
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setProfileDirty(true);
                }}
                required
              />
            </div>
            <button className="primary-command" type="submit" disabled={savingProfile}>
              <Save aria-hidden="true" /> Save profile
            </button>
            {/* Announced, not only painted onto the button label. */}
            <p className="sr-only" role="status">{saved ? "Profile saved." : ""}</p>
            {statusNote && <p className="auth-note" role="status">{statusNote}</p>}
            {error && <p className="auth-note" role="alert">{error}</p>}
          </form>
          <div className="settings-links">
            <button className="settings-link-row secondary-command" type="button" onClick={exportData}>
              <Download aria-hidden="true" /><span>Export data<strong>Download your records as JSON</strong></span>
            </button>
            <button className="settings-link-row text-button" type="button" onClick={() => setSignOutOpen(true)}>
              <LogOut aria-hidden="true" /><span>Sign out</span>
            </button>
            <button className="settings-link-row text-button danger-command" type="button" onClick={() => setResetOpen(true)}>
              <RefreshCcw aria-hidden="true" /><span>Delete all data</span>
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
            {/* Edited in place — this used to link into onboarding, and
                finishing that wizard replaced the person's Vision. */}
            <label className="settings-row">
              <div><strong>Available time</strong><span>How long a Mission may take</span></div>
              <select
                value={data.preferences.availableMinutes}
                onChange={(e) => savePreferenceChange({ availableMinutes: Number(e.target.value) })}
              >
                {[10, 20, 30, 45, 60, 90].map((minutes) => (
                  <option value={minutes} key={minutes}>{minutes} min</option>
                ))}
              </select>
            </label>
            <label className="settings-row">
              <div><strong>Travel distance</strong><span>How far a place may be</span></div>
              <select
                value={data.preferences.maxDistanceKm}
                onChange={(e) => savePreferenceChange({ maxDistanceKm: Number(e.target.value) })}
              >
                {[1, 2, 5, 10].map((km) => (
                  <option value={km} key={km}>{km} km</option>
                ))}
              </select>
            </label>
            <label className="settings-row">
              <div><strong>Budget</strong><span>What a suggestion may cost</span></div>
              <select
                value={data.preferences.budget}
                onChange={(e) => savePreferenceChange({ budget: e.target.value as UserPreferences["budget"] })}
              >
                <option value="Free">Free</option>
                <option value="Low cost">Low cost</option>
                <option value="Flexible">Flexible</option>
              </select>
            </label>
            <label className="settings-row">
              <div><strong>Social setting</strong><span>How much company feels right</span></div>
              <select
                value={data.preferences.socialPreference}
                onChange={(e) =>
                  savePreferenceChange({ socialPreference: e.target.value as UserPreferences["socialPreference"] })
                }
              >
                <option value="Solo">Solo</option>
                <option value="Low pressure">Low pressure</option>
                <option value="Together">Together</option>
              </select>
            </label>
          </div>
          <div className="settings-links">
            <Link to="/app/vision">
              <span>Life Vision</span><strong>{data.vision.title || "Not set yet"}</strong><ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Group 4: Privacy & Data ── */}
        <section className="settings-section settings-group settings-data" aria-labelledby="group-privacy">
          <div className="settings-group-heading">
            <ShieldCheck aria-hidden="true" />
            <h2 id="group-privacy">Privacy &amp; Data</h2>
          </div>
          <p>Records are written to this browser first so ReNew keeps working offline, then synced to your ReNew account.</p>
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
          <div className="settings-links">
            <Link to="/privacy">
              <span>Privacy policy</span>
              <strong>What is stored, where, and how to remove it</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
            <button className="settings-link-row text-button danger-command" type="button" onClick={() => setResetOpen(true)}>
              <RefreshCcw aria-hidden="true" /><span>Delete all data</span>
            </button>
          </div>
        </section>

      </div>

      <ConfirmDialog
        open={resetOpen}
        kicker="Confirm deletion"
        title="Delete all ReNew data?"
        confirmLabel="Delete everything"
        cancelLabel="Keep my data"
        danger
        confirmDisabled={resetConfirmText.trim().toUpperCase() !== "DELETE"}
        onCancel={() => {
          setResetOpen(false);
          setResetConfirmText("");
        }}
        onConfirm={() => void performReset()}
      >
        <p>
          This removes your profile, Vision, Route, Check-Ins, Missions, reflections, saved places,
          and trusted contact — from this browser <strong>and from the server</strong>. It cannot be
          undone. Consider using "Export data" first.
        </p>
        <label className="field-group reset-confirm-field">
          Type DELETE to confirm
          <input
            value={resetConfirmText}
            onChange={(event) => setResetConfirmText(event.target.value)}
            autoComplete="off"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={signOutOpen}
        kicker="Sign out"
        title={data.profile.signedIn ? "Sign out of this device?" : "Leave without an account?"}
        confirmLabel="Sign out"
        cancelLabel="Stay"
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => void signOut()}
      >
        <p>
          {data.profile.signedIn
            ? "The local copy on this browser is cleared; your records stay safe in your account and return when you sign back in."
            : "You are not signed in, so there is no account holding these records — signing out erases the Vision, Check-Ins, and Missions on this browser for good. Create an account first to keep them."}
        </p>
      </ConfirmDialog>
    </main>
  );
}
