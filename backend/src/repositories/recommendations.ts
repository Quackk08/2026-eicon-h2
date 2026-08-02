import { supabase } from "../supabase/client.js";
import type { RecommendationResult } from "@renew/shared";

export interface RecommendationRow {
  id: string;
  profile_id: string;
  check_in_id: string | null;
  contract_version: number;
  selected_template_id: string;
  smaller_template_id: string | null;
  extension_template_id: string | null;
  summary: string;
  user_facing_reason: string;
  source: "rules" | "ai";
  warnings: string[];
  created_at: string;
}

export async function createRecommendation(
  profileId: string,
  checkInId: string | null,
  result: RecommendationResult,
  source: "rules" | "ai"
): Promise<RecommendationRow> {
  const { data, error } = await supabase
    .from("recommendations")
    .insert({
      profile_id: profileId,
      check_in_id: checkInId,
      contract_version: result.contractVersion,
      selected_template_id: result.selectedTemplateId,
      smaller_template_id: result.smallerOptionTemplateId,
      extension_template_id: result.extensionOptionTemplateId,
      summary: result.summary,
      user_facing_reason: result.userFacingReason,
      source,
      warnings: result.warnings
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecommendationById(id: string): Promise<RecommendationRow | null> {
  const { data, error } = await supabase.from("recommendations").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
