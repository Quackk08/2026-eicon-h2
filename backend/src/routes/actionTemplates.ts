import { Router } from "express";
import { supabase } from "../supabase/client.js";
import { getActionTemplateById } from "../repositories/actionTemplates.js";
import type { ActionTemplate } from "@renew/shared";

const router = Router();

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

// Reviewed reference data — the client fetches the whole set once rather
// than one request per route step.
router.get("/action-templates", async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from("action_templates").select();
    if (error) throw error;
    res.json((data as ActionTemplateRow[]).map(toDomain));
  } catch (err) {
    next(err);
  }
});

router.get("/action-templates/:id", async (req, res, next) => {
  try {
    const template = await getActionTemplateById(req.params.id as string);
    if (!template) return res.status(404).json({ error: "not found" });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

export default router;
