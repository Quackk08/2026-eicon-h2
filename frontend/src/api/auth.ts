import { createClient, type Session } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Auth is optional: ReNew works as a guest, so a build without Supabase
 * credentials still runs — it simply cannot sign anyone in.
 */
export const authEnabled = Boolean(url && publishableKey);

const supabase = authEnabled
  ? createClient(url as string, publishableKey as string, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

export interface AuthResult {
  ok: boolean;
  /** Safe to show a user; Supabase messages are already user-facing. */
  error?: string;
  /**
   * Taken straight from the sign-in response. Callers that act immediately
   * must use this rather than re-reading the session — the client persists
   * asynchronously, so getAccessToken() can still be empty at that point.
   */
  accessToken?: string;
  /**
   * The account was created, but Supabase is holding it until the address
   * is confirmed. Not an error, and specifically not something to retry:
   * signing up again with the same address answers "User already
   * registered", which reads like a real failure and is the likeliest way
   * for someone to give up here.
   */
  confirmationRequired?: boolean;
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(handler: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Sign in is not configured in this build." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, accessToken: data.session?.access_token };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Sign up is not configured in this build." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  // With email confirmation on, signUp succeeds without a session. `ok`
  // stays false because there is no token, so nothing downstream tries to
  // claim the guest profile against a session that does not exist yet —
  // that handover happens on the first real sign-in instead, and the guest
  // id stays in this browser until it does.
  if (!data.session) {
    return {
      ok: false,
      confirmationRequired: true,
      error: "Account created. Confirm the address from the email we just sent, then sign in."
    };
  }
  return { ok: true, accessToken: data.session.access_token };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function updateAccountEmail(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Account updates are not configured in this build." };
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Sends the recovery email. The link lands on /reset-password, where the
 * client (detectSessionInUrl) turns the link's token into a recovery session
 * that updateAccountPassword can act on.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Password reset is not configured in this build." };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateAccountPassword(password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Account updates are not configured in this build." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
