import { Bookmark, Search, SlidersHorizontal, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppState";
import { setPlaceSaved } from "../api/backend";

const placeTypes = ["All", "Library", "Cafe", "Park", "Community"];

export function PlacesPage() {
  const { data, updateData } = useAppState();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);

  const places = useMemo(
    () =>
      data.places.filter((place) => {
        const matchesQuery = `${place.name} ${place.type} ${place.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesType = type === "All" || place.type === type;
        const matchesSaved = !savedOnly || data.savedPlaceIds.includes(place.id);
        return matchesQuery && matchesType && matchesSaved;
      }),
    [data.places, data.savedPlaceIds, query, savedOnly, type]
  );

  const toggleSaved = (placeId: string) => {
    const nextSaved = !data.savedPlaceIds.includes(placeId);

    // Applied locally first so the bookmark responds immediately; the write
    // is queued if it cannot reach the server right now.
    updateData((current) => ({
      ...current,
      savedPlaceIds: nextSaved
        ? [...current.savedPlaceIds, placeId]
        : current.savedPlaceIds.filter((id) => id !== placeId)
    }));

    void setPlaceSaved(placeId, nextSaved).catch(() => {
      updateData((current) => ({
        ...current,
        savedPlaceIds: nextSaved
          ? current.savedPlaceIds.filter((id) => id !== placeId)
          : [...current.savedPlaceIds, placeId]
      }));
    });
  };

  return (
    <main className="app-page discovery-page places-page">
      <header className="discovery-heading">
        <div>
          <p className="app-kicker">Local Life Network</p>
          <h1>Real places for workable steps.</h1>
          <p>Reviewed seed locations, filtered around your distance, cost, access, and social preferences.</p>
        </div>
        <Link className="secondary-command" to="/app/community">
          <Users aria-hidden="true" /> Community steps
        </Link>
      </header>

      <section className="place-tools" aria-label="Place filters">
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">Search places</span>
          <input value={query} placeholder="Search places" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button
          className={savedOnly ? "filter-toggle is-active" : "filter-toggle"}
          type="button"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly((current) => !current)}
        >
          <Bookmark aria-hidden="true" /> Saved
        </button>
      </section>

      <div className="place-type-tabs" role="tablist" aria-label="Place type">
        {placeTypes.map((item) => (
          <button
            className={type === item ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={type === item}
            onClick={() => setType(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="place-result-meta">
        <span>{places.length} reviewed places</span>
        <span><SlidersHorizontal aria-hidden="true" /> Within {data.preferences.maxDistanceKm} km preferred</span>
      </div>

      {places.length ? (
        <section className="place-results" aria-label="Place results">
          {places.map((place, index) => {
            const saved = data.savedPlaceIds.includes(place.id);
            return (
              <article className="place-result" key={place.id}>
                <Link className={`place-result-visual is-${place.color}`} to={`/app/places/${place.id}`} aria-label={`View ${place.name}`}>
                  <span>{String(index + 1).padStart(2, "0")} / {place.type}</span>
                </Link>
                <div className="place-result-copy">
                  <div>
                    <p className="app-kicker">{place.distanceKm} km / {place.cost}</p>
                    <h2><Link to={`/app/places/${place.id}`}>{place.name}</Link></h2>
                  </div>
                  <p>{place.description}</p>
                  <div className="place-tags">
                    <span>{place.socialLoad} social load</span>
                    {place.accessibility.slice(0, 2).map((item) => <span key={item}>{item}</span>)}
                  </div>
                </div>
                <button
                  className={saved ? "save-place is-saved" : "save-place"}
                  type="button"
                  aria-label={saved ? `Remove ${place.name} from saved places` : `Save ${place.name}`}
                  title={saved ? "Remove from saved" : "Save place"}
                  onClick={() => toggleSaved(place.id)}
                >
                  <Bookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-results">
          <p className="app-kicker">No matching places</p>
          <h2>Try a broader type or remove the saved filter.</h2>
          <button className="secondary-command" type="button" onClick={() => { setQuery(""); setType("All"); setSavedOnly(false); }}>
            Reset filters
          </button>
        </section>
      )}
    </main>
  );
}
