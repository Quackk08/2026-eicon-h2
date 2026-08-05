/**
 * An optional language model that runs in the browser.
 *
 * Off by default and never on the critical path. ReNew's offline promise is
 * kept by the rule engine, which needs no download and no GPU; this only
 * ever improves wording and ordering on top of a decision the rules have
 * already made safely. If it is unavailable, unsupported, half-downloaded,
 * or simply wrong, nothing is lost but a nicer sentence.
 *
 * The library is imported dynamically so that people who never turn it on
 * do not pay for it: Vite splits it into its own chunk, and that chunk is
 * only requested after someone has opted in.
 */

/** ~0.86 GB of weights. Named here so the consent screen cannot understate it. */
export const WEBLLM_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const WEBLLM_MODEL_SIZE_LABEL = "about 0.9 GB";

export interface WebLlmSupport {
  supported: boolean;
  /** Shown to the person when it is not. Plain, and never their fault. */
  reason?: string;
}

/**
 * Whether this browser could run the model at all.
 *
 * Asks for an adapter rather than trusting `navigator.gpu` to exist: the
 * API is present on machines whose GPU the browser then declines to use,
 * and finding that out at download time would mean a gigabyte wasted
 * before the bad news.
 */
export async function detectWebLlmSupport(): Promise<WebLlmSupport> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return {
      supported: false,
      reason: "This browser does not support WebGPU, which the on-device model needs. Everything else in ReNew works as normal."
    };
  }

  try {
    const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: "This device's graphics hardware is not available to the browser, so the on-device model cannot run here."
      };
    }
    return { supported: true };
  } catch {
    return {
      supported: false,
      reason: "WebGPU could not be started on this device, so the on-device model cannot run here."
    };
  }
}

export interface LoadProgress {
  /** 0-1 where the library reports it. */
  progress: number;
  text: string;
}

type Engine = {
  chat: {
    completions: {
      create: (options: {
        messages: { role: string; content: string }[];
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{ choices: { message?: { content?: string | null } }[] }>;
    };
  };
  unload?: () => Promise<void>;
};

let enginePromise: Promise<Engine> | null = null;
let engine: Engine | null = null;

export function isEngineReady(): boolean {
  return engine !== null;
}

/**
 * Downloads the weights if needed and brings the engine up.
 *
 * One in-flight load is shared: two screens asking at once must not start
 * two downloads of the same gigabyte.
 */
export function loadEngine(onProgress?: (progress: LoadProgress) => void): Promise<Engine> {
  enginePromise ??= (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    const created = (await webllm.CreateMLCEngine(WEBLLM_MODEL_ID, {
      initProgressCallback: (report: { progress: number; text: string }) =>
        onProgress?.({ progress: report.progress, text: report.text })
    })) as unknown as Engine;
    engine = created;
    return created;
  })().catch((error) => {
    // A failed load must not poison every later attempt — someone who lost
    // the connection mid-download should be able to press the button again.
    enginePromise = null;
    throw error;
  });

  return enginePromise;
}

export async function unloadEngine(): Promise<void> {
  const current = engine;
  engine = null;
  enginePromise = null;
  await current?.unload?.().catch(() => undefined);
}

/**
 * One completion, bounded and low-temperature.
 *
 * Returns null instead of throwing: every caller's fallback is the rule
 * engine's answer, and a model that failed is the same to them as a model
 * that was never enabled.
 */
export async function generate(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 200
): Promise<string | null> {
  try {
    const active = engine ?? (await loadEngine());
    const reply = await active.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      // Deterministic enough that the same day does not get a different
      // answer on every reload.
      temperature: 0.2,
      max_tokens: maxTokens
    });
    return reply.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
