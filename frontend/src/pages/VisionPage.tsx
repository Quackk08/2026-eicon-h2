import { useState, type FormEvent } from "react";
import { ArrowRight, Edit3, Pause, Play, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { LifeDomain } from "../data/appData";
import { updateVision as updateVisionOnServer } from "../api/backend";
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
  const { data, updateData } = useAppState();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(data.vision.title);
  const [description, setDescription] = useState(data.vision.description);
  const [domain, setDomain] = useState<LifeDomain>(data.vision.domain);

  const saveVision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const visionId = data.vision.id;
    updateData((current) => ({
      ...current,
      vision: { ...current.vision, title: title.trim(), description: description.trim(), domain }
    }));
    setEditing(false);

    try {
      await updateVisionOnServer(visionId, { summary: title.trim(), domain });
    } catch {
      // Saved locally; it syncs on the next successful load.
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
    const nextStatus = data.vision.status === "active" ? "paused" : "active";
    updateData((current) => ({
      ...current,
      vision: { ...current.vision, status: nextStatus }
    }));

    try {
      await updateVisionOnServer(visionId, { status: nextStatus });
    } catch {
      // Saved locally; it syncs on the next successful load.
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
            <select id="vision-domain" value={domain} onChange={(event) => setDomain(event.target.value as LifeDomain)}>
              {visionDomains.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="vision-title">Vision title</label>
            <input id="vision-title" value={title} maxLength={90} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div className="field-group">
            <label htmlFor="vision-description">Vision statement</label>
            <textarea id="vision-description" value={description} rows={6} maxLength={400} onChange={(event) => setDescription(event.target.value)} required />
          </div>
          <div className="vision-edit-actions">
            <button className="secondary-command" type="button" onClick={cancelEditing}>
              <X aria-hidden="true" /> Cancel
            </button>
            <button className="primary-command" type="submit">
              <Save aria-hidden="true" /> Save Vision
            </button>
          </div>
        </form>
      )}

      <section className="vision-route-link">
        <div>
          <p className="app-kicker">Connected route</p>
          <h2>{data.route.length} steps can flex around this direction.</h2>
          <p>{data.route.filter((step) => step.completed).length} steps have been explored so far.</p>
        </div>
        <Link className="primary-command" to="/app/route">
          Open Life Route <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className="vision-principles">
        <p className="app-kicker">What stays true</p>
        <div>
          <article><span>01</span><p>You can rewrite this Vision at any time.</p></article>
          <article><span>02</span><p>Pausing does not remove your history or Route.</p></article>
          <article><span>03</span><p>Today’s capacity changes the step, not your worth.</p></article>
        </div>
      </section>
    </main>
  );
}
