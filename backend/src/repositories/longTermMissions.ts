import { supabase } from "../supabase/client.js";
import type { LongTermMissionStatus } from "@renew/shared";

export interface LongTermMissionRow {
  id: string;
  profile_id: string;
  vision_id: string;
  route_id: string | null;
  title: string;
  rationale: string | null;
  starts_on: string;
  ends_on: string;
  target_count: number;
  status: LongTermMissionStatus;
  created_at: string;
  updated_at: string;
}

export interface LongTermMissionInput {
  visionId: string;
  routeId: string | null;
  title: string;
  rationale: string | null;
  startsOn: string;
  endsOn: string;
  targetCount: number;
}

export async function createLongTermMission(
  profileId: string,
  input: LongTermMissionInput
): Promise<LongTermMissionRow> {
  const { data, error } = await supabase
    .from("long_term_missions")
    .insert({
      profile_id: profileId,
      vision_id: input.visionId,
      route_id: input.routeId,
      title: input.title,
      rationale: input.rationale,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      target_count: input.targetCount
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLongTermMissionById(id: string): Promise<LongTermMissionRow | null> {
  const { data, error } = await supabase
    .from("long_term_missions")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listLongTermMissions(profileId: string): Promise<LongTermMissionRow[]> {
  const { data, error } = await supabase
    .from("long_term_missions")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * The one a person is currently working towards. At most one is active at a
 * time, the same way at most one Life Vision is — two long-term goals
 * running at once is how the daily step stops being obviously connected to
 * anything.
 */
export async function getActiveLongTermMission(
  profileId: string
): Promise<LongTermMissionRow | null> {
  const { data, error } = await supabase
    .from("long_term_missions")
    .select()
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateLongTermMission(
  id: string,
  patch: Partial<Pick<LongTermMissionRow, "title" | "status" | "ends_on" | "target_count">>
): Promise<LongTermMissionRow> {
  const { data, error } = await supabase
    .from("long_term_missions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Retires whatever else was running, so exactly one goal is live. */
export async function endOtherActiveLongTermMissions(
  profileId: string,
  exceptId: string
): Promise<void> {
  const { error } = await supabase
    .from("long_term_missions")
    .update({ status: "ended", updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("status", "active")
    .neq("id", exceptId);
  if (error) throw error;
}

/**
 * How many short-term missions have actually been completed against this
 * goal. Counted rather than stored: a cached total is one failed write away
 * from telling somebody they have done more than they have.
 */
export async function countCompletedTowards(longTermMissionId: string): Promise<number> {
  const { count, error } = await supabase
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("long_term_mission_id", longTermMissionId)
    .eq("status", "completed");
  if (error) throw error;
  return count ?? 0;
}
