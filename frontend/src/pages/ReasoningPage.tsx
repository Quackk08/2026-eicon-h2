import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReasoningStep } from "@renew/shared";
import { requestDailyRecommendation } from "../api/backend";
import { describeWithLocalModel } from "../ai/localRerank";
import { isEngineReady } from "../ai/webllm";
import { useAppState } from "../state/AppState";

/**
 * The stages the recommendation goes through, named before it runs.
 *
 * Fixed, because the pipeline is fixed — these are the same keys the server
 * sends back, in the same order. Listing them up front is what lets the
 * screen show where the work is without inventing anything: the labels are
 * placeholders for real steps, and every one of them is replaced by the
 * server's own account of what it did.
 */
const STAGES: { key: string; label: string }[] = [
  { key: "route", label: "Looking only at your Route" },
  { key: "state", label: "Reading your Check-In" },
  { key: "limits", label: "Applying your limits" },
  { key: "filter", label: "Keeping what is possible" },
  { key: "score", label: "Picking today's size" },
  { key: "ladder", label: "Holding a way out either side" },
  { key: "ai", label: "Checking who decided" }
];

type Phase = "working" | "done" | "failed";

/**
 * Shows how today's step was chosen, between the Check-In and the result.
 *
 * The honest version of a "thinking" screen. The stage list is real and
 * known in advance; the numbers and sentences arrive from the server and
 * describe branches that actually ran. Nothing is padded with an artificial
 * delay to make the work look harder than it was — when the answer comes
 * back quickly, the reasoning is simply there to read, and the person
 * decides when to move on rather than waiting out an animation.
 */
export function ReasoningPage() {
  const navigate = useNavigate();
  const { data, refresh } = useAppState();
  const [phase, setPhase] = useState<Phase>("working");
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const request = useRef<Promise<{ trace?: ReasoningStep[] }> | null>(null);

  const enabled = data.settings.onDeviceModel;
  // Read through a ref so the local pass sees current data without making
  // the effect re-run — and re-request — every time app state changes.
  const dataRef = useRef(data);
  dataRef.current = data;

  /*
   * The request is held in a ref rather than started fresh each mount, so
   * StrictMode's double-invoke in development subscribes twice to one
   * recommendation instead of minting two.
   *
   * A plain "already started" guard is not enough and was actively worse:
   * the first mount's cleanup would discard the only in-flight result, the
   * second mount would decline to start another, and the screen sat on
   * "Working it out..." forever while the POST had already returned 201.
   */
  useEffect(() => {
    request.current ??= requestDailyRecommendation();

    let active = true;
    request.current
      .then(async (result) => {
        if (!active) return;
        const trace = result.trace ?? [];
        setSteps(trace);
        setPhase("done");

        /*
         * Third tier, and only ever a third tier.
         *
         * The server has already decided, safely, from reviewed steps. If
         * its own AI pass did not run — no key, or it returned nothing —
         * and this person has turned the on-device model on, it may reorder
         * those same steps and say why in plainer words. It cannot reach
         * past them: the candidate list it is given is the one the rules
         * already approved.
         */
        const serverUsedAi = trace.some((step) => step.key === "ai" && step.label.includes("AI"));
        if (serverUsedAi || !enabled || !isEngineReady()) return;

        const local = await describeWithLocalModel(dataRef.current);
        if (!active || !local) return;
        setSteps((current) =>
          current.map((step) => (step.key === "ai" ? { ...step, ...local } : step))
        );
      })
      .catch(() => {
        if (active) setPhase("failed");
      })
      .finally(() => {
        // The result page reads from app state, so it has to be refreshed
        // whether or not the reasoning came back.
        void refresh().catch(() => undefined);
      });

    return () => {
      active = false;
    };
  }, [refresh, enabled]);

  const byKey = new Map(steps.map((step) => [step.key, step]));

  return (
    <main className="app-page reasoning-page">
      <header className="reasoning-heading">
        <p className="app-kicker">Before today's step</p>
        <h1>How this was chosen.</h1>
        <p>
          Every step below is part of how ReNew actually decided. Nothing here is a guess about
          you, and nothing was invented for this screen.
        </p>
      </header>

      <ol className="reasoning-steps">
        {STAGES.map((stage, index) => {
          const step = byKey.get(stage.key);
          const settled = step !== undefined;
          const narrowed =
            step && step.before !== undefined && step.after !== undefined && step.before !== step.after;

          return (
            <li
              className={`reasoning-step${settled ? " is-settled" : ""}${phase === "failed" ? " is-skipped" : ""}`}
              key={stage.key}
              /* Staggered reveal only — the work is already done by the time
                 anything renders, so this paces reading, not progress. */
              style={{ "--reveal-order": index } as React.CSSProperties}
            >
              <span className="reasoning-step-mark" aria-hidden="true">
                {settled ? <Check /> : <Loader2 className="is-spinning" />}
              </span>
              <div className="reasoning-step-copy">
                <p className="reasoning-step-label">{step?.label ?? stage.label}</p>
                {step && <p className="reasoning-step-detail">{step.detail}</p>}
                {narrowed && (
                  <p className="reasoning-step-count">
                    {step.before} <span aria-hidden="true">→</span>
                    <span className="sr-only">narrowed to</span> {step.after}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {phase === "failed" && (
        <p className="auth-note" role="alert">
          Today's step could not be worked out just now — usually a connection, sometimes a Vision
          that has no Route yet. Your Check-In is safe, and the previous suggestion is still there.
        </p>
      )}

      <footer className="reasoning-actions" aria-live="polite">
        <button
          className="primary-command"
          type="button"
          disabled={phase === "working"}
          onClick={() => navigate("/app/recommendation")}
        >
          {phase === "working" ? "Working it out..." : "Show me today's step"}{" "}
          <ArrowRight aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
