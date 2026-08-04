import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createMissionFromOption, type MissionVariant, type RecommendationOption } from "../data/appData";
import {
  getEligibleMissionOptions,
  getMissionPlace,
  getRecommendationReasons,
  getRecommendedMissionOption
} from "../data/missionLogic";
import { fetchPlaceForTemplate, requestDailyRecommendation, selectRecommendation } from "../api/backend";
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
  const { data, ready, recommendation: serverPick, updateData, refresh } = useAppState();
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
  const currentServerPick =
    serverPick?.check_in_id === latestCheckIn?.id ? serverPick : null;
  const activePick =
    pagePick?.check_in_id === latestCheckIn?.id ? pagePick : currentServerPick;


  // Today's step comes from the shared backend pick. Only ask for a new one
  // if there is none yet — arriving here from a Check-In already generated it.
  useEffect(() => {
    if (!ready || !hasCheckInToday) {
      setLoadingPick(false);
      return;
    }

    setLoadingPick(true);
    let active = true;
    (async () => {
      try {
        const pick = currentServerPick ?? await requestDailyRecommendation();
        if (!active || !pick) return;
        setPagePick(pick);
        if (!currentServerPick) await refresh();
        // Ask the backend where this action would happen, so the suggestion
        // names a real reviewed place instead of a bare category.
        const place = await fetchPlaceForTemplate(pick.selected_template_id);
        if (active) setPlacePick(place);
      } catch {
        // No Vision/Check-In yet, or backend unreachable — fall back locally.
      } finally {
        if (active) setLoadingPick(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hasCheckInToday, latestCheckIn?.id, ready, refresh, currentServerPick?.id]);

  const recommended =
    (activePick && data.recommendations.find((option) => option.id === activePick.selected_template_id)) ??
    getRecommendedMissionOption(data);

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
        if (cause instanceof ApiError) {
          setError(cause.message);
          setChoosing(false);
          return;
        }
        updateData((current) => ({
          ...current,
          mission: createMissionFromOption(option)
        }));
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

  if (!recommended) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">No steps yet</p>
        <h1>There is nothing to suggest until you check in.</h1>
        <p>A Check-In is what decides today's size, so it comes first.</p>
        <Link className="primary-command" to="/app/check-in">
          Start Check-In <ArrowRight aria-hidden="true" />
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
        <Link className="icon-button" to="/app/check-in" aria-label="Back to Check-In" title="Back to Check-In">
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
          <button className="primary-command" type="button" disabled={choosing} onClick={() => void chooseMission(recommended)}>
            Choose this Mission <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

      {error && <p className="auth-note" role="alert">{error}</p>}

      <section className="recommendation-reason" aria-labelledby="reason-title">
        <div>
          <SlidersHorizontal aria-hidden="true" />
          <h2 id="reason-title">Why this fits today</h2>
        </div>
        <ul>
          {reasons.map((reason) => <li key={reason}><Check aria-hidden="true" /> {reason}</li>)}
        </ul>
      </section>

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
              <button className="secondary-command" type="button" disabled={choosing} onClick={() => void chooseMission(option)}>
                Choose <ArrowRight aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="recommendation-skip">
        <p>Nothing here needs to become a task today.</p>
        <Link to="/app/today">Pause for now</Link>
      </div>
    </main>
  );
}
