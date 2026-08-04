import { useState, type FormEvent } from "react";
import { ArrowRight, Edit3, Pause, Play, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { LifeDomain, LifeVision } from "../data/appData";
import {
  composeVisionSummary,
  createVisionWithRoute,
  updateVision as updateVisionOnServer
} from "../api/backend";
import { useAppState } from "../state/AppState";

const visionDomains: LifeDomain[] = [
  "Study & focus",
  "Sleep & energy",
  "Relationships",
  "Movement & health",
  "Creativity",
  "Daily independence",
  "Community",
  "Stress recovery"
];

export function VisionPage() {
  const { data, updateData, refresh } = useAppState();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(data.vision.title);
  const [description, setDescription] = useState(data.vision.description);
  const [domain, setDomain] = useState<LifeDomain>(data.vision.domain);

  /* D2: creating a new vision requires pausing the current one first */
  const [newVisionOpen, setNewVisionOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDomain, setNewDomain] = useState<LifeDomain>("Study & focus");
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveVision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const visionId = data.vision.id;
    if (!visionId) return;
    setSaving(true);
    setError(null);
    updateData((current) => ({
      ...current,
      vision: { ...current.vision, title: title.trim(), description: description.trim(), domain }
    }));
    setEditing(false);

    try {
      await updateVisionOnServer(visionId, {
        summary: composeVisionSummary(title, description),
        domain
      });
      await refresh();
    } catch {
      setError("The Vision was kept on this device, but the server could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setTitle(data.vision.title);
    setDescription(data.vision.description);
    setDomain(data.vision.domain);
    setEditing(false);
  };

  const toggleStatus = async () => {
    const visionId = data.vision.id;
    if (!visionId) return;
    const nextStatus = data.vision.status === "active" ? "paused" : "active";
    updateData((current) => ({
      ...current,
      vision: { ...current.vision, status: nextStatus }
    }));

    try {
      await updateVisionOnServer(visionId, { status: nextStatus });
      await refresh();
    } catch {
      setError("The Vision status could not be updated on the server.");
    }
  };

  /* D2: Pause current vision then activate the new one */
  const activateNewVision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createVisionWithRoute(
        newDomain,
        composeVisionSummary(newTitle, newDescription)
      );
      await refresh();
      setNewVisionOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewDomain("Study & focus");
      setPauseConfirmOpen(false);
    } catch {
      setError("The new Vision could not be created. Please try again when the server is reachable.");
    } finally {
      setSaving(false);
    }
  };

  const handleNewVisionRequest = () => {
    if (data.vision.status === "active") {
      /* Must confirm pause before proceeding */
      setPauseConfirmOpen(true);
    } else {
      setNewVisionOpen(true);
    }
  };

  const confirmPauseAndNew = () => {
    setPauseConfirmOpen(false);
    setNewVisionOpen(true);
  };

  const resumePastVision = async (past: LifeVision) => {
    setSaving(true);
    setError(null);
    updateData((current) => {
      /* Archive current active vision */
      const archived: LifeVision = { ...current.vision, status: "paused" };
      const remaining = (current.pastVisions ?? []).filter((v) => v.id !== past.id);
      return {
        ...current,
        pastVisions: [...remaining, archived],
        vision: { ...past, status: "active" }
      };
    });
    try {
      await updateVisionOnServer(past.id, { status: "active" });
      await refresh();
    } catch {
      setError("That Vision could not be resumed on the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-page planning-page vision-page">
      <header className="planning-heading">
        <div>
          <p className="app-kicker">Life Vision</p>
          <h1>A direction you can return to.</h1>
          <p>Your Vision holds the longer story. Daily actions can change without losing it.</p>
        </div>
        <span className={`vision-status is-${data.vision.status}`}>{data.vision.status}</span>
      </header>

      {error && <p className="auth-note" role="alert">{error}</p>}

      {!editing ? (
        <section className="vision-statement">
          <div className="vision-number" aria-hidden="true">V1</div>
          <p className="app-kicker">{data.vision.domain}</p>
          <h2>{data.vision.title}</h2>
          <p>{data.vision.description}</p>
          <div className="vision-actions">
            <button className="primary-command" type="button" onClick={() => setEditing(true)}>
              <Edit3 aria-hidden="true" /> Edit Vision
            </button>
            <button className="secondary-command" type="button" onClick={toggleStatus}>
              {data.vision.status === "active" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {data.vision.status === "active" ? "Pause Vision" : "Resume Vision"}
            </button>
          </div>
        </section>
      ) : (
        <form className="vision-edit-form" onSubmit={saveVision}>
          <div className="field-group">
            <label htmlFor="vision-domain">Starting area</label>
            <select id="vision-domain" value={domain} onChange={(e) => setDomain(e.target.value as LifeDomain)}>
              {visionDomains.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="vision-title">Vision title</label>
            <input id="vision-title" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field-group">
            <label htmlFor="vision-description">Vision statement</label>
            <textarea id="vision-description" value={description} rows={6} maxLength={400} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="vision-edit-actions">
            <button className="secondary-command" type="button" onClick={cancelEditing}>
              <X aria-hidden="true" /> Cancel
            </button>
            <button className="primary-command" type="submit" disabled={saving}>
              <Save aria-hidden="true" /> Save Vision
            </button>
          </div>
        </form>
      )}

      {/* D2: Pause-confirm before starting a new Vision */}
      {pauseConfirmOpen && (
        <section className="vision-pause-confirm" role="dialog" aria-modal="true" aria-labelledby="pause-confirm-title">
          <div>
            <p className="app-kicker">One active Vision at a time</p>
            <h2 id="pause-confirm-title">Pause your current Vision first?</h2>
            <p>Your current Vision and Route will be paused and kept in the list below. You can resume it at any time.</p>
          </div>
          <div>
            <button className="secondary-command" type="button" onClick={() => setPauseConfirmOpen(false)}>
              Keep current Vision
            </button>
            <button className="primary-command" type="button" onClick={confirmPauseAndNew}>
              Pause and start a new one
            </button>
          </div>
        </section>
      )}

      {/* D2: New Vision form */}
      {newVisionOpen && (
        <form className="vision-edit-form vision-new-form" onSubmit={activateNewVision}>
          <div>
            <p className="app-kicker">New Life Vision</p>
            <h2>Name the next direction.</h2>
          </div>
          <div className="field-group">
            <label htmlFor="new-vision-domain">Starting area</label>
            <select id="new-vision-domain" value={newDomain} onChange={(e) => setNewDomain(e.target.value as LifeDomain)}>
              {visionDomains.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="new-vision-title">Vision title</label>
            <input id="new-vision-title" value={newTitle} maxLength={90} onChange={(e) => setNewTitle(e.target.value)} required />
          </div>
          <div className="field-group">
            <label htmlFor="new-vision-description">Vision statement</label>
            <textarea id="new-vision-description" value={newDescription} rows={5} maxLength={400} onChange={(e) => setNewDescription(e.target.value)} required />
          </div>
          <div className="vision-edit-actions">
            <button className="secondary-command" type="button" onClick={() => setNewVisionOpen(false)}>
              <X aria-hidden="true" /> Cancel
            </button>
            <button className="primary-command" type="submit" disabled={saving}>
              <Save aria-hidden="true" /> Activate new Vision
            </button>
          </div>
        </form>
      )}

      <section className="vision-route-link">
        <div>
          <p className="app-kicker">Connected Route</p>
          <h2>{data.route.length} levels can flex around this direction.</h2>
          <p>{data.route.filter((step) => step.completed).length} levels have been explored so far.</p>
        </div>
        <Link className="primary-command" to="/app/route">
          Open Route <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      {/* D2: New Vision button */}
      <div className="vision-new-action">
        <button className="secondary-command" type="button" onClick={handleNewVisionRequest}>
          Start a different Vision
        </button>
      </div>

      {/* D2: Past Visions list */}
      {(data.pastVisions ?? []).length > 0 && (
        <section className="vision-past-list" aria-labelledby="past-visions-title">
          <p className="app-kicker">Past Visions</p>
          <h2 id="past-visions-title">Paused directions</h2>
          <p>These are kept permanently. Resume any one to make it active again (this will pause the current one).</p>
          <div className="past-vision-grid">
            {(data.pastVisions ?? []).map((v) => (
              <article key={v.id} className="past-vision-card">
                <span className="app-kicker">{v.domain}</span>
                <h3>{v.title}</h3>
                <p>{v.description}</p>
                <button
                  className="secondary-command"
                  type="button"
                  disabled={saving}
                  onClick={() => void resumePastVision(v)}
                >
                  <Play aria-hidden="true" /> Resume this Vision
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="vision-principles">
        <p className="app-kicker">What stays true</p>
        <div>
          <article><span>01</span><p>You can rewrite this Vision at any time.</p></article>
          <article><span>02</span><p>Pausing does not remove your history or Route.</p></article>
          <article><span>03</span><p>Today's capacity changes the step, not your worth.</p></article>
        </div>
      </section>
    </main>
  );
}
