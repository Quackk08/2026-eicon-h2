import { supabase } from "../supabase/client.js";

export interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  display_name: string | null;
  locale: string;
  timezone: string;
  created_at: string;
}

export async function createProfile(
  locale = "ko",
  timezone = "Asia/Seoul",
  authUserId: string | null = null
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ locale, timezone, auth_user_id: authUserId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfileByAuthUserId(authUserId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select()
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * True when a profile holds nothing a person would miss. Used to tell an
 * auto-created placeholder apart from a profile with real history, so
 * linking never silently discards records.
 */
export async function profileHasRecords(profileId: string): Promise<boolean> {
  const counts = await Promise.all(
    (["life_visions", "check_ins", "missions", "reflections"] as const).map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profileId);
      if (error) throw error;
      return count ?? 0;
    })
  );
  return counts.some((count) => count > 0);
}

export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) throw error;
}

export async function updateProfile(
  profileId: string,
  patch: { display_name?: string | null }
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Attaches an existing (guest) profile to a newly created auth user so the
 * person keeps the Vision, Check-Ins, and Missions they already recorded.
 * Refuses if the profile is already claimed by a different auth user.
 */
export async function linkProfileToAuthUser(
  profileId: string,
  authUserId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ auth_user_id: authUserId })
    .eq("id", profileId)
    .is("auth_user_id", null)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
