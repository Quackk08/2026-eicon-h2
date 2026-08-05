import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { fetchVisions, signInAndLink, signUpAndLink } from "../api/backend";
import { authEnabled, requestPasswordReset } from "../api/auth";
import { useAppState } from "../state/AppState";

export function SignInPage() {
  const navigate = useNavigate();
  const { data, updateData, refresh } = useAppState();
  const [email, setEmail] = useState(data.profile.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  /* Failures and outcomes are different things: an auth error keeps the
     form live, a notice reports something that already succeeded. */
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signedInWithNote, setSignedInWithNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // This page mounts before IndexedDB has loaded, so the stored email
  // arrives after the field initialised. Fill it in only while untouched.
  useEffect(() => {
    setEmail((current) => current || data.profile.email);
  }, [data.profile.email]);

  const authenticate = async (mode: "signIn" | "signUp") => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result =
        mode === "signIn" ? await signInAndLink(email, password) : await signUpAndLink(email, password);

      // Waiting on an email confirmation is an outcome, not a failure. Shown
      // as an error it reads as "that did not work", and the natural next
      // move — sign up again — answers "User already registered".
      if (result.confirmationRequired) {
        setNotice(result.error ?? "Account created. Confirm the address by email, then sign in.");
        return;
      }

      if (!result.ok) {
        setError(result.error ?? "Could not sign in.");
        return;
      }

      updateData((current) => ({
        ...current,
        profile: { ...current.profile, email, signedIn: true }
      }));
      await refresh().catch(() => undefined);

      if (result.linkNote) {
        // Signed in, but the guest handover needs a word. The person is
        // authenticated either way — the way onward stays open.
        setNotice(result.linkNote);
        setSignedInWithNote(true);
        return;
      }

      // A transient fetch failure must not route an existing user into
      // onboarding — finishing it there would create a duplicate Vision.
      const hasVision = await fetchVisions()
        .then((visions) => visions.length > 0)
        .catch(() => true);
      navigate(hasVision ? "/app/today" : "/onboarding");
    } catch {
      setError("Something went wrong while signing in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError("Enter your email above first, then request the reset link.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await requestPasswordReset(email.trim());
      if (!result.ok) {
        setError(result.error ?? "The reset email could not be sent.");
        return;
      }
      setResetSent(true);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void authenticate("signIn");
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="icon-button" to="/" aria-label="Back to ReNew home" title="Back to home">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Link className="app-wordmark" to="/">
          ReNew
        </Link>
        <span className="auth-step">RN / SIGN IN</span>
      </header>

      <section className="auth-intro" aria-labelledby="sign-in-title">
        <p className="app-kicker">Welcome back</p>
        <h1 id="sign-in-title">Return to your own pace.</h1>
        <p>Your vision and daily route are ready whenever you are.</p>
      </section>

      {/* A build without Supabase credentials cannot sign anyone in. Saying
          so here rather than after a submitted password is the difference
          between a known limitation and a form that looks broken: the
          fields used to accept a whole sign-in attempt before answering
          "not configured in this build". Guest mode is unaffected, so the
          way onward is a real one, not an apology. */}
      {!authEnabled && (
        <p className="auth-note" role="status">
          Signing in is unavailable in this build. You can still use ReNew as a guest —{" "}
          <Link to="/onboarding">start from onboarding</Link> and your work stays on this device.
        </p>
      )}

      <section className="auth-form-wrap" aria-label="Sign in form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="field-icon-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </div>

          {authEnabled && (
            <div className="form-inline-row">
              <button
                className="text-button"
                type="button"
                aria-expanded={resetOpen}
                onClick={() => setResetOpen((open) => !open)}
              >
                Forgot password?
              </button>
            </div>
          )}

          {resetOpen && (
            <div className="auth-reset-row" role="group" aria-label="Password reset">
              {resetSent ? (
                <p className="auth-note" role="status">
                  Reset link sent. Check your email — the link opens a page where you choose a new
                  password.
                </p>
              ) : (
                <>
                  <p className="auth-note">
                    A reset link will be sent to the email entered above.
                  </p>
                  <button className="secondary-command" type="button" disabled={busy} onClick={() => void sendReset()}>
                    Send reset link <ArrowRight aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          )}

          {signedInWithNote ? (
            <button className="primary-command" type="button" onClick={() => navigate("/app/today")}>
              Continue to ReNew <ArrowUpRight aria-hidden="true" />
            </button>
          ) : (
            <button className="primary-command" type="submit" disabled={busy || !authEnabled}>
              Sign in <ArrowUpRight aria-hidden="true" />
            </button>
          )}

          {error && (
            <p className="auth-note" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="auth-note" role="status">
              {notice}
            </p>
          )}

          <p className="auth-note">
            New to ReNew? <Link to="/onboarding">Create your first life route</Link>
          </p>
          {authEnabled && (
            <p className="auth-note">
              Already started as a guest?{" "}
              <button className="text-button" type="button" disabled={busy} onClick={() => void authenticate("signUp")}>
                Create an account to keep it
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
