import { Router } from "express";
import { z } from "zod";
import { LIFE_DOMAINS } from "@renew/shared";
import { createVision, getVisionById, listVisions, updateVision } from "../repositories/visions.js";
import { createRoute, getLatestRouteForVision } from "../repositories/routes.js";
import { listActionTemplatesByDomain } from "../repositories/actionTemplates.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/visions", resolveProfile, async (req, res, next) => {
  try {
    res.json(await listVisions(req.profileId!));
  } catch (err) {
    next(err);
  }
});

const createVisionSchema = z.object({
  domain: z.enum(LIFE_DOMAINS),
  summary: z.string().min(1).max(500)
});

router.post("/visions", resolveProfile, async (req, res, next) => {
  try {
    const parsed = createVisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const vision = await createVision(req.profileId!, parsed.data.domain, parsed.data.summary);
    res.status(201).json(vision);
  } catch (err) {
    next(err);
  }
});

const patchVisionSchema = z.object({
  summary: z.string().min(1).max(500).optional(),
  status: z.enum(["active", "paused"]).optional()
});

router.patch("/visions/:id", resolveProfile, async (req, res, next) => {
  try {
    const existing = await getVisionById((req.params.id as string));
    if (!existing || existing.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });
    const parsed = patchVisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(await updateVision((req.params.id as string), parsed.data));
  } catch (err) {
    next(err);
  }
});

/**
 * Builds a Life Route from the richest reviewed Activity Ladder available
 * for the vision's domain — the whole ladder becomes the route's ordered
 * steps, with the first step marked "current".
 */
router.post("/visions/:id/generate-route", resolveProfile, async (req, res, next) => {
  try {
    const vision = await getVisionById((req.params.id as string));
    if (!vision || vision.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });

    const candidates = await listActionTemplatesByDomain(vision.domain);
    if (candidates.length === 0) {
      return res.status(422).json({ error: "no reviewed action templates for this domain yet" });
    }

    const groups = new Map<string, typeof candidates>();
    for (const candidate of candidates) {
      const group = groups.get(candidate.ladderGroupId) ?? [];
      group.push(candidate);
      groups.set(candidate.ladderGroupId, group);
    }
    const bestGroup = [...groups.values()].sort((a, b) => b.length - a.length)[0];
    bestGroup.sort((a, b) => a.ladderLevel - b.ladderLevel);

    const route = await createRoute(
      vision.id,
      bestGroup.map((t) => ({ templateId: t.id, ladderLevel: t.ladderLevel }))
    );
    res.status(201).json(route);
  } catch (err) {
    next(err);
  }
});

router.get("/visions/:id/route", resolveProfile, async (req, res, next) => {
  try {
    const vision = await getVisionById((req.params.id as string));
    if (!vision || vision.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });
    res.json(await getLatestRouteForVision(vision.id));
  } catch (err) {
    next(err);
  }
});

export default router;
