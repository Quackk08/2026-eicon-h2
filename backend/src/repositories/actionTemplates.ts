import { supabase } from "../supabase/client.js";
import type { ActionTemplate } from "@renew/shared";
import { randomUUID } from "node:crypto";

interface ActionTemplateRow {
  id: string;
  profile_id: string | null;
  source: "seed" | "ai" | "user";
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

  const personalRows = data as ActionTemplateRow[];

  // Regenerating leaves earlier ladders behind whenever history references
  // them, so "this person's generated ladder" means the newest one only.
  // Mixing two ladders would offer steps from a Vision they have moved on
  // from. The group id carries its creation time, so the highest is newest.
  const aiRows = personalRows.filter((row) => row.source === "ai");
  if (aiRows.length > 0) {
    const newestGroup = aiRows
      .map((row) => row.ladder_group_id)
      .sort()
      .at(-1);
    return aiRows.filter((row) => row.ladder_group_id === newestGroup).map(toDomain);
  }

  const personal = personalRows.map(toDomain);

  const reviewed = await listActionTemplatesByDomain(domain);
  return [...reviewed, ...personal];
}

export async function replaceGeneratedTemplates(
  profileId: string,
  domain: string,
  templates: ActionTemplate[]
): Promise<void> {
  // Clear the previous attempt so unused steps do not pile up — but a step
  // an earlier recommendation still points at cannot go. Postgres refuses it
  // (23503), and that refusal used to escape as a 500 that cost the person
  // their whole Route: anyone who had ever been recommended a generated step
  // could no longer regenerate one.
  //
  // Those rows stay, because a past recommendation should keep naming what
  // was actually recommended. Selection below takes the newest ladder, so
  // the survivors sit in history rather than in anyone's way.
  const { error: deleteError } = await supabase
    .from("action_templates")
    .delete()
    .eq("profile_id", profileId)
    .eq("source", "ai")
    .contains("goal_domains", [domain]);
  if (deleteError && (deleteError as { code?: string }).code !== "23503") throw deleteError;

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
export type ActionTemplateWithSource = ActionTemplate & { source: "seed" | "ai" | "user" };

function toDomainWithSource(row: ActionTemplateRow & { source?: "seed" | "ai" | "user" }): ActionTemplateWithSource {
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
  return (data as Array<ActionTemplateRow & { source?: "seed" | "ai" | "user" }>).map(toDomainWithSource);
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
  return data ? toDomainWithSource(data as ActionTemplateRow & { source?: "seed" | "ai" | "user" }) : null;
}

function normalizePlaceType(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return normalized || "flexible";
}

export async function createUserRouteTemplate(input: {
  profileId: string;
  domain: string;
  routeId: string;
  ladderGroupId?: string;
  level: number;
  title: string;
  durationMinutes: number;
  placeType: string;
}): Promise<ActionTemplateWithSource> {
  const id = `user-${randomUUID()}`;
  const row = {
    id,
    profile_id: input.profileId,
    source: "user",
    goal_domains: [input.domain],
    title: input.title,
    min_capacity: Math.min(4, Math.max(0, input.level - 1)),
    max_social_load: 2,
    duration_min_minutes: input.durationMinutes,
    duration_max_minutes: input.durationMinutes,
    cost_level: 0,
    place_types: [normalizePlaceType(input.placeType)],
    indoor_outdoor: "either",
    ladder_group_id: input.ladderGroupId ?? `user-route-${input.routeId}`,
    ladder_level: input.level,
    safety_tags: []
  } as const;
  const { data, error } = await supabase.from("action_templates").insert(row).select().single();
  if (error) throw error;
  return toDomainWithSource(data as ActionTemplateRow);
}

export async function deleteUserRouteTemplate(profileId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from("action_templates")
    .delete()
    .eq("id", templateId)
    .eq("profile_id", profileId)
    .eq("source", "user");
  // Historical Missions/Recommendations intentionally keep the template.
  // PostgreSQL reports 23503 when one still references it.
  if (error && error.code !== "23503") throw error;
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
