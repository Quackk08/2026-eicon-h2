import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Minimize2,
  Pause,
  Play
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppState";

export function MissionPage() {
  const navigate = useNavigate();
  const { data, updateData } = useAppState();
  const mission = data.mission;
  const matchingPlace = data.places.find((place) => place.type === mission?.placeType) ?? data.places[0];

  if (!mission) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">No step selected</p>
        <h1>Your next Mission stays optional.</h1>
        <p>Check in when you are ready and choose one workable size.</p>
        <Link className="primary-command" to="/app/check-in">
          Start Check-In <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const updateMission = (status: "planned" | "in_progress" | "completed" | "not_today") => {
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, status } : null
    }));
  };

  const makeSmaller = () => {
    const smaller = data.recommendations.find((option) => option.effort === "Light");
    if (!smaller) return;
    updateData((current) => ({
      ...current,
      mission: current.mission
        ? {
            ...current.mission,
            optionId: smaller.id,
            title: smaller.title,
            description: smaller.description,
            durationMinutes: smaller.durationMinutes,
            placeType: smaller.placeType,
            status: "planned"
          }
        : null
    }));
  };

  const finishMission = (status: "completed" | "not_today") => {
    updateMission(status);
    navigate("/app/reflection");
  };

  return (
    <main className="app-page flow-page mission-page">
      <header className="mission-topbar">
        <Link className="icon-button" to="/app/today" aria-label="Back to Today" title="Back to Today">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <span className={`mission-status is-${mission.status}`}>{mission.status.replace("_", " ")}</span>
      </header>

      <section className="mission-hero">
        <p className="app-kicker">Today's Mission</p>
        <h1>{mission.title}</h1>
        <p>{mission.description}</p>
        <div>
          <span><Clock3 aria-hidden="true" /> {mission.durationMinutes} minutes</span>
          <span><MapPin aria-hidden="true" /> {mission.placeType}</span>
        </div>
      </section>

      <div className="mission-layout">
        <section className="mission-actions" aria-labelledby="mission-action-title">
          <p className="app-kicker">Choose the next moment</p>
          <h2 id="mission-action-title">The Mission follows your pace.</h2>

          {mission.status === "planned" ? (
            <button className="primary-command" type="button" onClick={() => updateMission("in_progress")}>
              <Play aria-hidden="true" /> Start this step
            </button>
          ) : (
            <button className="primary-command" type="button" onClick={() => finishMission("completed")}>
              <CheckCircle2 aria-hidden="true" /> Mark complete
            </button>
          )}

          <button className="secondary-command" type="button" onClick={makeSmaller}>
            <Minimize2 aria-hidden="true" /> Make it smaller
          </button>
          <button className="mission-text-action" type="button" onClick={() => finishMission("not_today")}>
            <Pause aria-hidden="true" /> Not today
          </button>
        </section>

        <section className="mission-place" aria-labelledby="mission-place-title">
          <div className={`mission-place-visual is-${matchingPlace.color}`} aria-hidden="true">
            <span>{matchingPlace.type}</span>
          </div>
          <div>
            <p className="app-kicker">A possible setting</p>
            <h2 id="mission-place-title">{matchingPlace.name}</h2>
            <p>{matchingPlace.distanceKm} km / {matchingPlace.cost} / {matchingPlace.socialLoad} social load</p>
            <Link className="inline-arrow-link" to={`/app/places/${matchingPlace.id}`}>
              View place details <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className="mission-boundaries">
        <p className="app-kicker">Still counts</p>
        <div>
          <p>Stopping after arrival</p>
          <p>Changing the place</p>
          <p>Trying only the first two minutes</p>
          <p>Choosing not to continue today</p>
        </div>
      </section>
    </main>
  );
}
