import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { fetchVisions, signInAndLink, signUpAndLink } from "../api/backend";
import { useAppState } from "../state/AppState";

export function SignInPage() {
  const navigate = useNavigate();
  const { data, updateData, refresh } = useAppState();
  const [email, setEmail] = useState(data.profile.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authenticate = async (mode: "signIn" | "signUp") => {
    setBusy(true);
    setError(null);

    const result =
      mode === "signIn" ? await signInAndLink(email, password) : await signUpAndLink(email, password);

    if (!result.ok) {
      setError(result.error ?? "Could not sign in.");
      setBusy(false);
      return;
    }

    updateData((current) => ({
      ...current,
      profile: { ...current.profile, email, signedIn: true }
    }));
    await refresh();
    setBusy(false);

    if (result.linkNote) setError(result.linkNote);
    else {
      const hasVision = await fetchVisions().then((visions) => visions.length > 0).catch(() => false);
      navigate(hasVision ? "/app/today" : "/onboarding");
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

          <div className="form-inline-row">
            <label className="check-control">
              <input type="checkbox" defaultChecked />
              <span>Keep me signed in</span>
            </label>
            <button className="text-button" type="button">
              Forgot password?
            </button>
          </div>

          <button className="primary-command" type="submit" disabled={busy}>
            Sign in <ArrowUpRight aria-hidden="true" />
          </button>

          {error && (
            <p className="auth-note" role="alert">
              {error}
            </p>
          )}

          <p className="auth-note">
            New to ReNew? <Link to="/onboarding">Create your first life route</Link>
          </p>
          <p className="auth-note">
            Already started as a guest?{" "}
            <button className="text-button" type="button" disabled={busy} onClick={() => void authenticate("signUp")}>
              Create an account to keep it
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
