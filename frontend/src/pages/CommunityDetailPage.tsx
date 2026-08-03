import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  cancelCommunityActivity,
  joinCommunityActivity,
  reportCommunityActivity
} from "../api/backend";
import { useAppState } from "../state/AppState";

export function CommunityDetailPage() {
  const { activityId } = useParams();
  const { data, updateData, refresh } = useAppState();
  const activity = data.community.find((item) => item.id === activityId);
  const [confirming, setConfirming] = useState<"join" | "cancel" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  if (!activity) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Activity not found</p>
        <h1>This step is not in the reviewed community list.</h1>
        <Link className="primary-command" to="/app/community">Return to Community <ArrowRight aria-hidden="true" /></Link>
      </main>
    );
  }

  const linkedPlace = data.places.find((place) => place.name === activity.place);

  const confirmParticipation = async () => {
    const joined = confirming === "join";
    updateData((current) => ({
      ...current,
      community: current.community.map((item) => (item.id === activity.id ? { ...item, joined } : item))
    }));
    setConfirming(null);

    try {
      if (joined) {
        await joinCommunityActivity(activity.id);
      } else {
        await cancelCommunityActivity(activity.id);
      }
      await refresh();
    } catch {
      // Recorded locally; it syncs on the next successful load.
    }
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const reason = new FormData(form).get("reason");
    const details = new FormData(form).get("details");
    setReportSent(true);
    setReportOpen(false);

    try {
      await reportCommunityActivity(activity.id, [reason, details].filter(Boolean).join(": "));
    } catch {
      // The report stays queued locally rather than being lost.
    }
  };

  return (
    <main className="app-page discovery-page community-detail-page">
      <header className="detail-topbar">
        <Link className="icon-button" to="/app/community" aria-label="Back to Community" title="Back to Community">
          <ArrowLeft aria-hidden="true" />
        </Link>
        {activity.joined && <span className="joined-status"><Check aria-hidden="true" /> Joined</span>}
      </header>

      <section className="community-detail-hero">
        <div>
          <p className="app-kicker">Reviewed Community Step</p>
          <h1>{activity.title}</h1>
          <p>{activity.description}</p>
        </div>
        <div className="community-detail-number" aria-hidden="true">C1</div>
      </section>

      <section className="community-facts">
        <article><CalendarDays aria-hidden="true" /><span>When</span><p>{activity.dateLabel}</p></article>
        <article><MapPin aria-hidden="true" /><span>Where</span><p>{activity.place}</p></article>
        <article><Users aria-hidden="true" /><span>Group</span><p>{activity.capacity}</p></article>
        <article><ShieldCheck aria-hidden="true" /><span>Social load</span><p>{activity.socialLoad}</p></article>
      </section>

      <div className="community-detail-grid">
        <section className="participation-panel" aria-labelledby="participation-title">
          <p className="app-kicker">Participation</p>
          <h2 id="participation-title">Choose with full context.</h2>
          <ul>
            <li><Check aria-hidden="true" /> The activity happens in a reviewed public place.</li>
            <li><Check aria-hidden="true" /> Conversation is optional unless clearly stated.</li>
            <li><Check aria-hidden="true" /> You can leave or cancel at any point.</li>
            <li><Check aria-hidden="true" /> No private contact details are shared in ReNew.</li>
          </ul>

          {activity.joined ? (
            <button className="secondary-command" type="button" onClick={() => setConfirming("cancel")}>
              <X aria-hidden="true" /> Cancel participation
            </button>
          ) : (
            <button className="primary-command" type="button" onClick={() => setConfirming("join")}>
              Join this step <ArrowRight aria-hidden="true" />
            </button>
          )}
        </section>

        <section className="host-panel" aria-labelledby="host-title">
          <p className="app-kicker">Reviewed host</p>
          <h2 id="host-title">{activity.host}</h2>
          <p>The host provides the public venue, activity structure, start time, end time, and on-site contact point.</p>
          {linkedPlace && (
            <Link className="inline-arrow-link" to={`/app/places/${linkedPlace.id}`}>
              View venue details <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </section>
      </div>

      {confirming && (
        <section className="participation-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div>
            <p className="app-kicker">Confirm your choice</p>
            <h2 id="confirm-title">{confirming === "join" ? "Join this Community Step?" : "Cancel your place?"}</h2>
            <p>
              {confirming === "join"
                ? `${activity.title} at ${activity.place}, ${activity.dateLabel}. ReNew will only save your participation on this device.`
                : "Your place will be released. Your personal Check-In and Mission data are never shared with the host."}
            </p>
          </div>
          <div>
            <button className="secondary-command" type="button" onClick={() => setConfirming(null)}>Go back</button>
            <button className="primary-command" type="button" onClick={confirmParticipation}>
              Confirm {confirming === "join" ? "join" : "cancellation"} <Check aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      <section className="community-report">
        <div>
          <AlertTriangle aria-hidden="true" />
          <div><strong>Something does not look right?</strong><p>Reports are sent to the ReNew review team.</p></div>
        </div>
        <button className="text-button" type="button" onClick={() => setReportOpen((current) => !current)}>
          {reportSent ? "Report recorded" : "Report activity"}
        </button>
      </section>

      {reportOpen && (
        <form className="report-form" onSubmit={submitReport}>
          <div className="field-group">
            <label htmlFor="report-reason">Reason</label>
            <select id="report-reason" name="reason" required defaultValue="">
              <option value="" disabled>Select a reason</option>
              <option>Incorrect activity details</option>
              <option>Safety or access concern</option>
              <option>Host or venue concern</option>
              <option>Other</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="report-note">Details</label>
            <textarea id="report-note" name="details" rows={4} maxLength={500} required />
          </div>
          <button className="primary-command" type="submit">Record report <ArrowRight aria-hidden="true" /></button>
        </form>
      )}
    </main>
  );
}
