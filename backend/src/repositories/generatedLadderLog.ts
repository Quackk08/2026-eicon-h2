import { supabase } from "../supabase/client.js";

export type LadderVerdict =
  | "accepted"
  | "rejected_unreachable"
  | "rejected_schema"
  | "rejected_wordlist"
  | "rejected_incoherent"
  | "rejected_classifier";

export interface LadderLogEntry {
  profileId: string;
  domain: string;
  visionSummary: string;
  rawResponse: string | null;
  verdict: LadderVerdict;
  rejectReason?: string | null;
}

/**
 * Records every generation attempt, accepted or not. Rejected output is the
 * more useful half: it is the only evidence of what the model tried to ship
 * and whether the checks are catching the right things.
 *
 * Never throws — an audit write failing must not take down the request that
 * was being audited.
 */
export async function logLadderGeneration(entry: LadderLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from("generated_ladder_log").insert({
      profile_id: entry.profileId,
      domain: entry.domain,
      vision_summary: entry.visionSummary,
      raw_response: entry.rawResponse,
      verdict: entry.verdict,
      reject_reason: entry.rejectReason ?? null
    });
    if (error) console.error("[ladder-log] insert failed", error.message);
  } catch (err) {
    console.error("[ladder-log] insert threw", err);
  }
}

export async function reportActionTemplate(
  templateId: string,
  profileId: string,
  reason: string
) {
  const { data, error } = await supabase
    .from("action_template_reports")
    .insert({ template_id: templateId, profile_id: profileId, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}
