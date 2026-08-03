import { getAccessToken } from "./auth";

const PROFILE_STORAGE_KEY = "renew.profileId";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readStoredProfileId(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeProfileId(profileId: string): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, profileId);
  } catch {
    // Private mode or storage disabled — the id stays in memory for this session only.
  }
}

let cachedProfileId: string | null = readStoredProfileId();

export function getProfileId(): string | null {
  return cachedProfileId;
}

/**
 * Forgets the guest id after it has been claimed by an account, so a later
 * sign-out cannot silently reopen someone's records without signing in.
 */
export function clearGuestProfileId(): void {
  cachedProfileId = null;
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Storage unavailable — the in-memory clear above is what matters.
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  explicitToken?: string
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  // A bearer token identifies the account and wins over any guest id the
  // browser still remembers; the backend enforces the same precedence.
  const token = explicitToken ?? (await getAccessToken());
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (cachedProfileId) {
    headers.set("x-profile-id", cachedProfileId);
  }

  const response = await fetch(`/api${path}`, { ...init, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      // Non-JSON error body — keep the status text.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

let inFlightProfile: Promise<string> | null = null;

async function resolveOrCreateProfile(): Promise<string> {
  // Signed in: the backend resolves the account's own profile from the token,
  // creating one on first sign-in. Minting a guest profile here would strand
  // records under an id the account never looks at.
  const token = await getAccessToken();
  if (token) {
    const me = await request<{ id: string }>("/me");
    return me.id;
  }

  if (cachedProfileId) {
    try {
      await request("/me");
      return cachedProfileId;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      // Stored id no longer exists on the server — fall through and re-create.
      cachedProfileId = null;
    }
  }

  const profile = await request<{ id: string }>("/profiles", {
    method: "POST",
    body: JSON.stringify({ locale: navigator.language.startsWith("ko") ? "ko" : "en" })
  });
  cachedProfileId = profile.id;
  storeProfileId(profile.id);
  return profile.id;
}

/**
 * Temporary stand-in for real auth: the backend's resolveProfile middleware
 * identifies a user by an `x-profile-id` header, so the client creates one
 * profile on first run and reuses it. Swap for a real session once auth
 * lands (docs/IMPLEMENTATION_PLAN.md section 12).
 *
 * Concurrent callers share one in-flight request — React StrictMode invokes
 * mount effects twice in development, and without this both calls would see
 * an empty cache and each create a separate profile.
 */
export function ensureProfile(): Promise<string> {
  if (!inFlightProfile) {
    inFlightProfile = resolveOrCreateProfile().finally(() => {
      inFlightProfile = null;
    });
  }
  return inFlightProfile;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, explicitToken?: string) =>
    request<T>(
      path,
      { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) },
      explicitToken
    ),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) })
};
