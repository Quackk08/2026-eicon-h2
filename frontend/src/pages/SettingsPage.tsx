import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Download,
  LogOut,
  Moon,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppState";

export function SettingsPage() {
  const navigate = useNavigate();
  const { data, updateData, resetDemo } = useAppState();
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

  const updateSetting = <Key extends keyof typeof data.settings>(key: Key, value: (typeof data.settings)[Key]) => {
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value }
    }));
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

  return (
    <main className="app-page settings-page">
      <header className="settings-heading">
        <p className="app-kicker">Settings</p>
        <h1>Keep ReNew on your terms.</h1>
        <p>Manage timing, comfort, local data, and the connections you choose to keep.</p>
      </header>

      <div className="settings-layout">
        <section className="settings-section" aria-labelledby="profile-title">
          <div className="settings-section-heading">
            <UserRound aria-hidden="true" />
            <div><p className="app-kicker">Profile</p><h2 id="profile-title">Your details</h2></div>
          </div>
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="field-group">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="field-group">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <button className="primary-command" type="submit"><Save aria-hidden="true" /> {saved ? "Saved" : "Save profile"}</button>
          </form>
        </section>

        <section className="settings-section" aria-labelledby="rhythm-settings-title">
          <div className="settings-section-heading">
            <Moon aria-hidden="true" />
            <div><p className="app-kicker">Rhythm and comfort</p><h2 id="rhythm-settings-title">Daily preferences</h2></div>
          </div>
          <div className="settings-rows">
            <label className="settings-row">
              <div><strong>Check-In time</strong><span>A gentle time reference for your day</span></div>
              <select value={data.settings.checkInTime} onChange={(event) => updateSetting("checkInTime", event.target.value)}>
                {["08:00", "12:00", "18:00", "20:00", "22:00"].map((time) => <option value={time} key={time}>{time}</option>)}
              </select>
            </label>
            <label className="settings-row">
              <div><strong>Reminders</strong><span>Keep the reminder preference on this device</span></div>
              <input className="switch-input" type="checkbox" checked={data.settings.reminders} onChange={(event) => updateSetting("reminders", event.target.checked)} />
            </label>
            <label className="settings-row">
              <div><strong>Reduced motion</strong><span>Reduce decorative and transition motion</span></div>
              <input className="switch-input" type="checkbox" checked={data.settings.reducedMotion} onChange={(event) => updateSetting("reducedMotion", event.target.checked)} />
            </label>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="planning-settings-title">
          <div className="settings-section-heading">
            <ArrowRight aria-hidden="true" />
            <div><p className="app-kicker">Planning</p><h2 id="planning-settings-title">Your direction and conditions</h2></div>
          </div>
          <div className="settings-links">
            <Link to="/app/vision"><span>Life Vision</span><strong>{data.vision.title}</strong><ArrowRight aria-hidden="true" /></Link>
            <Link to="/onboarding"><span>Preferences</span><strong>{data.preferences.availableMinutes} min / {data.preferences.maxDistanceKm} km / {data.preferences.socialPreference}</strong><ArrowRight aria-hidden="true" /></Link>
            <Link to="/app/support"><span>Support</span><strong>{data.trustedContact ? data.trustedContact.name : "No trusted contact saved"}</strong><ArrowRight aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="settings-section settings-data" aria-labelledby="data-settings-title">
          <div className="settings-section-heading">
            <ShieldCheck aria-hidden="true" />
            <div><p className="app-kicker">Data controls</p><h2 id="data-settings-title">Local data</h2></div>
          </div>
          <p>Frontend records are stored in IndexedDB on this browser. Nothing is sent to a server in this build.</p>
          <div>
            <button className="secondary-command" type="button" onClick={exportData}><Download aria-hidden="true" /> Export JSON</button>
            <button className="secondary-command danger-command" type="button" onClick={() => setResetOpen(true)}><RefreshCcw aria-hidden="true" /> Reset demo data</button>
            <button className="text-button" type="button" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</button>
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
