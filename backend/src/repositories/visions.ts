import { supabase } from "../supabase/client.js";
import type { LifeDomain } from "../types.js";

export interface VisionRow {
  id: string;
  profile_id: string;
  domain: LifeDomain;
  summary: string;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
}

export async function listVisions(profileId: string): Promise<VisionRow[]> {
  const { data, error } = await supabase
    .from("life_visions")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getVisionById(id: string): Promise<VisionRow | null> {
  const { data, error } = await supabase.from("life_visions").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVision(profileId: string, domain: LifeDomain, summary: string): Promise<VisionRow> {
  const { data, error } = await supabase
    .from("life_visions")
    .insert({ profile_id: profileId, domain, summary })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function pauseActiveVisions(profileId: string, exceptId?: string): Promise<void> {
  let query = supabase
    .from("life_visions")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("status", "active");
  if (exceptId) query = query.neq("id", exceptId);
  const { error } = await query;
  if (error) throw error;
}

export async function updateVision(
  id: string,
  patch: Partial<Pick<VisionRow, "summary" | "status" | "domain">>
): Promise<VisionRow> {
  const { data, error } = await supabase
    .from("life_visions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
