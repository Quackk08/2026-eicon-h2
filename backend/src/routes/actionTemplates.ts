import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase/client.js";
import { getActionTemplateById } from "../repositories/actionTemplates.js";
import { reportActionTemplate } from "../repositories/generatedLadderLog.js";
import { resolveProfile } from "../middleware/resolveProfile.js";
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
  source?: "seed" | "ai";
}

/** `source` travels with the template so the UI can say which steps were generated. */
function toDomain(row: ActionTemplateRow): ActionTemplate & { source: "seed" | "ai" } {
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
    safetyTags: row.safety_tags,
    source: row.source ?? "seed"
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

const reportSchema = z.object({ reason: z.string().min(1).max(1000) });

/**
 * Lets someone flag a step that should not have been suggested. Generated
 * steps ship without prior human review, so this is the path by which a bad
 * one gets seen by a person.
 */
router.post("/action-templates/:id/report", resolveProfile, async (req, res, next) => {
  try {
    const templateId = req.params.id as string;
    const template = await getActionTemplateById(templateId);
    if (!template) return res.status(404).json({ error: "not found" });

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const report = await reportActionTemplate(templateId, req.profileId!, parsed.data.reason);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
