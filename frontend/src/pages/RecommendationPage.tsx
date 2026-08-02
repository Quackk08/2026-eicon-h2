import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createMissionFromOption, type MissionVariant, type RecommendationOption } from "../data/appData";
import {
  getEligibleMissionOptions,
  getMissionPlace,
  getRecommendationReasons,
  getRecommendedMissionOption
} from "../data/missionLogic";
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
  const { data, ready, updateData } = useAppState();
  const recommended = getRecommendedMissionOption(data);
  const eligibleOptions = getEligibleMissionOptions(data);
  const alternatives = eligibleOptions.filter((option) => option.id !== recommended.id).slice(0, 4);
  const recommendedPlace = getMissionPlace(data, recommended);
  const reasons = getRecommendationReasons(data, recommended);

  const chooseMission = (option: RecommendationOption) => {
    updateData((current) => ({
      ...current,
      mission: createMissionFromOption(option)
    }));
    navigate("/app/mission");
  };

  if (!ready) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span />
        <p>Loading actions that fit your conditions...</p>
      </main>
    );
  }

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
          <p>{recommended.description}</p>
          <div className="recommendation-meta">
            <span><Clock3 aria-hidden="true" /> {recommended.durationMinutes} min</span>
            <span><MapPin aria-hidden="true" /> {recommendedPlace?.name ?? recommended.placeType}</span>
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
