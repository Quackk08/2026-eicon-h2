import { ArrowRight, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../state/AppState";

/** The reviewed-activities half of the Nearby tab. */
export function ActivitiesPanel() {
  const { data, online } = useAppState();
  const [query, setQuery] = useState("");
  const [load, setLoad] = useState<"All" | "Low" | "Medium">("All");
  const [joinedOnly, setJoinedOnly] = useState(false);

  const activities = useMemo(
    () =>
      data.community.filter((activity) => {
        const matchesQuery = `${activity.title} ${activity.host} ${activity.place}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesLoad = load === "All" || activity.socialLoad === load;
        const matchesJoined = !joinedOnly || activity.joined;
        return matchesQuery && matchesLoad && matchesJoined;
      }),
    [data.community, joinedOnly, load, query]
  );

  return (
    <>
      <aside className="community-safety-note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Structured and reviewed</strong>
          <p>No private messages, random one-to-one matching, or live location sharing.</p>
        </div>
      </aside>

      <section className="place-tools" aria-label="Community filters">
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">Search community activities</span>
          <input value={query} placeholder="Search activities" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button
          className={joinedOnly ? "filter-toggle is-active" : "filter-toggle"}
          type="button"
          aria-pressed={joinedOnly}
          onClick={() => setJoinedOnly((current) => !current)}
        >
          <Users aria-hidden="true" /> Joined
        </button>
      </section>

      <div className="place-type-tabs" role="group" aria-label="Expected social load">
        {(["All", "Low", "Medium"] as const).map((item) => (
          <button className={load === item ? "is-active" : ""} type="button" aria-pressed={load === item} onClick={() => setLoad(item)} key={item}>
            {item === "All" ? "All social settings" : `${item} social load`}
          </button>
        ))}
      </div>

      {activities.length ? (
        <section className="community-list" aria-label="Community activities">
          {activities.map((activity, index) => (
            <article key={activity.id}>
              <div className="community-date-mark">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{activity.dateLabel}</p>
              </div>
              <div className="community-copy">
                <p className="app-kicker">{activity.host}</p>
                <h2>{activity.title}</h2>
                <p>{activity.description}</p>
                <div className="place-tags">
                  <span>{activity.place}</span>
                  <span>{activity.socialLoad} social load</span>
                  <span>{activity.capacity}</span>
                  {activity.joined && <span className="joined-tag">Joined</span>}
                </div>
              </div>
              <Link className="community-detail-link" to={`/app/community/${activity.id}`} aria-label={`View ${activity.title}`}>
                <ArrowRight aria-hidden="true" />
              </Link>
            </article>
          ))}
        </section>
      ) : data.community.length === 0 ? (
        <section className="empty-results">
          <p className="app-kicker">No activities loaded yet</p>
          <h2>{online ? "Reviewed activities are still on their way." : "Activities arrive with the connection."}</h2>
          <p>
            {online
              ? "If this persists, there may be no reviewed Shared Activities for your area yet."
              : "This device has no cached activities yet. They will appear once ReNew can reach the server."}
          </p>
        </section>
      ) : (
        <section className="empty-results">
          <p className="app-kicker">No matching activities</p>
          <h2>Try a different social setting or view all reviewed Shared Activities.</h2>
          <button className="secondary-command" type="button" onClick={() => { setQuery(""); setLoad("All"); setJoinedOnly(false); }}>
            Reset filters
          </button>
        </section>
      )}
    </>
  );
}
