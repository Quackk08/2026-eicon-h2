import { supabase } from "../supabase/client.js";

export interface PreferencesRow {
  profile_id: string;
  max_minutes: number | null;
  max_distance_meters: number | null;
  max_cost: number | null;
  social_preference: "solo" | "low" | "medium" | "high" | null;
  accessibility_needs: string[];
  updated_at: string;
}

export interface PreferencesInput {
  maxMinutes?: number | null;
  maxDistanceMeters?: number | null;
  maxCost?: number | null;
  socialPreference?: "solo" | "low" | "medium" | "high" | null;
  accessibilityNeeds?: string[];
}

export async function getPreferences(profileId: string): Promise<PreferencesRow | null> {
  const { data, error } = await supabase.from("preferences").select().eq("profile_id", profileId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPreferences(profileId: string, input: PreferencesInput): Promise<PreferencesRow> {
  const { data, error } = await supabase
    .from("preferences")
    .upsert(
      {
        profile_id: profileId,
        max_minutes: input.maxMinutes ?? null,
        max_distance_meters: input.maxDistanceMeters ?? null,
        max_cost: input.maxCost ?? null,
        social_preference: input.socialPreference ?? null,
        accessibility_needs: input.accessibilityNeeds ?? [],
        updated_at: new Date().toISOString()
      },
      { onConflict: "profile_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
