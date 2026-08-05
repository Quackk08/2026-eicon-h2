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
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PlacePhoto } from "../components/PlacePhoto";
import { useAppState } from "../state/AppState";

export function CommunityDetailPage() {
  const { activityId } = useParams();
  const { data, updateData, refresh } = useAppState();
  const activity = data.community.find((item) => item.id === activityId);
  const activityIndex = data.community.findIndex((item) => item.id === activityId);
  const [confirming, setConfirming] = useState<"join" | "cancel" | null>(null);
  const [participationBusy, setParticipationBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  if (!activity) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Activity not found</p>
        <h1>This step is not in the reviewed community list.</h1>
        <Link className="primary-command" to="/app/nearby?show=activities">Return to activities <ArrowRight aria-hidden="true" /></Link>
      </main>
    );
  }

  const linkedPlace = data.places.find((place) => place.name === activity.place);

  const confirmParticipation = async () => {
    const joined = confirming === "join";
    setParticipationBusy(true);
    setNotice(null);
    try {
      if (joined) {
        await joinCommunityActivity(activity.id);
      } else {
        await cancelCommunityActivity(activity.id);
      }
      // Only after the server accepted it — a hopeful local flip was quietly
      // reverted on the next reconnect, un-joining people without a word.
      updateData((current) => ({
        ...current,
        community: current.community.map((item) => (item.id === activity.id ? { ...item, joined } : item))
      }));
      setConfirming(null);
      await refresh();
      setNotice({ tone: "ok", text: joined ? "You're in — see you there." : "Your place has been released." });
    } catch {
      setConfirming(null);
      setNotice({
        tone: "error",
        text: joined
          ? "Joining needs the connection. Nothing was changed — please try again."
          : "Cancelling needs the connection. You are still registered — please try again."
      });
    } finally {
      setParticipationBusy(false);
    }
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reason = formData.get("reason");
    const details = formData.get("details");
    setReportBusy(true);
    setNotice(null);

    try {
      await reportCommunityActivity(activity.id, [reason, details].filter(Boolean).join(": "));
      // "Recorded" only once it actually is.
      setReportSent(true);
      setReportOpen(false);
      setNotice({ tone: "ok", text: "Report recorded. The review team will take it from here." });
    } catch {
      setNotice({
        tone: "error",
        text: "The report could not be sent. Please check the connection and try again — nothing was recorded yet."
      });
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <main className="app-page discovery-page community-detail-page">
      <header className="detail-topbar">
        <Link className="icon-button" to="/app/nearby?show=activities" aria-label="Back to activities" title="Back to activities">
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
        <div className="community-detail-number" aria-hidden="true">
          C{activityIndex >= 0 ? activityIndex + 1 : 1}
        </div>
      </section>

      {notice && (
        <p className="auth-note" role={notice.tone === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      )}

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
          {/* Somewhere they have never been is easier to walk into having
              seen it. Only when the venue is a reviewed place we hold a
              photograph of — an activity elsewhere keeps the plain panel. */}
          {linkedPlace?.imageUrl && (
            <div className={`host-venue-visual is-${linkedPlace.color}`} aria-hidden="true">
              <PlacePhoto src={linkedPlace.imageUrl} className="host-venue-photo" />
              <span>{linkedPlace.type}</span>
            </div>
          )}
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

      <ConfirmDialog
        open={confirming !== null}
        kicker="Confirm your choice"
        title={confirming === "join" ? "Join this Community Step?" : "Cancel your place?"}
        confirmLabel={confirming === "join" ? "Confirm join" : "Confirm cancellation"}
        cancelLabel="Go back"
        busy={participationBusy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => void confirmParticipation()}
      >
        <p>
          {confirming === "join"
            ? `${activity.title} at ${activity.place}, ${activity.dateLabel}. Only your participation is recorded — never your Check-Ins or Missions.`
            : "Your place will be released. Your personal Check-In and Mission data are never shared with the host."}
        </p>
      </ConfirmDialog>

      <section className="community-report">
        <div>
          <AlertTriangle aria-hidden="true" />
          <div><strong>Something does not look right?</strong><p>Reports are sent to the ReNew review team.</p></div>
        </div>
        {/* Once recorded, the control retires — it used to keep toggling a
            blank form under a label claiming the report was already in. */}
        {reportSent ? (
          <span className="joined-status"><Check aria-hidden="true" /> Report recorded</span>
        ) : (
          <button className="text-button" type="button" aria-expanded={reportOpen} onClick={() => setReportOpen((current) => !current)}>
            Report activity
          </button>
        )}
      </section>

      {reportOpen && !reportSent && (
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
          <button className="primary-command" type="submit" disabled={reportBusy}>
            {reportBusy ? "Recording..." : "Record report"} <ArrowRight aria-hidden="true" />
          </button>
        </form>
      )}
    </main>
  );
}
