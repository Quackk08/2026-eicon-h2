import { supabase } from "../supabase/client.js";

export interface ReflectionRow {
  id: string;
  mission_id: string;
  profile_id: string;
  result: "completed" | "partially_completed" | "not_today";
  burden: number | null;
  social_mode: "alone" | "with_someone" | null;
  want_repeat: boolean | null;
  note: string | null;
  created_at: string;
}

export interface ReflectionInput {
  result: "completed" | "partially_completed" | "not_today";
  burden?: number | null;
  socialMode?: "alone" | "with_someone" | null;
  wantRepeat?: boolean | null;
  note?: string | null;
}

export async function createReflection(
  missionId: string,
  profileId: string,
  input: ReflectionInput
): Promise<ReflectionRow> {
  const { data, error } = await supabase
    .from("reflections")
    .insert({
      mission_id: missionId,
      profile_id: profileId,
      result: input.result,
      burden: input.burden ?? null,
      social_mode: input.socialMode ?? null,
      want_repeat: input.wantRepeat ?? null,
      note: input.note ?? null
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listRecentReflections(profileId: string, limit = 20): Promise<ReflectionRow[]> {
  const { data, error } = await supabase
    .from("reflections")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
