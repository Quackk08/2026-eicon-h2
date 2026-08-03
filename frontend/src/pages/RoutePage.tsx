import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Circle,
  Edit3,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import type { RouteStep } from "../data/appData";
import { useAppState } from "../state/AppState";

export function RoutePage() {
  const { data, updateData } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMinutes, setDraftMinutes] = useState(10);
  const [draftPlace, setDraftPlace] = useState("Flexible");
  const completedCount = data.route.filter((step) => step.completed).length;

  const beginEdit = (step: RouteStep) => {
    setEditingId(step.id);
    setDraftTitle(step.title);
    setDraftMinutes(step.durationMinutes);
    setDraftPlace(step.placeType);
    setAdding(false);
  };

  const closeEditor = () => {
    setEditingId(null);
    setAdding(false);
    setDraftTitle("");
    setDraftMinutes(10);
    setDraftPlace("Flexible");
  };

  const saveStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((current) => {
      if (adding) {
        return {
          ...current,
          route: [
            ...current.route,
            {
              id: crypto.randomUUID(),
              level: current.route.length + 1,
              title: draftTitle.trim(),
              durationMinutes: draftMinutes,
              placeType: draftPlace.trim(),
              completed: false
            }
          ]
        };
      }

      return {
        ...current,
        route: current.route.map((step) =>
          step.id === editingId
            ? { ...step, title: draftTitle.trim(), durationMinutes: draftMinutes, placeType: draftPlace.trim() }
            : step
        )
      };
    });
    closeEditor();
  };

  const toggleComplete = (id: string) => {
    updateData((current) => ({
      ...current,
      route: current.route.map((step) => (step.id === id ? { ...step, completed: !step.completed } : step))
    }));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= data.route.length) return;
    updateData((current) => {
      const route = [...current.route];
      [route[index], route[target]] = [route[target], route[index]];
      return { ...current, route: route.map((step, routeIndex) => ({ ...step, level: routeIndex + 1 })) };
    });
  };

  const deleteStep = (id: string) => {
    updateData((current) => ({
      ...current,
      route: current.route
        .filter((step) => step.id !== id)
        .map((step, index) => ({ ...step, level: index + 1 }))
    }));
  };

  return (
    <main className="app-page planning-page route-page">
      <header className="planning-heading route-heading">
        <div>
          <p className="app-kicker">Adaptive Life Route</p>
          <h1>One direction, many workable sizes.</h1>
          <p>Reorder, rewrite, or pause any step. The Route belongs to you.</p>
        </div>
      </header>

      <section className="vision-summary-card" aria-labelledby="vision-summary-title">
        <div className="vision-summary-content">
          <p className="app-kicker">Current direction</p>
          <h2 id="vision-summary-title">{data.vision.title}</h2>
          <p>{data.vision.description}</p>
        </div>
        <Link className="secondary-command" to="/app/vision">
          View / edit Vision <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <section className="route-overview">
        <div>
          <span>{completedCount}</span>
          <p>steps explored</p>
        </div>
        <div>
          <span>{data.route.length - completedCount}</span>
          <p>sizes still available</p>
        </div>
        <div className="route-overview-progress">
          <span>{data.route.length ? Math.round((completedCount / data.route.length) * 100) : 0}%</span>
          <div aria-hidden="true"><i style={{ width: `${data.route.length ? (completedCount / data.route.length) * 100 : 0}%` }} /></div>
        </div>
      </section>

      <section className="route-manager" aria-labelledby="route-manager-title">
        <div className="route-manager-heading">
          <div>
            <p className="app-kicker">From smallest to widest</p>
            <h2 id="route-manager-title">Your current ladder</h2>
          </div>
          <button
            className="primary-command"
            type="button"
            onClick={() => {
              closeEditor();
              setAdding(true);
            }}
          >
            <Plus aria-hidden="true" /> Add step
          </button>
        </div>

        <ol className="route-manager-list">
          {data.route.map((step, index) => (
            <li className={step.completed ? "is-completed" : ""} key={step.id}>
              <button
                className="route-complete-button"
                type="button"
                aria-label={step.completed ? `Mark ${step.title} incomplete` : `Mark ${step.title} complete`}
                title={step.completed ? "Mark incomplete" : "Mark complete"}
                onClick={() => toggleComplete(step.id)}
              >
                {step.completed ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
              </button>
              <span className="route-level-label">Level {String(step.level).padStart(2, "0")}</span>
              <div className="route-step-copy">
                <p>{step.title}</p>
                <span>{step.durationMinutes} min / {step.placeType}</span>
              </div>
              <div className="route-row-actions">
                <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label="Move step up" title="Move up">
                  <ArrowUp aria-hidden="true" />
                </button>
                <button type="button" onClick={() => moveStep(index, 1)} disabled={index === data.route.length - 1} aria-label="Move step down" title="Move down">
                  <ArrowDown aria-hidden="true" />
                </button>
                <button type="button" onClick={() => beginEdit(step)} aria-label={`Edit ${step.title}`} title="Edit step">
                  <Edit3 aria-hidden="true" />
                </button>
                <button type="button" onClick={() => deleteStep(step.id)} aria-label={`Delete ${step.title}`} title="Delete step">
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {(editingId || adding) && (
        <form className="route-editor" onSubmit={saveStep}>
          <div className="route-editor-heading">
            <div>
              <p className="app-kicker">{adding ? "New route step" : "Adjust this step"}</p>
              <h2>{adding ? "Add another workable size" : "Rewrite without losing the direction"}</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close editor" title="Close editor" onClick={closeEditor}>
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="route-editor-fields">
            <div className="field-group">
              <label htmlFor="route-step-title">Step title</label>
              <input id="route-step-title" value={draftTitle} maxLength={160} onChange={(event) => setDraftTitle(event.target.value)} required />
            </div>
            <div className="field-group">
              <label htmlFor="route-step-minutes">Minutes</label>
              <input id="route-step-minutes" type="number" min="1" max="180" value={draftMinutes} onChange={(event) => setDraftMinutes(Number(event.target.value))} required />
            </div>
            <div className="field-group">
              <label htmlFor="route-step-place">Place type</label>
              <input id="route-step-place" value={draftPlace} maxLength={80} onChange={(event) => setDraftPlace(event.target.value)} required />
            </div>
          </div>
          <button className="primary-command" type="submit">
            <Save aria-hidden="true" /> Save step
          </button>
        </form>
      )}
    </main>
  );
}
