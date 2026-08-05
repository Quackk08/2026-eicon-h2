import { useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3, MapPin, Route as RouteIcon, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { setMissionPlace, setPlaceSaved } from "../api/backend";
import { useAppState } from "../state/AppState";

/**
 * Carries "find a step for this place" across the Check-In flow: the
 * Recommendation page attaches this place to the Mission it creates, then
 * clears the key. sessionStorage, so the intent dies with the tab.
 */
export const PENDING_PLACE_KEY = "renew-pending-place";

export function PlaceDetailPage() {
  const navigate = useNavigate();
  const { placeId } = useParams();
  const { data, updateData, refresh } = useAppState();
  const [applyingPlace, setApplyingPlace] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
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
  // Nearest first — "nearby alternatives" used to be whatever two entries
  // happened to sit next in the array.
  const relatedPlaces = data.places
    .filter((item) => item.id !== place.id)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 2);

  const toggleSaved = () => {
    const nextSaved = !saved;

    // Applied locally first so the bookmark responds immediately; the write
    // is queued if it cannot reach the server right now.
    updateData((current) => ({
      ...current,
      savedPlaceIds: nextSaved
        ? [...current.savedPlaceIds, place.id]
        : current.savedPlaceIds.filter((id) => id !== place.id)
    }));

    void setPlaceSaved(place.id, nextSaved).catch(() => {
      updateData((current) => ({
        ...current,
        savedPlaceIds: nextSaved
          ? current.savedPlaceIds.filter((id) => id !== place.id)
          : [...current.savedPlaceIds, place.id]
      }));
    });
  };

  const useForMission = async () => {
    if (applyingPlace) return;
    const mission = data.mission;
    if (!mission) {
      // Remember the place through the Check-In flow instead of silently
      // dropping the very thing that brought the person here.
      sessionStorage.setItem(PENDING_PLACE_KEY, place.id);
      navigate("/app/check-in");
      return;
    }
    setApplyingPlace(true);
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, placeId: place.id, placeType: place.type } : null
    }));

    try {
      const { queued } = await setMissionPlace(mission.id, place.id);
      if (!queued) await refresh();
    } finally {
      setApplyingPlace(false);
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
          {/* The list card shows the photo; losing it on tap-through read
              as a broken page. */}
          {place.imageUrl && !photoFailed && (
            <img
              className="place-detail-photo"
              src={place.imageUrl}
              alt=""
              loading="lazy"
              onError={() => setPhotoFailed(true)}
            />
          )}
          <span>{place.type} / {place.distanceKm} km</span>
        </div>
        <div className="place-detail-title">
          <p className="app-kicker">Reviewed local setting</p>
          <h1>{place.name}</h1>
          <p>{place.description}</p>
          <button className="primary-command" type="button" disabled={applyingPlace} onClick={useForMission}>
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
            {/* A green check on "Outside your preferred distance" claimed a
                match the line itself denied. */}
            {place.distanceKm <= data.preferences.maxDistanceKm ? (
              <li><Check aria-hidden="true" /> Within your preferred distance</li>
            ) : (
              <li className="is-unmet"><X aria-hidden="true" /> Outside your preferred distance</li>
            )}
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

      {relatedPlaces.length > 0 && (
        <section className="related-places" aria-labelledby="related-place-title">
          <div className="section-title-row">
            <div>
              <p className="app-kicker">Other settings</p>
              <h2 id="related-place-title">
                {relatedPlaces.length === 1 ? "A nearby alternative" : "Two nearby alternatives"}
              </h2>
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
      )}
    </main>
  );
}
