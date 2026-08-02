import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { RecommendationOption } from "../data/appData";
import { useAppState } from "../state/AppState";

export function RecommendationPage() {
  const navigate = useNavigate();
  const { data, updateData } = useAppState();
  const latestCheckIn = data.checkIns[data.checkIns.length - 1];
  const averageCapacity = latestCheckIn
    ? (latestCheckIn.energy + latestCheckIn.capacity + latestCheckIn.mood) / 3
    : 3;
  const recommendedEffort = averageCapacity <= 2.3 ? "Light" : averageCapacity >= 4.2 ? "Stretch" : "Balanced";
  const recommended =
    data.recommendations.find((option) => option.effort === recommendedEffort) ?? data.recommendations[0];
  const alternatives = data.recommendations.filter((option) => option.id !== recommended.id);

  const chooseMission = (option: RecommendationOption) => {
    updateData((current) => ({
      ...current,
      mission: {
        id: crypto.randomUUID(),
        optionId: option.id,
        title: option.title,
        description: option.description,
        durationMinutes: option.durationMinutes,
        placeType: option.placeType,
        status: "planned",
        selectedAt: new Date().toISOString()
      }
    }));
    navigate("/app/mission");
  };

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
          <p className="app-kicker">Suggested for today / {recommended.effort}</p>
          <h2 id="recommendation-title">{recommended.title}</h2>
          <p>{recommended.description}</p>
          <div className="recommendation-meta">
            <span><Clock3 aria-hidden="true" /> {recommended.durationMinutes} min</span>
            <span><MapPin aria-hidden="true" /> {recommended.placeType}</span>
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
          <li><Check aria-hidden="true" /> Within your {data.preferences.availableMinutes}-minute window</li>
          <li><Check aria-hidden="true" /> Matches a {data.preferences.socialPreference.toLowerCase()} social setting</li>
          <li><Check aria-hidden="true" /> Preserves your “{data.vision.title}” direction</li>
          <li><Check aria-hidden="true" /> Uses only a reviewed action from your route</li>
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
                <span>{option.effort}</span>
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
