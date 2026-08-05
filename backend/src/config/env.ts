import { config as loadEnvFile } from "dotenv";

/*
 * `.local.env` is the machine-local secrets file this repo already ships a
 * gitignore rule for — but nothing ever read it. Plain `dotenv/config`
 * loads `.env`, which does not exist here, so a developer who filled in
 * `.local.env` still had a backend with no database credentials at all.
 *
 * Neither file is required and a missing one is ignored. dotenv never
 * overwrites a variable that is already set, so real environment variables
 * — how the deployed build is configured — always win over both.
 */
loadEnvFile({ path: ".local.env", quiet: true });
loadEnvFile({ quiet: true });

/**
 * Configuration is read here, never demanded.
 *
 * The Supabase values used to be required at module load. That made a
 * deployment missing either of them throw during import, which takes the
 * whole app down with it — including `/api/health`, the one endpoint whose
 * job is to say what is wrong. The only symptom left was a platform-level
 * 500 on every route, with nothing anywhere to read.
 *
 * Missing configuration is now a reported state instead of a crash: the
 * process starts, health names what is absent, and routes that need the
 * database answer 503 rather than pretending to work.
 */
function optional(name: string): string | null {
  return process.env[name] || null;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseSecretKey: optional("SUPABASE_SECRET_KEY"),
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  // Flash-Lite by choice, not just cost: the free tier meters requests per
  // day *per model*, and this one allows more of them than gemini-2.0-flash,
  // which a single afternoon of testing can exhaust. Every call here is a
  // re-rank or a rewrite on top of the rule engine's output, never a
  // decision the rule engine could not make on its own.
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-lite-latest"
};

/**
 * Which database variables are absent. Names only — a value must never
 * leave this process, but the names are already public in `.env.example`
 * and are the entire point of being able to diagnose a deployment.
 */
export function missingDatabaseEnv(): string[] {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseSecretKey) missing.push("SUPABASE_SECRET_KEY");
  return missing;
}

export function isDatabaseConfigured(): boolean {
  return missingDatabaseEnv().length === 0;
}

/**
 * Thrown when something reaches for the database on a server that was never
 * given credentials for one. Carries the missing names so the response can
 * say which, rather than joining the generic 500s.
 */
export class ConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`server is not configured to reach its database (missing: ${missing.join(", ")})`);
    this.name = "ConfigurationError";
    this.missing = missing;
  }
}

export function isAIEnabled(): boolean {
  return Boolean(env.geminiApiKey);
}
