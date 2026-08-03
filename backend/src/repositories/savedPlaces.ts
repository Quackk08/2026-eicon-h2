import { supabase } from "../supabase/client.js";

interface SavedPlaceRow {
  place_id: string;
}

export async function listSavedPlaceIds(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_places")
    .select("place_id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as SavedPlaceRow[]).map((row) => row.place_id);
}

/**
 * Upsert rather than insert: saving a place that is already saved is the
 * same intent as saving it once, so a replayed offline operation must not
 * fail on the (profile_id, place_id) primary key.
 */
export async function savePlace(profileId: string, placeId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_places")
    .upsert({ profile_id: profileId, place_id: placeId }, { onConflict: "profile_id,place_id" });
  if (error) throw error;
}

export async function unsavePlace(profileId: string, placeId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_places")
    .delete()
    .eq("profile_id", profileId)
    .eq("place_id", placeId);
  if (error) throw error;
}
