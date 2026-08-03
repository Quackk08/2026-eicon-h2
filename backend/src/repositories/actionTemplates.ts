import { supabase } from "../supabase/client.js";
import type { ActionTemplate } from "@renew/shared";

interface ActionTemplateRow {
  id: string;
  goal_domains: string[];
  title: string;
  min_capacity: number;
  max_social_load: number;
  duration_min_minutes: number;
  duration_max_minutes: number;
  cost_level: number;
  place_types: string[];
  indoor_outdoor: "indoor" | "outdoor" | "either";
  ladder_group_id: string;
  ladder_level: number;
  safety_tags: string[];
}

function toDomain(row: ActionTemplateRow): ActionTemplate {
  return {
    id: row.id,
    goalDomains: row.goal_domains as ActionTemplate["goalDomains"],
    title: row.title,
    minCapacity: row.min_capacity,
    maxSocialLoad: row.max_social_load,
    durationRange: [row.duration_min_minutes, row.duration_max_minutes],
    costLevel: row.cost_level,
    placeTypes: row.place_types,
    indoorOutdoor: row.indoor_outdoor,
    ladderGroupId: row.ladder_group_id,
    ladderLevel: row.ladder_level,
    safetyTags: row.safety_tags
  };
}

export async function listActionTemplatesByDomain(domain: string): Promise<ActionTemplate[]> {
  const { data, error } = await supabase
    .from("action_templates")
    .select()
    .contains("goal_domains", [domain])
    .is("profile_id", null);
  if (error) throw error;
  return (data as ActionTemplateRow[]).map(toDomain);
}

/**
 * A person's own generated ladder when they have one, and the reviewed seed
 * steps otherwise. Generated steps belong to a single profile, so they are
 * never offered to anyone else.
 */
export async function listActionTemplatesForProfile(
  profileId: string,
  domain: string
): Promise<ActionTemplate[]> {
  const { data, error } = await supabase
    .from("action_templates")
    .select()
    .eq("profile_id", profileId)
    .contains("goal_domains", [domain]);
  if (error) throw error;

  const generated = (data as ActionTemplateRow[]).map(toDomain);
  return generated.length > 0 ? generated : listActionTemplatesByDomain(domain);
}

export async function replaceGeneratedTemplates(
  profileId: string,
  domain: string,
  templates: ActionTemplate[]
): Promise<void> {
  // One generated ladder per domain per person — regenerating replaces the
  // previous attempt instead of piling unused steps up in the library.
  const { error: deleteError } = await supabase
    .from("action_templates")
    .delete()
    .eq("profile_id", profileId)
    .contains("goal_domains", [domain]);
  if (deleteError) throw deleteError;

  if (templates.length === 0) return;

  const rows = templates.map((t) => ({
    id: t.id,
    profile_id: profileId,
    source: "ai",
    goal_domains: t.goalDomains,
    title: t.title,
    min_capacity: t.minCapacity,
    max_social_load: t.maxSocialLoad,
    duration_min_minutes: t.durationRange[0],
    duration_max_minutes: t.durationRange[1],
    cost_level: t.costLevel,
    place_types: t.placeTypes,
    indoor_outdoor: t.indoorOutdoor,
    ladder_group_id: t.ladderGroupId,
    ladder_level: t.ladderLevel,
    safety_tags: t.safetyTags
  }));

  const { error } = await supabase.from("action_templates").insert(rows);
  if (error) throw error;
}

/** `source` travels with the template so the UI can say which steps were generated. */
export type ActionTemplateWithSource = ActionTemplate & { source: "seed" | "ai" };

function toDomainWithSource(row: ActionTemplateRow & { source?: "seed" | "ai" }): ActionTemplateWithSource {
  return { ...toDomain(row), source: row.source ?? "seed" };
}

/**
 * Everything this person is allowed to see: the reviewed seed library, plus
 * the ladder generated for them.
 *
 * Generated steps are written from someone's own Vision and can carry the
 * shape of their situation, so another profile's rows must never appear
 * here — the seed library is shared, generated ladders are not.
 */
export async function listVisibleActionTemplates(
  profileId: string
): Promise<ActionTemplateWithSource[]> {
  const { data, error } = await supabase
    .from("action_templates")
    .select()
    .or(`profile_id.is.null,profile_id.eq.${profileId}`);
  if (error) throw error;
  return (data as Array<ActionTemplateRow & { source?: "seed" | "ai" }>).map(toDomainWithSource);
}

/** Same visibility rule as the list above, for a single template. */
export async function getVisibleActionTemplate(
  profileId: string,
  id: string
): Promise<ActionTemplateWithSource | null> {
  const { data, error } = await supabase
    .from("action_templates")
    .select()
    .eq("id", id)
    .or(`profile_id.is.null,profile_id.eq.${profileId}`)
    .maybeSingle();
  if (error) throw error;
  return data ? toDomainWithSource(data as ActionTemplateRow & { source?: "seed" | "ai" }) : null;
}

export async function getActionTemplateById(id: string): Promise<ActionTemplate | null> {
  const { data, error } = await supabase.from("action_templates").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toDomain(data as ActionTemplateRow) : null;
}

export async function listActionTemplatesInLadderGroup(ladderGroupId: string): Promise<ActionTemplate[]> {
  const { data, error } = await supabase
    .from("action_templates")
    .select()
    .eq("ladder_group_id", ladderGroupId)
    .order("ladder_level", { ascending: true });
  if (error) throw error;
  return (data as ActionTemplateRow[]).map(toDomain);
}

export async function upsertActionTemplates(templates: ActionTemplate[]): Promise<void> {
  const rows = templates.map((t) => ({
    id: t.id,
    goal_domains: t.goalDomains,
    title: t.title,
    min_capacity: t.minCapacity,
    max_social_load: t.maxSocialLoad,
    duration_min_minutes: t.durationRange[0],
    duration_max_minutes: t.durationRange[1],
    cost_level: t.costLevel,
    place_types: t.placeTypes,
    indoor_outdoor: t.indoorOutdoor,
    ladder_group_id: t.ladderGroupId,
    ladder_level: t.ladderLevel,
    safety_tags: t.safetyTags
  }));
  const { error } = await supabase.from("action_templates").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}
