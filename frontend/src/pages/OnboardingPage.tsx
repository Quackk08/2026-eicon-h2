import { useEffect, useState } from "react";
import { createVisionWithRoute, fetchRoutePreview, savePreferences } from "../api/backend";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Route as RouteIcon,
  SlidersHorizontal,
  Target
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { LifeDomain, RouteStep, UserPreferences } from "../data/appData";
import { useAppState } from "../state/AppState";

const domains: LifeDomain[] = [
  "Study & focus",
  "Sleep & energy",
  "Relationships",
  "Movement & health",
  "Creativity",
  "Daily independence",
  "Community",
  "Stress recovery"
];

const stepMeta = [
  { label: "Begin", icon: Compass },
  { label: "Priorities", icon: Target },
  { label: "Conditions", icon: SlidersHorizontal },
  { label: "Vision", icon: Compass },
  { label: "Route", icon: RouteIcon }
];


export function OnboardingPage() {
  const navigate = useNavigate();
  const { data, updateData, refresh } = useAppState();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(data.preferences);
  const [visionTitle, setVisionTitle] = useState(data.vision.title);
  const [visionDescription, setVisionDescription] = useState(data.vision.description);
  const primaryDomain = preferences.domains[0] ?? "Study & focus";
  const [route, setRoute] = useState<RouteStep[]>([]);
  const progress = ((step + 1) / stepMeta.length) * 100;

  // Preview the Route this Vision will actually get, straight from the
  // backend's reviewed Activity Ladder — not a local sample of one.
  useEffect(() => {
    let active = true;
    fetchRoutePreview(primaryDomain)
      .then((steps) => {
        if (active) setRoute(steps);
      })
      .catch(() => {
        if (active) setRoute([]);
      });
    return () => {
      active = false;
    };
  }, [primaryDomain]);

  const toggleDomain = (domain: LifeDomain) => {
    setPreferences((current) => {
      const selected = current.domains.includes(domain);
      return {
        ...current,
        domains: selected
          ? current.domains.filter((item) => item !== domain)
          : [...current.domains, domain]
      };
    });
  };

  const togglePlace = (place: string) => {
    setPreferences((current) => ({
      ...current,
      preferredPlaces: current.preferredPlaces.includes(place)
        ? current.preferredPlaces.filter((item) => item !== place)
        : [...current.preferredPlaces, place]
    }));
  };

  const completeOnboarding = async () => {
    setSaving(true);
    updateData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        signedIn: true,
        onboardingComplete: true
      },
      preferences,
      vision: {
        ...current.vision,
        domain: primaryDomain,
        title: visionTitle,
        description: visionDescription,
        status: "active"
      },
      route
    }));

    try {
      await savePreferences(preferences);
      await createVisionWithRoute(primaryDomain, visionTitle);
      await refresh();
    } catch {
      // Saved locally already — the Vision syncs on the next successful load.
    } finally {
      setSaving(false);
    }

    navigate("/app/today");
  };

  const canContinue =
    (step !== 1 || preferences.domains.length > 0) &&
    (step !== 3 || (visionTitle.trim().length > 0 && visionDescription.trim().length > 0));

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <Link className="app-wordmark" to="/">
          ReNew
        </Link>
        <p>
          {String(step + 1).padStart(2, "0")} / {String(stepMeta.length).padStart(2, "0")}
        </p>
      </header>

      <div className="onboarding-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="onboarding-layout">
        <aside className="onboarding-rail" aria-label="Onboarding progress">
          {stepMeta.map(({ label, icon: Icon }, index) => (
            <div className={index === step ? "is-current" : index < step ? "is-complete" : ""} key={label}>
              <span>{index < step ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
              {label}
            </div>
          ))}
        </aside>

        <section className="onboarding-content">
          {step === 0 && (
            <div className="onboarding-panel onboarding-welcome">
              <p className="app-kicker">Start from your life</p>
              <h1>Your life does not need to fit a fixed plan.</h1>
              <p>
                ReNew keeps your longer direction in view, then adjusts each step to the time, energy,
                distance, and social effort available today.
              </p>
              <div className="onboarding-principles">
                <span>01</span><p>No diagnosis or comparison</p>
                <span>02</span><p>Every recommendation stays optional</p>
                <span>03</span><p>Your route can change at any time</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="onboarding-panel">
              <p className="app-kicker">Life priorities</p>
              <h1>What matters in the life you want?</h1>
              <p className="panel-lead">Choose one or more areas. The first becomes your starting route.</p>
              <div className="choice-grid">
                {domains.map((domain) => {
                  const selected = preferences.domains.includes(domain);
                  return (
                    <button
                      className={selected ? "choice-button is-selected" : "choice-button"}
                      type="button"
                      onClick={() => toggleDomain(domain)}
                      aria-pressed={selected}
                      key={domain}
                    >
                      <span>{selected ? <Check aria-hidden="true" /> : null}</span>
                      {domain}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-panel">
              <p className="app-kicker">Real conditions</p>
              <h1>What feels workable right now?</h1>
              <div className="range-stack">
                <label>
                  <span>Available time <strong>{preferences.availableMinutes} min</strong></span>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={preferences.availableMinutes}
                    onChange={(event) => setPreferences((current) => ({ ...current, availableMinutes: Number(event.target.value) }))}
                  />
                </label>
                <label>
                  <span>Comfortable distance <strong>{preferences.maxDistanceKm} km</strong></span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={preferences.maxDistanceKm}
                    onChange={(event) => setPreferences((current) => ({ ...current, maxDistanceKm: Number(event.target.value) }))}
                  />
                </label>
              </div>

              <fieldset className="segmented-field">
                <legend>Budget</legend>
                <div>
                  {(["Free", "Low cost", "Flexible"] as const).map((option) => (
                    <button
                      className={preferences.budget === option ? "is-selected" : ""}
                      type="button"
                      onClick={() => setPreferences((current) => ({ ...current, budget: option }))}
                      key={option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="segmented-field">
                <legend>Social setting</legend>
                <div>
                  {(["Solo", "Low pressure", "Together"] as const).map((option) => (
                    <button
                      className={preferences.socialPreference === option ? "is-selected" : ""}
                      type="button"
                      onClick={() => setPreferences((current) => ({ ...current, socialPreference: option }))}
                      key={option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="compact-checks">
                <legend>Places that feel usable</legend>
                {["Library", "Cafe", "Park", "Community room"].map((place) => (
                  <label key={place}>
                    <input
                      type="checkbox"
                      checked={preferences.preferredPlaces.includes(place)}
                      onChange={() => togglePlace(place)}
                    />
                    {place}
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-panel">
              <p className="app-kicker">Life Vision</p>
              <h1>Name the direction, not the deadline.</h1>
              <div className="vision-form">
                <label>
                  Vision title
                  <input value={visionTitle} maxLength={90} onChange={(event) => setVisionTitle(event.target.value)} />
                </label>
                <label>
                  What would this life feel like?
                  <textarea value={visionDescription} maxLength={300} rows={5} onChange={(event) => setVisionDescription(event.target.value)} />
                </label>
              </div>
              <p className="writing-note">Starting area: {primaryDomain}</p>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-panel">
              <p className="app-kicker">Your first route</p>
              <h1>One direction, five possible sizes.</h1>
              <div className="route-preview-header">
                <span>{primaryDomain}</span>
                <p>{visionTitle}</p>
              </div>
              <ol className="onboarding-route-list">
                {route.slice().reverse().map((routeStep) => (
                  <li key={routeStep.id}>
                    <span>Level {String(routeStep.level).padStart(2, "0")}</span>
                    <p>{routeStep.title}</p>
                    <small>{routeStep.durationMinutes} min</small>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>

      <footer className="onboarding-actions">
        <button
          className="secondary-command"
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          <ArrowLeft aria-hidden="true" /> Back
        </button>
        {step < stepMeta.length - 1 ? (
          <button
            className="primary-command"
            type="button"
            onClick={() => setStep((current) => Math.min(stepMeta.length - 1, current + 1))}
            disabled={!canContinue}
          >
            Continue <ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <button className="primary-command" type="button" onClick={completeOnboarding} disabled={saving}>
            Enter ReNew <ArrowRight aria-hidden="true" />
          </button>
        )}
      </footer>
    </main>
  );
}
