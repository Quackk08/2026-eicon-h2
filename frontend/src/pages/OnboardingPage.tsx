import { useEffect, useRef, useState } from "react";
import {
  composeVisionSummary,
  createVisionWithGeneratedRoute,
  fetchRoutePreview,
  savePreferences
} from "../api/backend";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Route as RouteIcon,
  SkipForward,
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

/**
 * The wording a skipped Vision is recorded as.
 *
 * Not having a direction yet is a real answer, so skipping writes that down
 * instead of inventing a goal or leaving the Vision blank: the server reads
 * this as directionless and answers with the reviewed orienting ladder that
 * looks for a direction rather than pursuing one.
 */
const DIRECTIONLESS_SUMMARY = "I don't know what I want yet.";


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
  const [buildingRoute, setBuildingRoute] = useState(false);
  const [visionId, setVisionId] = useState<string | null>(null);
  // Set when the Vision question was skipped, so the Route is built from the
  // absence of a direction rather than from two empty fields.
  const [visionSkipped, setVisionSkipped] = useState(false);
  // The wording the shown ladder was built from, so going back without
  // changing anything does not spend another generation.
  const [routeBuiltFor, setRouteBuiltFor] = useState<string | null>(null);
  const [routeBuildFailed, setRouteBuildFailed] = useState(false);
  const progress = ((step + 1) / stepMeta.length) * 100;
  const panelRef = useRef<HTMLElement>(null);

  // Each step swaps the whole panel; without a focus move, nothing tells a
  // screen-reader user that anything changed.
  useEffect(() => {
    panelRef.current?.focus();
  }, [step]);

  // A stand-in for the domain, shown only until the real ladder is built on
  // the review step. Skipped once that exists, so it cannot overwrite it.
  useEffect(() => {
    if (routeBuiltFor) return;
    let active = true;
    fetchRoutePreview(primaryDomain)
      .then((steps) => {
        if (active && !routeBuiltFor) setRoute(steps);
      })
      .catch(() => {
        if (active && !routeBuiltFor) setRoute([]);
      });
    return () => {
      active = false;
    };
  }, [primaryDomain, routeBuiltFor]);

  /**
   * Builds the ladder before the review step renders, so "your first Route"
   * shows what the person actually gets rather than a generic sample.
   */
  const buildRouteForVision = async (summary: string) => {
    if (!summary || routeBuiltFor === summary) return;

    setBuildingRoute(true);
    setRouteBuildFailed(false);
    try {
      await savePreferences(preferences);
      const built = await createVisionWithGeneratedRoute(primaryDomain, summary, visionId ?? undefined);
      // The Vision id survives even a failed generation, so every retry
      // rewrites this Vision instead of stacking new ones on the server.
      setVisionId(built.visionId);
      if (built.steps) {
        setRoute(built.steps);
        setRouteBuiltFor(summary);
      } else {
        setRouteBuildFailed(true);
      }
    } catch {
      // Even the Vision write failed — the seed preview already on screen
      // stays, and completeOnboarding will try again on the way out.
      setRouteBuildFailed(true);
    } finally {
      setBuildingRoute(false);
    }
  };

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
        // signedIn stays false: nothing here authenticated anyone, and
        // claiming otherwise made Settings try account-only operations for
        // guests. Hydration owns the flag.
        onboardingComplete: true
      },
      preferences,
      vision: {
        ...current.vision,
        domain: primaryDomain,
        title: visionSkipped ? DIRECTIONLESS_SUMMARY : visionTitle,
        description: visionSkipped ? "" : visionDescription,
        status: "active"
      },
      route
    }));

    try {
      await savePreferences(preferences);
      // Usually already done on the review step; this covers the case where
      // that generation failed. Passing the known Vision id rewrites it
      // rather than creating a duplicate that pauses the real one.
      if (routeBuiltFor !== visionSummary) {
        await createVisionWithGeneratedRoute(primaryDomain, visionSummary, visionId ?? undefined);
      }
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
    // A skipped Vision is an answered Vision; coming Back to this step used
    // to strand people on a disabled Continue button.
    (step !== 3 ||
      visionSkipped ||
      (visionTitle.trim().length > 0 && visionDescription.trim().length > 0));

  const visionSummary = visionSkipped
    ? DIRECTIONLESS_SUMMARY
    : composeVisionSummary(visionTitle, visionDescription);

  const goToStep = (next: number) => setStep(Math.min(stepMeta.length - 1, Math.max(0, next)));

  /**
   * Every question is optional, so each one can be left unanswered.
   *
   * Nothing is filled in on the person's behalf: an unanswered question stays
   * at its untouched default, and a skipped Vision is recorded as having no
   * direction yet — which is what the orienting Route is built from.
   */
  const skipStep = async () => {
    if (step === 3) {
      setVisionSkipped(true);
      await buildRouteForVision(DIRECTIONLESS_SUMMARY);
    }
    goToStep(step + 1);
  };

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <Link className="app-wordmark" to="/">
          ReNew
        </Link>
        <p>
          {String(step + 1).padStart(2, "0")} / {String(stepMeta.length).padStart(2, "0")}
        </p>
        {/* Returning users land here from the hero CTA too; give them the
            way into their existing account instead of a second onboarding. */}
        <Link className="text-button onboarding-signin-link" to="/login">
          Already have an account? Sign in
        </Link>
      </header>

      <div className="onboarding-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="onboarding-layout">
        <aside className="onboarding-rail" aria-label="Onboarding progress">
          {stepMeta.map(({ label, icon: Icon }, index) => (
            <div
              className={index === step ? "is-current" : index < step ? "is-complete" : ""}
              aria-current={index === step ? "step" : undefined}
              key={label}
            >
              <span>{index < step ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
              {label}
            </div>
          ))}
        </aside>

        <section className="onboarding-content" ref={panelRef} tabIndex={-1}>
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
              <p className="panel-lead">Choose one or more areas. The first becomes your starting Route.</p>
              {/* Running selection count */}
              <p className="choice-count" aria-live="polite">
                {preferences.domains.length === 0
                  ? "None selected yet"
                  : `${preferences.domains.length} selected`}
              </p>
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
                      aria-pressed={preferences.budget === option}
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
                      aria-pressed={preferences.socialPreference === option}
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
                  <input
                    value={visionTitle}
                    maxLength={90}
                    onChange={(event) => {
                      setVisionSkipped(false);
                      setVisionTitle(event.target.value);
                    }}
                  />
                </label>
                <label>
                  What would this life feel like?
                  <textarea
                    value={visionDescription}
                    maxLength={300}
                    rows={5}
                    onChange={(event) => {
                      setVisionSkipped(false);
                      setVisionDescription(event.target.value);
                    }}
                  />
                </label>
              </div>
              <p className="writing-note">Starting area: {primaryDomain}</p>
              <p className="writing-note">
                No direction in mind yet? Skip this — your Route will start by looking for one.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-panel">
              <p className="app-kicker">Your first route</p>
              <h1>One direction, five possible sizes.</h1>
              <div className="route-preview-header">
                <span>{primaryDomain}</span>
                <p>{visionSkipped ? "No direction named yet" : visionTitle}</p>
              </div>
              {buildingRoute ? (
                <p className="auth-note" role="status">Building your Route...</p>
              ) : route.length > 0 ? (
                <ol className="onboarding-route-list">
                  {route.slice().reverse().map((routeStep) => (
                    <li key={routeStep.id}>
                      <span>Level {String(routeStep.level).padStart(2, "0")}</span>
                      <p>{routeStep.title}</p>
                      <small>{routeStep.durationMinutes} min</small>
                    </li>
                  ))}
                </ol>
              ) : (
                /* An empty list under this heading read as five missing rows,
                   not as a failure that could be retried. */
                <div className="route-preview-empty">
                  <p className="auth-note" role="alert">
                    Your Route could not be built right now. You can enter ReNew anyway and add
                    levels later, or try again.
                  </p>
                  {routeBuildFailed && (
                    <button
                      className="secondary-command"
                      type="button"
                      disabled={buildingRoute}
                      onClick={() => void buildRouteForVision(visionSummary)}
                    >
                      Try again <ArrowRight aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
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
          <div className="onboarding-advance">
            {/* The questions are optional, so each one can be passed by.
                Nothing to skip on the welcome screen. */}
            {step > 0 ? (
              <button className="secondary-command" type="button" onClick={skipStep} disabled={buildingRoute}>
                Skip <SkipForward aria-hidden="true" />
              </button>
            ) : null}
            <button
              className="primary-command"
              type="button"
              onClick={async () => {
                // Leaving the Vision step is the moment the ladder can be
                // built, so the next screen has something real to show.
                if (step === 3) await buildRouteForVision(visionSummary);
                goToStep(step + 1);
              }}
              disabled={!canContinue || buildingRoute}
            >
              {buildingRoute ? "Building your Route..." : "Continue"} <ArrowRight aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button className="primary-command" type="button" onClick={completeOnboarding} disabled={saving}>
            Enter ReNew <ArrowRight aria-hidden="true" />
          </button>
        )}
      </footer>
    </main>
  );
}
