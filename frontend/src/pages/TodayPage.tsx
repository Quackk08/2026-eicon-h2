import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Route as RouteIcon,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppState";

function formatToday(): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());
}

export function TodayPage() {
  const { data } = useAppState();
  const completedSteps = data.route.filter((step) => step.completed).length;
  const currentStep =
    data.route.find((step) => !step.completed) ?? data.route[data.route.length - 1];
  const suggestedPlaces = data.places
    .filter((place) => place.distanceKm <= data.preferences.maxDistanceKm)
    .slice(0, 2);

  return (
    <main className="app-page today-page">
      <section className="today-heading">
        <div>
          <p className="app-kicker">{formatToday()}</p>
          <h1>Good to see you, {data.profile.name}.</h1>
          <p>No perfect day required. Start with what is available now.</p>
        </div>
        <div className="today-mark" aria-hidden="true">01</div>
      </section>

      <section className="today-grid">
        <article className="daily-focus">
          <div className="panel-heading-row">
            <div>
              <p className="app-kicker">Daily focus</p>
              <h2>{data.mission ? "Your selected step" : "Begin with a quick Check-In"}</h2>
            </div>
            <Sparkles aria-hidden="true" />
          </div>

          {data.mission ? (
            <div className="mission-summary">
              <p>{data.mission.title}</p>
              <div>
                <span><Clock3 aria-hidden="true" /> {data.mission.durationMinutes} min</span>
                <span><MapPin aria-hidden="true" /> {data.mission.placeType}</span>
              </div>
              <Link className="primary-command" to="/app/mission">
                Open mission <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="checkin-prompt">
              <p>
                Share three small signals about today. ReNew will adjust the next action without changing
                the life direction you chose.
              </p>
              <Link className="primary-command" to="/app/check-in">
                Start Check-In <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </article>

        <article className="route-summary-panel">
          <div className="panel-heading-row">
            <div>
              <p className="app-kicker">Life Route</p>
              <h2>{data.vision.title}</h2>
            </div>
            <RouteIcon aria-hidden="true" />
          </div>
          <div className="route-progress-copy">
            <span>{completedSteps} of {data.route.length} steps explored</span>
            <div aria-hidden="true"><i style={{ width: `${(completedSteps / data.route.length) * 100}%` }} /></div>
          </div>
          {currentStep && (
            <div className="next-route-step">
              <span>Current possible step</span>
              <p>{currentStep.title}</p>
              <small>{currentStep.durationMinutes} minutes</small>
            </div>
          )}
          <Link className="inline-arrow-link" to="/app/route">
            View full route <ChevronRight aria-hidden="true" />
          </Link>
        </article>

        <section className="today-section local-preview" aria-labelledby="nearby-title">
          <div className="section-title-row">
            <div>
              <p className="app-kicker">Nearby and workable</p>
              <h2 id="nearby-title">Places for a lower-pressure step</h2>
            </div>
            <Link to="/app/places">View all</Link>
          </div>
          <div className="compact-place-list">
            {suggestedPlaces.map((place) => (
              <Link to={`/app/places/${place.id}`} key={place.id}>
                <span className={`place-swatch is-${place.color}`} aria-hidden="true" />
                <div>
                  <p>{place.name}</p>
                  <span>{place.type} / {place.distanceKm} km / {place.cost}</span>
                </div>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="today-section rhythm-preview" aria-labelledby="rhythm-title">
          <div className="section-title-row">
            <div>
              <p className="app-kicker">Your rhythm</p>
              <h2 id="rhythm-title">This week stays yours</h2>
            </div>
            <CalendarDays aria-hidden="true" />
          </div>
          <div className="week-row" aria-label="Weekly activity">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <div className={index < Math.min(data.reflections.length + 2, 7) ? "is-active" : ""} key={`${day}-${index}`}>
                <span>{day}</span>
                {index < Math.min(data.reflections.length + 2, 7) ? <CheckCircle2 aria-hidden="true" /> : <i />}
              </div>
            ))}
          </div>
          <p>Small records build context. They do not become a score or a comparison.</p>
          <Link className="inline-arrow-link" to="/app/insights">
            Open weekly insight <ChevronRight aria-hidden="true" />
          </Link>
        </section>
      </section>
    </main>
  );
}
