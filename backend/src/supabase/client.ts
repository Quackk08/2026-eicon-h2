import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

/**
 * Server-side Supabase client using the secret key — bypasses Row Level
 * Security, so this must never be imported into frontend code or exposed
 * to the browser. All repository access goes through this single client.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false }
});
