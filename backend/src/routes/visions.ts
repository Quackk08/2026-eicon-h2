import { Router } from "express";
import { z } from "zod";
import {
  LIFE_DOMAINS,
  looksDirectionless,
  ORIENTING_LADDER_GROUP_ID,
  type ActionTemplate
} from "@renew/shared";
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
  listActionTemplatesInLadderGroup,
  replaceGeneratedTemplates
} from "../repositories/actionTemplates.js";
import { getPreferences } from "../repositories/preferences.js";
import { getOrCreateRhythm } from "../repositories/checkinRhythms.js";
import {
  createLongTermMission,
  endOtherActiveLongTermMissions
} from "../repositories/longTermMissions.js";
import { generateLadderForVision } from "../services/ladderGenerator.js";
import { deriveLongTermPlan, withProgress } from "../services/longTermPlanner.js";
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

    // A Vision that names no direction gets the reviewed orienting ladder
    // rather than a generated one. Asking a model to invent goals for
    // someone who just said they have none produces exactly the invented
    // purpose they did not ask for; these steps look for a direction
    // instead of assuming one.
    let ladder: ActionTemplate[] | null = null;
    if (looksDirectionless(vision.summary)) {
      const orienting = await listActionTemplatesInLadderGroup(ORIENTING_LADDER_GROUP_ID);
      if (orienting.length > 0) ladder = orienting;
    }

    ladder ??= await generateLadderForVision({
      profileId: req.profileId!,
      visionSummary: vision.summary,
      domain: vision.domain,
      preferences
    });

    // The orienting ladder is reviewed seed data and already stored, so only
    // a generated one needs writing.
    const isGenerated = ladder !== null && ladder.some((step) => step.id.startsWith("ai-"));
    if (isGenerated) {
      await replaceGeneratedTemplates(req.profileId!, vision.domain, ladder!);
    }

    if (ladder) {
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

    /*
     * The Route names a destination but no horizon, which left a person with
     * a direction that could never be finished and a Mission that expired at
     * midnight. The one-to-two month commitment is born here because it is
     * this Route's own promise — reach the top of it, this many times, by
     * this date — and building it separately would let the two disagree.
     *
     * Failure is not allowed to cost someone their Route. Onboarding has
     * already taken them through four screens by this point, and a goal they
     * cannot see yet is a far smaller loss than being sent back to the start.
     */
    let longTermMission = null;
    try {
      const rhythm = await getOrCreateRhythm(req.profileId!);
      const plan = deriveLongTermPlan({
        visionSummary: vision.summary,
        ladderSteps: route.steps.length,
        rhythm: rhythm.rhythm_type,
        intervalDays: rhythm.interval_days
      });
      const created = await createLongTermMission(req.profileId!, {
        visionId: vision.id,
        routeId: route.id,
        ...plan
      });
      await endOtherActiveLongTermMissions(req.profileId!, created.id);
      longTermMission = await withProgress(created);
    } catch (err) {
      console.error("long-term mission could not be derived:", err instanceof Error ? err.message : "unknown");
    }

    res.status(201).json({ ...route, longTermMission });
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
