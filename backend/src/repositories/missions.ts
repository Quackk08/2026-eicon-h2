import { supabase } from "../supabase/client.js";
import type { MissionStatus } from "../types.js";

export interface MissionRow {
  id: string;
  profile_id: string;
  recommendation_id: string | null;
  template_id: string;
  route_step_id: string | null;
  place_id: string | null;
  status: MissionStatus;
  scheduled_for: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createMission(
  profileId: string,
  templateId: string,
  recommendationId: string | null,
  routeStepId: string | null,
  placeId: string | null = null
): Promise<MissionRow> {
  const { data, error } = await supabase
    .from("missions")
    .insert({
      profile_id: profileId,
      template_id: templateId,
      recommendation_id: recommendationId,
      route_step_id: routeStepId,
      place_id: placeId
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMissionPlace(id: string, placeId: string | null): Promise<MissionRow> {
  const { data, error } = await supabase
    .from("missions")
    .update({ place_id: placeId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMissionsForProfile(profileId: string, limit = 100): Promise<MissionRow[]> {
  const { data, error } = await supabase
    .from("missions")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getTodayMission(profileId: string): Promise<MissionRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("missions")
    .select()
    .eq("profile_id", profileId)
    .eq("scheduled_for", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMissionById(id: string): Promise<MissionRow | null> {
  const { data, error } = await supabase.from("missions").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMissionStatus(id: string, status: MissionStatus): Promise<MissionRow> {
  const { data, error } = await supabase
    .from("missions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMissionSchedule(id: string, scheduledAt: string): Promise<MissionRow> {
  const { data, error } = await supabase
    .from("missions")
    .update({
      scheduled_for: scheduledAt.slice(0, 10),
      scheduled_at: scheduledAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function switchMissionTemplate(id: string, templateId: string): Promise<MissionRow> {
  const { data, error } = await supabase
    .from("missions")
    .update({ template_id: templateId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
