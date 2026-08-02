import { supabase } from "../supabase/client.js";
import type { CheckInInput } from "@renew/shared";

export interface CheckInRow {
  id: string;
  profile_id: string;
  local_id: string;
  type: "quick" | "standard" | "weekly";
  captured_at: string;
  mood: number;
  energy: number;
  functional_capacity: number;
  stress: number | null;
  sleep_quality: number | null;
  loneliness: number | null;
  social_load: number | null;
  initiation_difficulty: number | null;
  craving: number | null;
  note: string | null;
  created_at: string;
}

function fieldOrNull(checkIn: CheckInInput, key: string): number | null {
  return key in checkIn ? ((checkIn as Record<string, unknown>)[key] as number | undefined) ?? null : null;
}

/**
 * Insert is idempotent on (profile_id, local_id) so a retried offline sync
 * never creates a duplicate check-in, per PRODUCT_GUARDRAILS.md offline rules.
 */
export async function createCheckIn(profileId: string, checkIn: CheckInInput): Promise<CheckInRow> {
  const { data, error } = await supabase
    .from("check_ins")
    .upsert(
      {
        profile_id: profileId,
        local_id: checkIn.localId,
        type: checkIn.type,
        captured_at: checkIn.capturedAt,
        mood: checkIn.mood,
        energy: checkIn.energy,
        functional_capacity: checkIn.functionalCapacity,
        stress: fieldOrNull(checkIn, "stress"),
        sleep_quality: fieldOrNull(checkIn, "sleepQuality"),
        loneliness: fieldOrNull(checkIn, "loneliness"),
        social_load: fieldOrNull(checkIn, "socialLoad"),
        initiation_difficulty: fieldOrNull(checkIn, "initiationDifficulty"),
        craving: fieldOrNull(checkIn, "craving"),
        note: checkIn.note ?? null
      },
      { onConflict: "profile_id,local_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listRecentCheckIns(profileId: string, limit = 20): Promise<CheckInRow[]> {
  const { data, error } = await supabase
    .from("check_ins")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getLatestCheckIn(profileId: string): Promise<CheckInRow | null> {
  const rows = await listRecentCheckIns(profileId, 1);
  return rows[0] ?? null;
}
