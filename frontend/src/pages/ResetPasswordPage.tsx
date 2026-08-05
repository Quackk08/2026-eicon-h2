import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { authEnabled, getSession, onAuthChange, updateAccountPassword } from "../api/auth";

/**
 * Where the recovery email's link lands. The Supabase client consumes the
 * token from the URL on load and produces a signed-in recovery session; all
 * this page has to do is wait for it and accept a new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authEnabled) {
      setHasSession(false);
      return;
    }
    let active = true;
    // The token exchange races this component's mount, so listen as well as
    // ask — whichever answers first decides.
    void getSession().then((session) => {
      if (active && session) setHasSession(true);
    });
    const unsubscribe = onAuthChange((session) => {
      if (active) setHasSession(Boolean(session));
    });
    // A link that was already used (or expired) never produces a session;
    // stop presenting a form that could not possibly submit.
    const timeout = window.setTimeout(() => {
      if (active) setHasSession((current) => current ?? false);
    }, 4000);
    return () => {
      active = false;
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Choose a password of at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await updateAccountPassword(password);
      if (!result.ok) {
        setError(result.error ?? "The password could not be updated.");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="icon-button" to="/login" aria-label="Back to sign in" title="Back to sign in">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Link className="app-wordmark" to="/">
          ReNew
        </Link>
        <span className="auth-step">RN / RESET</span>
      </header>

      <section className="auth-intro" aria-labelledby="reset-title">
        <p className="app-kicker">Account recovery</p>
        <h1 id="reset-title">Choose a new password.</h1>
        <p>This page only works when opened from the link in your reset email.</p>
      </section>

      <section className="auth-form-wrap" aria-label="Reset password form">
        {done ? (
          <div className="auth-form">
            <p className="auth-note" role="status">
              Your password is updated and you are signed in.
            </p>
            <button className="primary-command" type="button" onClick={() => navigate("/app/today")}>
              Continue to ReNew <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
        ) : hasSession === null ? (
          <div className="auth-form" aria-live="polite">
            <p className="auth-note">Checking your reset link...</p>
          </div>
        ) : !hasSession ? (
          <div className="auth-form">
            <p className="auth-note" role="alert">
              {authEnabled
                ? "This reset link is no longer valid — it may have expired or already been used. Request a new one from the sign-in page."
                : "Password reset is not configured in this build."}
            </p>
            <Link className="primary-command" to="/login">
              Back to sign in <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="new-password">New password</label>
              <div className="password-field">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
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
            <div className="field-group">
              <label htmlFor="confirm-password">Repeat new password</label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={8}
              />
            </div>
            <button className="primary-command" type="submit" disabled={busy}>
              {busy ? "Updating..." : "Set new password"} <ArrowUpRight aria-hidden="true" />
            </button>
            {error && (
              <p className="auth-note" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
