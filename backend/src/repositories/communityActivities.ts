import { supabase } from "../supabase/client.js";
import type { CommunityActivity } from "@renew/shared";

interface CommunityActivityRow {
  id: string;
  title: string;
  domain: string | null;
  starts_at: string | null;
  is_online: boolean;
  location: string | null;
  duration_minutes: number | null;
  social_load: number | null;
  max_participants: number | null;
  required_items: string | null;
}

function toDomain(row: CommunityActivityRow): CommunityActivity {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    startsAt: row.starts_at,
    isOnline: row.is_online,
    location: row.location,
    durationMinutes: row.duration_minutes,
    socialLoad: row.social_load,
    maxParticipants: row.max_participants,
    requiredItems: row.required_items
  };
}

export async function listCommunityActivities(maxSocialLoad?: number): Promise<CommunityActivity[]> {
  let query = supabase.from("community_activities").select();
  if (maxSocialLoad !== undefined) {
    // social_load can be null (unspecified) — those are always shown.
    query = query.or(`social_load.is.null,social_load.lte.${maxSocialLoad}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as CommunityActivityRow[]).map(toDomain);
}

export async function getCommunityActivityById(id: string): Promise<CommunityActivity | null> {
  const { data, error } = await supabase.from("community_activities").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toDomain(data as CommunityActivityRow) : null;
}

export async function upsertCommunityActivities(activities: CommunityActivity[]): Promise<void> {
  const rows = activities.map((a) => ({
    id: a.id,
    title: a.title,
    domain: a.domain,
    starts_at: a.startsAt,
    is_online: a.isOnline,
    location: a.location,
    duration_minutes: a.durationMinutes,
    social_load: a.socialLoad,
    max_participants: a.maxParticipants,
    required_items: a.requiredItems
  }));
  const { error } = await supabase.from("community_activities").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}
