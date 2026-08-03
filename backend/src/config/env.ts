import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  // Flash-Lite by choice, not just cost: the free tier meters requests per
  // day *per model*, and this one allows more of them than gemini-2.0-flash,
  // which a single afternoon of testing can exhaust. Every call here is a
  // re-rank or a rewrite on top of the rule engine's output, never a
  // decision the rule engine could not make on its own.
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-lite-latest"
};

export function isAIEnabled(): boolean {
  return Boolean(env.geminiApiKey);
}
