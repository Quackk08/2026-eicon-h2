import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3, MapPin, Route as RouteIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { setMissionPlace } from "../api/backend";
import { useAppState } from "../state/AppState";

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { placeId } = useParams();
  const { data, updateData, refresh } = useAppState();
  const place = data.places.find((item) => item.id === placeId);

  if (!place) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Place not found</p>
        <h1>This location is not in the reviewed list.</h1>
        <Link className="primary-command" to="/app/places">
          Return to Places <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

  const saved = data.savedPlaceIds.includes(place.id);
  const relatedPlaces = data.places.filter((item) => item.id !== place.id).slice(0, 2);

  const toggleSaved = () => {
    updateData((current) => ({
      ...current,
      savedPlaceIds: current.savedPlaceIds.includes(place.id)
        ? current.savedPlaceIds.filter((id) => id !== place.id)
        : [...current.savedPlaceIds, place.id]
    }));
  };

  const useForMission = async () => {
    const mission = data.mission;
    if (!mission) {
      navigate("/app/check-in");
      return;
    }
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, placeId: place.id, placeType: place.name } : null
    }));

    try {
      await setMissionPlace(mission.id, place.id);
      await refresh();
    } catch {
      // Kept locally; it syncs the next time the backend is reachable.
    }

    navigate("/app/mission");
  };

  return (
    <main className="app-page discovery-page place-detail-page">
      <header className="detail-topbar">
        <Link className="icon-button" to="/app/places" aria-label="Back to Places" title="Back to Places">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <button className={saved ? "secondary-command is-saved" : "secondary-command"} type="button" onClick={toggleSaved}>
          <Bookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          {saved ? "Saved" : "Save place"}
        </button>
      </header>

      <section className="place-detail-hero">
        <div className={`place-detail-visual is-${place.color}`} aria-hidden="true">
          <span>{place.type} / {place.distanceKm} km</span>
        </div>
        <div className="place-detail-title">
          <p className="app-kicker">Reviewed local setting</p>
          <h1>{place.name}</h1>
          <p>{place.description}</p>
          <button className="primary-command" type="button" onClick={useForMission}>
            <RouteIcon aria-hidden="true" />
            {data.mission ? "Use for current Mission" : "Find a step for this place"}
          </button>
        </div>
      </section>

      <section className="place-facts" aria-label="Place details">
        <article><MapPin aria-hidden="true" /><span>Address</span><p>{place.address}</p></article>
        <article><Clock3 aria-hidden="true" /><span>Hours</span><p>{place.hours}</p></article>
        <article><span className="fact-symbol">$</span><span>Cost</span><p>{place.cost}</p></article>
        <article><span className="fact-symbol">S</span><span>Social load</span><p>{place.socialLoad}</p></article>
      </section>

      <div className="place-detail-grid">
        <section className="place-fit" aria-labelledby="place-fit-title">
          <p className="app-kicker">Why it may fit</p>
          <h2 id="place-fit-title">Matched to your current preferences</h2>
          <ul>
            <li><Check aria-hidden="true" /> {place.distanceKm <= data.preferences.maxDistanceKm ? "Within" : "Outside"} your preferred distance</li>
            <li><Check aria-hidden="true" /> {place.cost} setting</li>
            <li><Check aria-hidden="true" /> {place.socialLoad} expected social load</li>
            <li><Check aria-hidden="true" /> Flexible enough for a short visit</li>
          </ul>
        </section>

        <section className="place-access" aria-labelledby="place-access-title">
          <p className="app-kicker">Access notes</p>
          <h2 id="place-access-title">Know the environment before you go</h2>
          <div>
            {place.accessibility.map((item) => <span key={item}>{item}</span>)}
          </div>
          <p>Location is used only for the feature you choose. ReNew does not share live location with other users.</p>
        </section>
      </div>

      <section className="related-places" aria-labelledby="related-place-title">
        <div className="section-title-row">
          <div>
            <p className="app-kicker">Other settings</p>
            <h2 id="related-place-title">Two nearby alternatives</h2>
          </div>
        </div>
        <div>
          {relatedPlaces.map((item) => (
            <Link to={`/app/places/${item.id}`} key={item.id}>
              <span className={`place-swatch is-${item.color}`} aria-hidden="true" />
              <div><p>{item.name}</p><span>{item.type} / {item.distanceKm} km</span></div>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
