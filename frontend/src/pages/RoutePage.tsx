import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Circle,
  Edit3,
  Info,
  Plus,
  Save,
  Trash2,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import type { RouteStep } from "../data/appData";
import {
  addRouteStep as addRouteStepOnServer,
  editRouteStep,
  removeRouteStep,
  reorderRouteSteps,
  updateRouteStepStatus
} from "../api/backend";
import { useAppState } from "../state/AppState";

export function RoutePage() {
  const { data, updateData, refresh } = useAppState();
  const reducedMotion = data.settings.reducedMotion;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMinutes, setDraftMinutes] = useState(10);
  const [draftPlace, setDraftPlace] = useState("Flexible");
  const [recentlyLevelledId, setRecentlyLevelledId] = useState<string | null>(null);
  const [staircaseInfoOpen, setStaircaseInfoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const saveStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data.routeId) {
      setError("This Route is not available on the server yet.");
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      title: draftTitle.trim(),
      durationMinutes: draftMinutes,
      placeType: draftPlace.trim()
    };
    try {
      if (adding) {
        await addRouteStepOnServer(data.routeId, input);
      } else if (editingId) {
        await editRouteStep(data.routeId, editingId, input);
      }
      await refresh();
      closeEditor();
    } catch {
      setError("The Route step could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (id: string) => {
    const previous = data.route.find((step) => step.id === id);
    if (!previous) return;
    const willComplete = !previous.completed;
    updateData((current) => {
      return {
        ...current,
        route: current.route.map((s) => (s.id === id ? { ...s, completed: willComplete } : s))
      };
    });
    // Trigger level-up announcement/animation
    if (willComplete) {
      setRecentlyLevelledId(id);
      setTimeout(() => setRecentlyLevelledId(null), 2000);
    }

    if (!data.routeId) return;
    try {
      await updateRouteStepStatus(data.routeId, id, willComplete ? "done" : "pending");
      await refresh();
    } catch {
      updateData((current) => ({
        ...current,
        route: current.route.map((step) =>
          step.id === id ? { ...step, completed: previous.completed } : step
        )
      }));
    }
  };

  const moveStep = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= data.route.length || !data.routeId) return;
    const original = [...data.route];
    const route = [...data.route];
    [route[index], route[target]] = [route[target], route[index]];
    updateData((current) => ({
      ...current,
      route: route.map((step, routeIndex) => ({ ...step, level: routeIndex + 1 }))
    }));
    try {
      await reorderRouteSteps(data.routeId, route.map((step) => step.id));
      await refresh();
    } catch {
      updateData((current) => ({ ...current, route: original }));
      setError("The Route order could not be saved.");
    }
  };

  const deleteStep = async (id: string) => {
    if (!data.routeId) return;
    setSaving(true);
    setError(null);
    try {
      await removeRouteStep(data.routeId, id);
      await refresh();
    } catch {
      setError("The Route step could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Build staircase levels sorted lowest→highest ─── */
  const sortedRoute = [...data.route].sort((a, b) => a.level - b.level);
  const currentStepIndex = sortedRoute.findIndex((s) => !s.completed);
  // The "current" level is the first incomplete step

  return (
    <main className="app-page planning-page route-page">
      <header className="planning-heading route-heading">
        <div>
          <p className="app-kicker">Adaptive Life Route</p>
          <h1>One direction, many workable sizes.</h1>
          <p>Reorder, rewrite, or pause any step. The Route belongs to you.</p>
        </div>
      </header>

      {error && <p className="auth-note" role="alert">{error}</p>}

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
          <p>levels explored</p>
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

      {/* ─── Staircase / path visualization ─── */}
      {data.route.length > 0 && (
        <section className="route-staircase" aria-label="Route staircase — visual overview">
          {/* Info affordance for the diagram */}
          <div className="route-staircase-header">
            <p className="app-kicker">Your path at a glance</p>
            <button
              className="info-affordance"
              type="button"
              aria-label="What does this diagram show?"
              aria-expanded={staircaseInfoOpen}
              onClick={() => setStaircaseInfoOpen((v) => !v)}
            >
              <Info aria-hidden="true" />
            </button>
          </div>
          {staircaseInfoOpen && (
            <aside className="info-disclosure" role="note">
              <p>Each column is one Level — from the smallest action on the left to the biggest on the right. The highlighted column is where you are now. Completing a Mission at a Level moves you forward.</p>
              <button type="button" className="text-button" onClick={() => setStaircaseInfoOpen(false)}>Close</button>
            </aside>
          )}
          <div
            className={`route-staircase-inner${reducedMotion ? " is-reduced" : ""}`}
            aria-hidden="true"
          >
            {sortedRoute.map((step, i) => {
              const isCompleted = step.completed;
              const isCurrent = i === currentStepIndex;
              const stepClass = isCompleted
                ? "route-stair is-completed"
                : isCurrent
                  ? "route-stair is-current"
                  : "route-stair";
              return (
                <div
                  key={step.id}
                  className={stepClass}
                  style={{ "--stair-index": i } as React.CSSProperties}
                >
                  <span className="route-stair-level">L{step.level}</span>
                  {isCurrent && <span className="route-stair-you">You</span>}
                </div>
              );
            })}
          </div>
          {/* Level-up confirmation (non-animated, always readable) */}
          {recentlyLevelledId && (
            <p className="route-levelup-notice" aria-live="polite" role="status">
              Level {data.route.find((s) => s.id === recentlyLevelledId)?.level} explored. Well done.
            </p>
          )}
        </section>
      )}

      <section className="route-manager" aria-labelledby="route-manager-title">
        <div className="route-manager-heading">
          <div>
            <p className="app-kicker">From smallest to widest</p>
            <h2 id="route-manager-title">Your current Route</h2>
          </div>
          <button
            className="primary-command"
            type="button"
            onClick={() => {
              closeEditor();
              setAdding(true);
            }}
          >
            <Plus aria-hidden="true" /> Add level
          </button>
        </div>

        <ol className="route-manager-list">
          {data.route.map((step, index) => {
            const isLevelledUp = recentlyLevelledId === step.id;
            return (
              <li
                className={[
                  step.completed ? "is-completed" : "",
                  isLevelledUp ? "is-levelled-up" : ""
                ].filter(Boolean).join(" ")}
                key={step.id}
              >
                <button
                  className="route-complete-button"
                  type="button"
                  aria-label={step.completed ? `Mark Level ${step.level} incomplete` : `Mark Level ${step.level} complete`}
                  title={step.completed ? "Mark incomplete" : "Mark complete"}
                  disabled={saving}
                  onClick={() => void toggleComplete(step.id)}
                >
                  {step.completed ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                </button>
                <span className="route-level-label">Level {String(step.level).padStart(2, "0")}</span>
                <div className="route-step-copy">
                  <p>{step.title}</p>
                  <span>{step.durationMinutes} min / {step.placeType}</span>
                </div>
                <div className="route-row-actions">
                  <button type="button" onClick={() => void moveStep(index, -1)} disabled={saving || index === 0} aria-label="Move level up" title="Move up">
                    <ArrowUp aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => void moveStep(index, 1)} disabled={saving || index === data.route.length - 1} aria-label="Move level down" title="Move down">
                    <ArrowDown aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => beginEdit(step)} aria-label={`Edit Level ${step.level}`} title="Edit level">
                    <Edit3 aria-hidden="true" />
                  </button>
                  <button type="button" disabled={saving} onClick={() => void deleteStep(step.id)} aria-label={`Delete Level ${step.level}`} title="Delete level">
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {(editingId || adding) && (
        <form className="route-editor" onSubmit={saveStep}>
          <div className="route-editor-heading">
            <div>
              <p className="app-kicker">{adding ? "New Route level" : "Adjust this level"}</p>
              <h2>{adding ? "Add another workable size" : "Rewrite without losing the direction"}</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close editor" title="Close editor" onClick={closeEditor}>
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="route-editor-fields">
            <div className="field-group">
              <label htmlFor="route-step-title">Level title</label>
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
          <button className="primary-command" type="submit" disabled={saving}>
            <Save aria-hidden="true" /> Save level
          </button>
        </form>
      )}
    </main>
  );
}
