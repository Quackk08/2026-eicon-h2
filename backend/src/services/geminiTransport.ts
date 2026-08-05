import { env } from "../config/env.js";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * How long a caller is willing to wait, by what is waiting.
 *
 * A person who has just finished a Check-In is held on screen for the
 * re-rank, and the rule engine has *already* produced a usable answer by
 * then — so waiting fifteen seconds to maybe improve its wording is the
 * wrong trade. Route generation is different: it happens once, during
 * onboarding, behind a screen that says what it is doing.
 */
export const GEMINI_TIMEOUTS = {
  /** Blocks someone mid-flow. Short on purpose. */
  interactive: 4_000,
  /** Onboarding and background work, where a wait is expected and explained. */
  deliberate: 15_000
} as const;

export interface GeminiRequest {
  parts: unknown[];
  timeoutMs?: number;
  /** Prefix for log lines, e.g. "gemini:verify". */
  label: string;
  temperature?: number;
}

export interface GeminiResponse {
  text: string | null;
  /** null when the request never reached a response (timeout, DNS, abort). */
  status: number | null;
}

/**
 * The call itself, with the status left visible.
 *
 * Callers that retry need to tell a 429 from a 503 from a timeout, and
 * collapsing everything to null would take that away — ladder generation
 * backs off on rate limits and photo verification retries once on 503.
 */
export async function callGeminiRaw(request: GeminiRequest): Promise<GeminiResponse> {
  if (!env.geminiApiKey) return { text: null, status: null };

  try {
    const res = await fetch(`${ENDPOINT}/${env.geminiModel}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: request.parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: request.temperature ?? 0.3
        }
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? GEMINI_TIMEOUTS.deliberate)
    });

    if (!res.ok) {
      console.error(`[${request.label}] request failed`, res.status);
      return { text: null, status: res.status };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: unknown }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { text: typeof text === "string" ? text : null, status: res.status };
  } catch (err) {
    console.error(`[${request.label}] request threw`, err instanceof Error ? err.name : "unknown");
    return { text: null, status: null };
  }
}

/**
 * One call to Gemini, with the key in a header rather than the query string.
 *
 * It used to be `?key=...`, which puts a live credential into every URL the
 * process handles — and straight into any log line that prints a failed
 * request, a stack trace, or the error's cause. A header keeps it out of
 * all of them.
 *
 * Nothing from the response body is logged either. It is derived from a
 * prompt built out of somebody's Life Vision, and an error path is not a
 * good reason to write that to disk (docs/PRODUCT_GUARDRAILS.md).
 */
export async function callGemini(request: GeminiRequest): Promise<string | null> {
  return (await callGeminiRaw(request)).text;
}
