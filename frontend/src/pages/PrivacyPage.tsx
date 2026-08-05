import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Plain-language privacy policy. Everything stated here mirrors what the
 * app actually does — local-first storage, per-account server sync, export
 * and delete in Settings, and support handoffs that never send anything
 * on the person's behalf.
 */
export function PrivacyPage() {
  return (
    <main className="auth-page privacy-page">
      <header className="auth-header">
        <Link className="icon-button" to="/" aria-label="Back to ReNew home" title="Back to home">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Link className="app-wordmark" to="/">
          ReNew
        </Link>
        <span className="auth-step">RN / PRIVACY</span>
      </header>

      <section className="auth-intro" aria-labelledby="privacy-title">
        <p className="app-kicker">Privacy policy</p>
        <h1 id="privacy-title">Your records stay yours.</h1>
        <p>What ReNew stores, where it lives, and how you remove it.</p>
      </section>

      <section className="privacy-body" aria-label="Privacy policy details">
        <article>
          <h2>What ReNew stores</h2>
          <p>
            ReNew keeps what you put into it: your Life Vision and Route, Check-In signals (mood,
            energy, capacity, and the optional extended signals), Missions and their outcomes,
            reflections, saved places, your check-in rhythm, and — only if you add one — a trusted
            contact's name, relationship, and phone number.
          </p>
          <p>
            ReNew does not diagnose. Check-In answers are used to size today's suggestion, never to
            build a clinical or risk profile.
          </p>
        </article>

        <article>
          <h2>Where it lives</h2>
          <p>
            Everything is written to this device first (in your browser's local storage), so the app
            works offline. When a connection is available, records sync to ReNew's server under your
            profile — a guest profile created for this browser, or your account once you sign up.
            Signing in moves the guest records to your account where possible.
          </p>
        </article>

        <article>
          <h2>What ReNew never does</h2>
          <p>
            ReNew never contacts anyone on your behalf. A support handoff only prepares a message and
            opens your own SMS or phone app — you see exactly what would be shared, and nothing is
            sent unless you send it. Your records are not sold and not shared with third parties.
          </p>
        </article>

        <article>
          <h2>Export and deletion</h2>
          <p>
            In Settings you can download all of your records as a JSON file at any time, and delete
            everything — the local copy on this browser and the records stored on the server for your
            profile. Deletion is immediate and permanent.
          </p>
        </article>

        <article>
          <h2>Questions</h2>
          <p>
            ReNew is an e-ICON 2026 competition project. For questions about this policy or your
            data, contact the team through the project repository.
          </p>
        </article>
      </section>
    </main>
  );
}
