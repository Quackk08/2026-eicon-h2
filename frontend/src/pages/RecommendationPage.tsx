import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createMissionFromOption, type MissionVariant, type RecommendationOption } from "../data/appData";
import {
  getEligibleMissionOptions,
  getMissionPlace,
  getRecommendationReasons,
  getRecommendedMissionOption
} from "../data/missionLogic";
import {
  fetchLatestRecommendation,
  fetchPlaceForTemplate,
  requestDailyRecommendation,
  selectRecommendation
} from "../api/backend";
import { ApiError } from "../api/client";
import { fromApiMission } from "../api/mappers";
import type { ApiPlaceSearchResult, ApiRecommendation } from "../api/types";
import { useAppState } from "../state/AppState";

const variantLabels: Record<MissionVariant, string> = {
  recommended: "Recommended for today",
  lighter: "A little lighter",
  different: "A different way",
  more: "A little more",
  alternative: "Another way"
};

export function RecommendationPage() {
  const navigate = useNavigate();
  const { data, ready, online, recommendation: serverPick, updateData, refresh } = useAppState();
  const [loadingPick, setLoadingPick] = useState(true);
  const [placePick, setPlacePick] = useState<ApiPlaceSearchResult | null>(null);
  const [pagePick, setPagePick] = useState<ApiRecommendation | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* A1: Guard — need at least one check-in today to reach this page */
  const today = new Date().toISOString().slice(0, 10);
  const hasCheckInToday = data.checkIns.some((c) => c.createdAt.slice(0, 10) === today);
  const latestCheckIn = [...data.checkIns].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0] ?? null;
  // A pick counts as current when it references the latest Check-In — or,
  // because a Check-In recorded offline keeps its device-side id that the
  // server has never seen, when it was simply generated today.
  const isCurrentPick = (pick: ApiRecommendation | null): pick is ApiRecommendation =>
    pick !== null &&
    (pick.check_in_id === latestCheckIn?.id || pick.created_at.slice(0, 10) === today);
  const currentServerPick = isCurrentPick(serverPick) ? serverPick : null;
  const activePick = (isCurrentPick(pagePick) ? pagePick : null) ?? currentServerPick;

  // Today's step comes from the shared backend pick. Reuse today's existing
  // recommendation before generating: POST /recommendations/daily mints a new
  // row every time, and opening a page must not create records.
  const resolvedForCheckIn = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !hasCheckInToday) {
      setLoadingPick(false);
      return;
    }
    const checkInKey = latestCheckIn?.id ?? "none";
    if (resolvedForCheckIn.current === checkInKey) return;
    resolvedForCheckIn.current = checkInKey;

    setLoadingPick(true);
    let active = true;
    (async () => {
      try {
        let pick = currentServerPick;
        if (!pick) {
          const latest = await fetchLatestRecommendation().catch(() => null);
          pick = isCurrentPick(latest) ? latest : await requestDailyRecommendation();
        }
        if (!active || !pick) return;
        setPagePick(pick);
        if (!currentServerPick) await refresh();
        // Ask the backend where this action would happen, so the suggestion
        // names a real reviewed place instead of a bare category.
        const place = await fetchPlaceForTemplate(pick.selected_template_id);
        if (active) setPlacePick(place);
      } catch {
        // No Vision/Check-In yet, or backend unreachable — fall back locally.
        if (active) resolvedForCheckIn.current = null;
      } finally {
        if (active) setLoadingPick(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolved once per check-in
  }, [hasCheckInToday, latestCheckIn?.id, ready]);

  const recommended =
    (activePick && data.recommendations.find((option) => option.id === activePick.selected_template_id)) ??
    getRecommendedMissionOption(data);

  // Without a server-side pick and without a connection, choosing would mint
  // a Mission id the backend has never heard of — and the reflection later
  // queued against it would be quietly discarded at sync time.
  const canChoose = Boolean(activePick) || online;

  const chooseMission = async (option: RecommendationOption) => {
    setChoosing(true);
    setError(null);

    if (activePick) {
      try {
        const created = await selectRecommendation(activePick.id, option.id, option.routeStepId ?? null);
        const mission = fromApiMission(created, data.vision.id);
        updateData((current) => ({
          ...current,
          mission: mission ?? createMissionFromOption(option, { id: created.id })
        }));
        await refresh();
      } catch (cause) {
        // Whether refused or undelivered, a Mission the server does not know
        // about cannot carry a reflection later — stay here and say so.
        setError(
          cause instanceof ApiError
            ? cause.message
            : "The Mission could not be started. Please check the connection and try again."
        );
        setChoosing(false);
        return;
      }
    } else {
      updateData((current) => ({
        ...current,
        mission: createMissionFromOption(option)
      }));
    }

    setChoosing(false);
    navigate("/app/mission");
  };

  if (!ready || loadingPick) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span />
        <p>Loading actions that fit your conditions...</p>
      </main>
    );
  }

  // Finished loading with nothing to offer — no Vision or no Check-In yet.
  // Saying so beats a spinner that never stops.
  if (!hasCheckInToday) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Check-In first</p>
        <h1>A recommendation needs today's conditions.</h1>
        <p>Complete a quick Check-In and ReNew will match an action to what's available right now.</p>
        <Link className="primary-command" to="/app/check-in">
          Start Check-In <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  // Checked in, but there are no sized steps to offer. That has two distinct
  // causes with two distinct remedies — an unhelpful "check in first" here
  // used to point at the very thing the person had just done.
  if (!recommended) {
    return online ? (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">No steps yet</p>
        <h1>Your Vision needs a Route before today can be sized.</h1>
        <p>Once your Life Vision has a Route of possible steps, every Check-In picks the one that fits.</p>
        <Link className="primary-command" to="/app/vision">
          Review your Life Vision <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    ) : (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Waiting for the connection</p>
        <h1>Today's suggestion needs the server.</h1>
        <p>Your Check-In is saved on this device. The suggestion will arrive on its own once ReNew can reach the server again.</p>
        <Link className="primary-command" to="/app/today">
          Back to Today <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const allowedTemplateIds = activePick
    ? new Set([
        activePick.selected_template_id,
        activePick.smaller_template_id,
        activePick.extension_template_id
      ].filter((id): id is string => Boolean(id)))
    : null;
  const alternatives = getEligibleMissionOptions(data)
    .filter((option) => option.id !== recommended.id)
    .filter((option) => !allowedTemplateIds || allowedTemplateIds.has(option.id))
    .slice(0, 4);
  const backendPlace = placePick
    ? placePick.candidates.find((candidate) => candidate.id === placePick.selectedPlaceId) ?? null
    : null;
  const recommendedPlace = getMissionPlace(data, recommended);
  const placeName = backendPlace?.name ?? recommendedPlace?.name ?? recommended.placeType;
  const reasons = activePick
    ? [activePick.user_facing_reason, ...getRecommendationReasons(data, recommended)].slice(0, 4)
    : getRecommendationReasons(data, recommended);

  return (
    <main className="app-page flow-page recommendation-page">
      <header className="flow-heading">
        {/* People arrive here from a finished Check-In; "back" must not
            restart that wizard. */}
        <Link className="icon-button" to="/app/today" aria-label="Back to Today" title="Back to Today">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <div>
          <p className="app-kicker">A route that can bend</p>
          <h1>Keep the direction. Change the size.</h1>
          <p>This option stays connected to your Life Vision while respecting what feels available today.</p>
        </div>
      </header>

      <section className="recommendation-primary" aria-labelledby="recommendation-title">
        <div className="recommendation-index" aria-hidden="true">01</div>
        <div className="recommendation-copy">
          <p className="app-kicker">
            Suggested for today{recommended.source === "ai" ? " / AI suggested" : ""}
          </p>
          <h2 id="recommendation-title">{recommended.title}</h2>
          <p>{activePick?.summary ?? recommended.description}</p>
          <div className="recommendation-meta">
            <span><Clock3 aria-hidden="true" /> {recommended.durationMinutes} min</span>
            <span><MapPin aria-hidden="true" /> {placeName}</span>
          </div>
          {/* Error sits above the button it belongs to. */}
          {error && <p className="auth-note" role="alert">{error}</p>}
          {!activePick && !online && (
            <p className="auth-note" role="status">
              Offline — this is the closest cached fit. Choosing a Mission needs the connection back;
              your Check-In is saved and waiting.
            </p>
          )}
          <button
            className="primary-command"
            type="button"
            disabled={choosing || !canChoose}
            onClick={() => void chooseMission(recommended)}
          >
            {choosing ? "Choosing..." : "Choose this Mission"} <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="recommendation-reason" aria-labelledby="reason-title">
        <div>
          <SlidersHorizontal aria-hidden="true" />
          <h2 id="reason-title">Why this fits today</h2>
        </div>
        <ul>
          {reasons.map((reason, index) => <li key={index}><Check aria-hidden="true" /> {reason}</li>)}
        </ul>
      </section>

      {alternatives.length > 0 && (
        <section className="alternative-section" aria-labelledby="alternative-title">
          <div className="section-title-row">
            <div>
              <p className="app-kicker">You stay in control</p>
              <h2 id="alternative-title">Other workable sizes</h2>
            </div>
          </div>
          <div className="alternative-list">
            {alternatives.map((option) => (
              <article key={option.id}>
                <div>
                  <span>{variantLabels[option.variant]}</span>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </div>
                <button
                  className="secondary-command"
                  type="button"
                  disabled={choosing || !canChoose}
                  onClick={() => void chooseMission(option)}
                >
                  {choosing ? "Choosing..." : "Choose"} <ArrowRight aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="recommendation-skip">
        <p>Nothing here needs to become a task today.</p>
        <Link to="/app/today">Pause for now</Link>
      </div>
    </main>
  );
}
