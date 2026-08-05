import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigurationError, env, isDatabaseConfigured, missingDatabaseEnv } from "../config/env.js";

/**
 * Server-side Supabase client using the secret key — bypasses Row Level
 * Security, so this must never be imported into frontend code or exposed
 * to the browser. All repository access goes through this single client.
 *
 * When the server has no credentials, the stand-in throws on first use
 * rather than being built from empty strings. Nothing here should ever get
 * far enough to reach it — `requireDatabase` turns those requests away
 * first — but a client pointed at nowhere would fail deep inside a request
 * with whatever error the network produced, which is exactly the shape of
 * problem this file is trying to stop producing.
 */
export const supabase: SupabaseClient = isDatabaseConfigured()
  ? createClient(env.supabaseUrl as string, env.supabaseSecretKey as string, {
      auth: { persistSession: false }
    })
  : new Proxy({} as SupabaseClient, {
      get() {
        throw new ConfigurationError(missingDatabaseEnv());
      }
    });
