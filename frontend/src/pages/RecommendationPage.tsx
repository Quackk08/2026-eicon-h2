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
import type { ApiPlaceSearchResult } from "../api/types";
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

  // Today's step comes from the shared backend pick. Only ask for a new one
  // if there is none yet — arriving here from a Check-In already generated it.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const pick = serverPick ?? (await requestDailyRecommendation().then((r) => (refresh(), r)));
        if (!active || !pick) return;
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
  }, [serverPick?.id]);

  const recommended =
    (serverPick && data.recommendations.find((option) => option.id === serverPick.selected_template_id)) ??
    getRecommendedMissionOption(data);

  const chooseMission = async (option: RecommendationOption) => {
    updateData((current) => ({
      ...current,
      mission: createMissionFromOption(option)
    }));

    if (serverPick) {
      try {
        await selectRecommendation(serverPick.id, option.id, option.routeStepId ?? null);
        await refresh();
      } catch {
        // The choice is already stored locally; it syncs on the next load.
      }
    }

    navigate("/app/mission");
  };

  if (!ready || loadingPick || !recommended) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span />
        <p>Loading actions that fit your conditions...</p>
      </main>
    );
  }

  const alternatives = getEligibleMissionOptions(data)
    .filter((option) => option.id !== recommended.id)
    .slice(0, 4);
  const backendPlace = placePick
    ? placePick.candidates.find((candidate) => candidate.id === placePick.selectedPlaceId) ?? null
    : null;
  const recommendedPlace = getMissionPlace(data, recommended);
  const placeName = backendPlace?.name ?? recommendedPlace?.name ?? recommended.placeType;
  const reasons = serverPick
    ? [serverPick.user_facing_reason, ...getRecommendationReasons(data, recommended)].slice(0, 4)
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
          <p className="app-kicker">Suggested for today</p>
          <h2 id="recommendation-title">{recommended.title}</h2>
          <p>{serverPick?.summary ?? recommended.description}</p>
          <div className="recommendation-meta">
            <span><Clock3 aria-hidden="true" /> {recommended.durationMinutes} min</span>
            <span><MapPin aria-hidden="true" /> {placeName}</span>
          </div>
          <button className="primary-command" type="button" onClick={() => chooseMission(recommended)}>
            Choose this step <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

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
              <button className="secondary-command" type="button" onClick={() => chooseMission(option)}>
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
