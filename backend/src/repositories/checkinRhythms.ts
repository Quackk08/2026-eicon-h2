import { supabase } from "../supabase/client.js";

export type RhythmType =
  | "daily"
  | "weekdays"
  | "weekends"
  | "every_n_days"
  | "weekly"
  | "specific_day"
  | "custom"
  | "on_demand";

export interface IntensivePrevious {
  rhythmType: RhythmType;
  intervalDays: number | null;
  specificDay: string | null;
}

export interface CheckinRhythmRow {
  profile_id: string;
  rhythm_type: RhythmType;
  interval_days: number | null;
  specific_day: string | null;
  preferred_time: string | null;
  intensive_until: string | null;
  intensive_previous: IntensivePrevious | null;
  paused_until: string | null;
  next_checkin_at: string | null;
  last_checkin_at: string | null;
  updated_at: string;
}

export async function getOrCreateRhythm(profileId: string): Promise<CheckinRhythmRow> {
  const { data: existing, error: selectError } = await supabase
    .from("checkin_rhythms")
    .select()
    .eq("profile_id", profileId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("checkin_rhythms")
    .insert({ profile_id: profileId, rhythm_type: "on_demand" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRhythm(
  profileId: string,
  patch: Partial<Omit<CheckinRhythmRow, "profile_id" | "updated_at">>
): Promise<CheckinRhythmRow> {
  const { data, error } = await supabase
    .from("checkin_rhythms")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
