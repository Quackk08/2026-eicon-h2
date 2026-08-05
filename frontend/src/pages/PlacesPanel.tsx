import { Bookmark, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppState";
import { setPlaceSaved } from "../api/backend";
import { PlacePhoto } from "../components/PlacePhoto";

const placeTypes = ["All", "Library", "Cafe", "Park", "Community"];

/** The reviewed-places half of the Nearby tab. */
export function PlacesPanel() {
  const { data, online, updateData } = useAppState();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<"all" | "near" | "close">("all");
  const [costFilter, setCostFilter] = useState<"all" | "free" | "low">("all");

  const places = useMemo(
    () =>
      data.places.filter((place) => {
        const matchesQuery = `${place.name} ${place.type} ${place.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesType = type === "All" || place.type === type;
        const matchesSaved = !savedOnly || data.savedPlaceIds.includes(place.id);
        const matchesDistance =
          distanceFilter === "all" ? true :
          distanceFilter === "near" ? place.distanceKm <= 1 :
          place.distanceKm <= 0.5;
        const matchesCost =
          costFilter === "all" ? true :
          costFilter === "free" ? place.cost === "Free" :
          place.cost === "Free" || place.cost === "Low cost";
        return matchesQuery && matchesType && matchesSaved && matchesDistance && matchesCost;
      }),
    [data.places, data.savedPlaceIds, query, savedOnly, type, distanceFilter, costFilter]
  );

  const resetFilters = () => {
    setQuery(""); setType("All"); setSavedOnly(false);
    setDistanceFilter("all"); setCostFilter("all");
  };

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
    <>
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

      {/* Two mutually exclusive filter sets, each with its own name — one
          anonymous six-button group hid which choice displaced which. */}
      <div className="place-filter-chips">
        <div className="place-filter-chip-group" role="group" aria-label="Filter by distance">
          {([
            ["all", "Any distance"],
            ["near", "Within 1 km"],
            ["close", "Within 0.5 km"]
          ] as const).map(([value, label]) => (
            <button
              type="button"
              className={`place-filter-chip${distanceFilter === value ? " is-active" : ""}`}
              aria-pressed={distanceFilter === value}
              onClick={() => setDistanceFilter(value)}
              key={value}
            >{label}</button>
          ))}
        </div>
        <div className="place-filter-chip-group" role="group" aria-label="Filter by cost">
          {([
            ["all", "Any cost"],
            ["free", "Free only"],
            ["low", "Free / Low cost"]
          ] as const).map(([value, label]) => (
            <button
              type="button"
              className={`place-filter-chip${costFilter === value ? " is-active" : ""}`}
              aria-pressed={costFilter === value}
              onClick={() => setCostFilter(value)}
              key={value}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Filters, not tabs — there is no tabpanel for a tablist to control. */}
      <div className="place-type-tabs" role="group" aria-label="Place type">
        {placeTypes.map((item) => (
          <button
            className={type === item ? "is-active" : ""}
            type="button"
            aria-pressed={type === item}
            onClick={() => setType(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="place-result-meta">
        <span>{places.length} reviewed {places.length === 1 ? "place" : "places"}</span>
        <span><SlidersHorizontal aria-hidden="true" /> Within {data.preferences.maxDistanceKm} km preferred</span>
      </div>

      {places.length ? (
        <section className="place-results" aria-label="Place results">
          {places.map((place, index) => {
            const saved = data.savedPlaceIds.includes(place.id);
            return (
              <article className="place-result" key={place.id}>
                <Link className={`place-result-visual is-${place.color}`} to={`/app/places/${place.id}`} aria-label={`View ${place.name}`}>
                  {/* Decorative: the name sits beside it, so alt stays empty
                      rather than repeating it to a screen reader. A path is
                      mapped for every place, but the files arrive one at a
                      time — a missing one hides itself and leaves the plain
                      panel rather than showing a broken-image icon. */}
                  <PlacePhoto src={place.imageUrl} />
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
                  {place.mission && (
                    <p className="place-mission"><strong>One small step</strong> {place.mission}</p>
                  )}
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
      ) : data.places.length === 0 ? (
        /* Nothing loaded at all — advising "broaden the filters" here blamed
           a filter that was never the problem. */
        <section className="empty-results">
          <p className="app-kicker">No places loaded yet</p>
          <h2>{online ? "The reviewed places are still on their way." : "Places arrive with the connection."}</h2>
          <p>
            {online
              ? "If this persists, the server may not have any reviewed places for your area yet."
              : "This device has no cached places yet. They will appear once ReNew can reach the server."}
          </p>
        </section>
      ) : (
        <section className="empty-results">
          <p className="app-kicker">No matching places</p>
          <h2>Try a broader type or remove the saved filter.</h2>
          <button className="secondary-command" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </section>
      )}
    </>
  );
}
