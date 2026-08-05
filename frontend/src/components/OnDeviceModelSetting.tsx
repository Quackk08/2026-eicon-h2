import { Cpu, Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
  WEBLLM_MODEL_SIZE_LABEL,
  detectWebLlmSupport,
  isEngineReady,
  loadEngine,
  unloadEngine
} from "../ai/webllm";
import { useAppState } from "../state/AppState";

type Status =
  | { kind: "checking" }
  | { kind: "unsupported"; reason: string }
  | { kind: "off" }
  | { kind: "downloading"; percent: number; text: string }
  | { kind: "ready" }
  | { kind: "failed" };

/**
 * The opt-in for the on-device model.
 *
 * The size is stated before anything is fetched, and nothing is fetched
 * until the switch is turned on — close to a gigabyte is not something to
 * start on someone's behalf, and on a phone plan it is not something to
 * start by accident either.
 *
 * Support is checked before the switch is offered rather than after, so a
 * device that cannot run it says so instead of failing at the end of a
 * long download.
 */
export function OnDeviceModelSetting() {
  const { data, updateData } = useAppState();
  const enabled = data.settings.onDeviceModel;
  const [status, setStatus] = useState<Status>({ kind: "checking" });

  useEffect(() => {
    let active = true;
    void detectWebLlmSupport().then((support) => {
      if (!active) return;
      if (!support.supported) {
        setStatus({ kind: "unsupported", reason: support.reason ?? "Not available on this device." });
        return;
      }
      setStatus(isEngineReady() ? { kind: "ready" } : { kind: "off" });
    });
    return () => {
      active = false;
    };
  }, []);

  const setEnabled = async (next: boolean) => {
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, onDeviceModel: next }
    }));

    if (!next) {
      await unloadEngine();
      setStatus({ kind: "off" });
      return;
    }

    setStatus({ kind: "downloading", percent: 0, text: "Starting..." });
    try {
      await loadEngine((progress) =>
        setStatus({ kind: "downloading", percent: Math.round(progress.progress * 100), text: progress.text })
      );
      setStatus({ kind: "ready" });
    } catch {
      // Turned back off rather than left on-but-broken: a switch that says
      // on while nothing works is worse than one that admits it failed.
      updateData((current) => ({
        ...current,
        settings: { ...current.settings, onDeviceModel: false }
      }));
      setStatus({ kind: "failed" });
    }
  };

  const unsupported = status.kind === "unsupported";

  return (
    <div className="on-device-setting">
      <label className="settings-row">
        <div>
          <strong>
            <Cpu aria-hidden="true" /> On-device wording
          </strong>
          <span>
            Runs a small language model in this browser to phrase your daily step. Turning it on
            downloads {WEBLLM_MODEL_SIZE_LABEL} once from Hugging Face. ReNew works fully without
            it.
          </span>
        </div>
        <input
          className="switch-input"
          type="checkbox"
          checked={enabled}
          disabled={unsupported || status.kind === "checking" || status.kind === "downloading"}
          onChange={(event) => void setEnabled(event.target.checked)}
        />
      </label>

      {unsupported && (
        <p className="settings-note" role="note">
          {status.reason}
        </p>
      )}

      {status.kind === "downloading" && (
        <div className="on-device-progress" role="status" aria-live="polite">
          <div
            className="long-term-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status.percent}
          >
            <span style={{ width: `${status.percent}%` }} />
          </div>
          <p>
            <Download aria-hidden="true" /> {status.percent}% — {status.text}
          </p>
        </div>
      )}

      {status.kind === "ready" && enabled && (
        <p className="settings-note" role="status">
          Ready. It only ever reorders and rewords steps ReNew had already chosen for you — it
          cannot invent an action. The download was the only time anything was fetched; from here
          it runs entirely on this device, and what you write in a Check-In is never sent to it.
        </p>
      )}

      {status.kind === "failed" && (
        <p className="settings-note" role="alert">
          The model could not be downloaded. Nothing else is affected — you can try again whenever
          you like.
        </p>
      )}
    </div>
  );
}
