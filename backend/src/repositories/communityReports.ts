import { supabase } from "../supabase/client.js";

export async function createCommunityReport(activityId: string, profileId: string, reason: string) {
  const { data, error } = await supabase
    .from("community_reports")
    .insert({ activity_id: activityId, profile_id: profileId, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}
