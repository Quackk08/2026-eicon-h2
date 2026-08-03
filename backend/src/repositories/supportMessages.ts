import { supabase } from "../supabase/client.js";

export interface SupportMessageRow {
  id: string;
  profile_id: string;
  trusted_contact_id: string | null;
  channel: "sms" | "tel";
  message_preview: string;
  included_data: string[];
  excluded_data: string[];
  approved_at: string | null;
  created_at: string;
}

export interface SupportMessageInput {
  trustedContactId: string | null;
  channel: "sms" | "tel";
  messagePreview: string;
  includedData: string[];
  excludedData: string[];
}

/**
 * Records a handoff the user explicitly approved on the preview screen.
 *
 * ReNew never sends anything itself — the device's own SMS or phone app
 * does, after the person taps through. This row is the audit trail of what
 * they were shown and agreed to share, which is why approved_at is stamped
 * here rather than left for a later step: a row without approval would
 * misrepresent an unapproved handoff as an approved one.
 */
export async function createSupportMessage(
  profileId: string,
  input: SupportMessageInput
): Promise<SupportMessageRow> {
  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      profile_id: profileId,
      trusted_contact_id: input.trustedContactId,
      channel: input.channel,
      message_preview: input.messagePreview,
      included_data: input.includedData,
      excluded_data: input.excludedData,
      approved_at: new Date().toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data as SupportMessageRow;
}

export async function listSupportMessages(
  profileId: string,
  limit = 50
): Promise<SupportMessageRow[]> {
  const { data, error } = await supabase
    .from("support_messages")
    .select()
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as SupportMessageRow[];
}
