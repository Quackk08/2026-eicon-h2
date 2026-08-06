import { Cpu, MessageSquare } from "lucide-react";
import { useState, type FormEvent } from "react";
import { describeAdjustment, type MissionAdjustment } from "@renew/shared";
import { readTodaysIntent, type IntentReading } from "../ai/missionIntent";
import { isEngineReady } from "../ai/webllm";

/**
 * Say how today is going, in your own words, and get the size adjusted.
 *
 * The alternative is finding a stepper and deciding for yourself which of
 * three abstract sizes matches "I barely slept" — which is work, on the day
 * someone has least of it. This reads the sentence and offers the change;
 * it never applies one on its own.
 *
 * What is written here is the most personal thing in the app, so it goes
 * nowhere. The reading happens either from a keyword pass or from a model
 * running in this browser, and the sentence is never sent to a server, kept
 * after the answer, or attached to the Mission.
 */
export function TodayInWords({
  onApply,
  busy
}: {
  onApply: (adjustment: Exclude<MissionAdjustment, "keep">) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState<IntentReading | null>(null);
  const [thinking, setThinking] = useState(false);

  const read = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || thinking) return;
    setThinking(true);
    try {
      setReading(await readTodaysIntent(text));
    } finally {
      setThinking(false);
    }
  };

  const clear = () => {
    setText("");
    setReading(null);
  };

  return (
    <section className="today-in-words" aria-labelledby="today-in-words-title">
      <p className="app-kicker">
        <MessageSquare aria-hidden="true" /> In your own words
      </p>
      <h3 id="today-in-words-title">How is today going?</h3>

      <form onSubmit={read}>
        <label className="sr-only" htmlFor="today-in-words-input">
          Describe how today is going
        </label>
        <input
          id="today-in-words-input"
          type="text"
          value={text}
          placeholder="Barely slept, and work is heavy"
          maxLength={200}
          onChange={(event) => {
            setText(event.target.value);
            // A reading describes the sentence it was given; keeping it on
            // screen while the sentence changes would attach the answer to
            // words nobody read.
            if (reading) setReading(null);
          }}
        />
        <button className="secondary-command" type="submit" disabled={!text.trim() || thinking}>
          {thinking ? "Reading..." : "Read this"}
        </button>
      </form>

      <p className="today-in-words-privacy">
        {isEngineReady()
          ? "Read by the model running in this browser. What you type is not sent anywhere."
          : "Read on this device by matching words. What you type is not sent anywhere."}
      </p>

      {reading && (
        <div className="today-in-words-result" role="status">
          <p>
            <strong>{describeAdjustment(reading.adjustment)}</strong>
            {reading.matched.length > 0 && (
              <span className="today-in-words-matched"> — heard: {reading.matched.join(", ")}</span>
            )}
          </p>

          {reading.confidence === "unsure" && (
            <p className="today-in-words-hedge">
              That is a guess more than a reading — change it yourself below if it is wrong.
            </p>
          )}

          {reading.source === "on-device" && (
            <p className="today-in-words-source">
              <Cpu aria-hidden="true" /> Read by the on-device model
            </p>
          )}

          {/* Never applied automatically. The whole product is built on the
              person choosing the size of their own day. */}
          {reading.adjustment !== "keep" ? (
            <div className="today-in-words-actions">
              <button
                className="primary-command"
                type="button"
                disabled={busy}
                onClick={() => {
                  onApply(reading.adjustment as Exclude<MissionAdjustment, "keep">);
                  clear();
                }}
              >
                {describeAdjustment(reading.adjustment)}
              </button>
              <button className="text-button" type="button" onClick={clear}>
                Leave it as it is
              </button>
            </div>
          ) : (
            <button className="text-button" type="button" onClick={clear}>
              Close
            </button>
          )}
        </div>
      )}
    </section>
  );
}
