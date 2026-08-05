import { MapPin, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAppState } from "../state/AppState";
import { PlacesPanel } from "./PlacesPanel";
import { ActivitiesPanel } from "./ActivitiesPanel";

type Segment = "places" | "activities";

const SEGMENTS: { value: Segment; label: string; icon: typeof MapPin }[] = [
  { value: "places", label: "Places", icon: MapPin },
  { value: "activities", label: "Activities", icon: Users }
];

const COPY: Record<Segment, { kicker: string; title: string; blurb: string }> = {
  places: {
    kicker: "Local Life Network",
    title: "Real places for workable steps.",
    blurb:
      "Reviewed seed locations, filtered around your distance, cost, access, and social preferences."
  },
  activities: {
    kicker: "Pre-reviewed group activities",
    title: "Shared Activities",
    blurb:
      "These are pre-reviewed group activities — not a social feed. Each has a clear host, public venue, defined start and end time, and no private messaging."
  }
};

/**
 * Places and Shared Activities, as one destination.
 *
 * They were two sibling tabs that spent most of their space linking to each
 * other, which is the shape of one thing split in half: both answer "what is
 * around me that I could actually do". Merging them also gives the bottom
 * navigation back a slot — it only ever shows five, so the sixth entry was
 * already being dropped on phones.
 *
 * The choice lives in the URL rather than in component state so the segment
 * survives a reload, can be linked to, and moves with the browser's Back
 * button. Anything unrecognised falls back to Places rather than rendering
 * nothing.
 */
export function NearbyPage() {
  const { data } = useAppState();
  const [params, setParams] = useSearchParams();
  const segment: Segment = params.get("show") === "activities" ? "activities" : "places";
  const copy = COPY[segment];

  const counts: Record<Segment, number> = {
    places: data.places.length,
    activities: data.community.length
  };

  return (
    <main className="app-page discovery-page nearby-page">
      <header className="discovery-heading">
        <div>
          <p className="app-kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <p>{copy.blurb}</p>
        </div>
      </header>

      {/* Filters, not tabs — matching the groups inside each panel, and
          there is no tabpanel here for a tablist to control. */}
      <div className="nearby-segments" role="group" aria-label="Show places or activities">
        {SEGMENTS.map(({ value, label, icon: Icon }) => (
          <button
            className={segment === value ? "is-active" : ""}
            type="button"
            aria-pressed={segment === value}
            key={value}
            // replace: flipping between the two halves of one screen is not
            // a place someone means to go Back through one step at a time.
            onClick={() => setParams(value === "places" ? {} : { show: value }, { replace: true })}
          >
            <Icon aria-hidden="true" />
            {label}
            {counts[value] > 0 && <span className="nearby-segment-count">{counts[value]}</span>}
          </button>
        ))}
      </div>

      {segment === "places" ? <PlacesPanel /> : <ActivitiesPanel />}
    </main>
  );
}
