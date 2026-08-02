import { supabase } from "../supabase/client.js";

export interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  locale: string;
  timezone: string;
  created_at: string;
}

export async function createProfile(locale = "ko", timezone = "Asia/Seoul"): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ locale, timezone })
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
