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
  const { data, error } = await supabase.from("action_templates").select().contains("goal_domains", [domain]);
  if (error) throw error;
  return (data as ActionTemplateRow[]).map(toDomain);
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
