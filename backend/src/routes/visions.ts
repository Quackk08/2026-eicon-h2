import { Router } from "express";
import { z } from "zod";
import { LIFE_DOMAINS } from "@renew/shared";
import {
  createVision,
  getVisionById,
  listVisions,
  pauseActiveVisions,
  updateVision
} from "../repositories/visions.js";
import { createRoute, getLatestRouteForVision, updateRouteStatus } from "../repositories/routes.js";
import {
  listActionTemplatesByDomain,
  replaceGeneratedTemplates
} from "../repositories/actionTemplates.js";
import { getPreferences } from "../repositories/preferences.js";
import { generateLadderForVision } from "../services/ladderGenerator.js";
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
    await pauseActiveVisions(req.profileId!, vision.id);
    res.status(201).json(vision);
  } catch (err) {
    next(err);
  }
});

const patchVisionSchema = z.object({
  summary: z.string().min(1).max(500).optional(),
  status: z.enum(["active", "paused"]).optional(),
  domain: z.enum(LIFE_DOMAINS).optional()
});

router.patch("/visions/:id", resolveProfile, async (req, res, next) => {
  try {
    const existing = await getVisionById((req.params.id as string));
    if (!existing || existing.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });
    const parsed = patchVisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (parsed.data.status === "active") {
      await pauseActiveVisions(req.profileId!, existing.id);
    }
    const updated = await updateVision((req.params.id as string), parsed.data);
    if (parsed.data.status) {
      const route = await getLatestRouteForVision(existing.id);
      if (route) await updateRouteStatus(route.id, parsed.data.status);
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * Builds a Life Route for this Vision. The ladder is generated from the
 * person's own words when the model returns something that passes schema,
 * safety, and coherence checks; otherwise it falls back to the reviewed
 * seed ladder for the domain, so a Route always exists.
 */
router.post("/visions/:id/generate-route", resolveProfile, async (req, res, next) => {
  try {
    const vision = await getVisionById((req.params.id as string));
    if (!vision || vision.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });

    const preferences = (await getPreferences(req.profileId!)) ?? {};

    let ladder = await generateLadderForVision({
      profileId: req.profileId!,
      visionSummary: vision.summary,
      domain: vision.domain,
      preferences
    });

    if (ladder) {
      await replaceGeneratedTemplates(req.profileId!, vision.domain, ladder);
    } else {
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
      ladder = [...groups.values()].sort((a, b) => b.length - a.length)[0];
    }

    const ordered = [...ladder].sort((a, b) => a.ladderLevel - b.ladderLevel);
    const route = await createRoute(
      vision.id,
      ordered.map((t) => ({ templateId: t.id, ladderLevel: t.ladderLevel }))
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
