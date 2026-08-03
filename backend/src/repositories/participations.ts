import { supabase } from "../supabase/client.js";
import type { ParticipationStatus } from "@renew/shared";

export interface ParticipationRow {
  activity_id: string;
  profile_id: string;
  status: ParticipationStatus;
  created_at: string;
}

export async function countJoined(activityId: string): Promise<number> {
  const { count, error } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("activity_id", activityId)
    .eq("status", "joined");
  if (error) throw error;
  return count ?? 0;
}

export async function getParticipation(activityId: string, profileId: string): Promise<ParticipationRow | null> {
  const { data, error } = await supabase
    .from("participations")
    .select()
    .eq("activity_id", activityId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function joinActivity(activityId: string, profileId: string): Promise<ParticipationRow> {
  const { data, error } = await supabase
    .from("participations")
    .upsert(
      { activity_id: activityId, profile_id: profileId, status: "joined" },
      { onConflict: "activity_id,profile_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelParticipation(activityId: string, profileId: string): Promise<ParticipationRow> {
  const { data, error } = await supabase
    .from("participations")
    .update({ status: "cancelled" })
    .eq("activity_id", activityId)
    .eq("profile_id", profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMyParticipations(profileId: string): Promise<ParticipationRow[]> {
  const { data, error } = await supabase
    .from("participations")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
