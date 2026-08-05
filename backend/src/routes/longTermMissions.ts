import { Router } from "express";
import { z } from "zod";
import { LONG_TERM_MISSION_STATUSES } from "@renew/shared";
import { resolveProfile } from "../middleware/resolveProfile.js";
import {
  createLongTermMission,
  endOtherActiveLongTermMissions,
  getActiveLongTermMission,
  getLongTermMissionById,
  listLongTermMissions,
  updateLongTermMission
} from "../repositories/longTermMissions.js";
import { getVisionById, listVisions } from "../repositories/visions.js";
import { getLatestRouteForVision } from "../repositories/routes.js";
import { getOrCreateRhythm } from "../repositories/checkinRhythms.js";
import { deriveLongTermPlan, withProgress } from "../services/longTermPlanner.js";

const router = Router();

/** Every long-term mission this profile has, newest first, with progress. */
router.get("/long-term-missions", resolveProfile, async (req, res, next) => {
  try {
    const rows = await listLongTermMissions(req.profileId!);
    res.json(await Promise.all(rows.map((row) => withProgress(row))));
  } catch (err) {
    next(err);
  }
});

/** The one currently being worked towards, or null. */
router.get("/long-term-missions/active", resolveProfile, async (req, res, next) => {
  try {
    const row = await getActiveLongTermMission(req.profileId!);
    if (!row) return res.json(null);
    res.json(await withProgress(row));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  visionId: z.string().uuid().optional()
});

/**
 * Derives a one-to-two month commitment from a Vision and its Route.
 *
 * The horizon and the target are the rule engine's, not the caller's: a
 * client that could name its own deadline could name one the product does
 * not promise, and the whole point of this row is that the promise is
 * bounded. What a person can change afterwards is the title, and whether it
 * is still running.
 */
router.post("/long-term-missions", resolveProfile, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const vision = parsed.data.visionId
      ? await getVisionById(parsed.data.visionId)
      : (await listVisions(req.profileId!)).find((item) => item.status === "active") ?? null;

    if (!vision || vision.profile_id !== req.profileId) {
      return res.status(422).json({ error: "no active life vision to build a long-term mission from" });
    }

    const route = await getLatestRouteForVision(vision.id);
    if (!route || route.steps.length === 0) {
      return res.status(422).json({ error: "this vision has no route yet" });
    }

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
    // Exactly one live goal, for the same reason there is one active Vision:
    // two at once and today's step stops obviously belonging to either.
    await endOtherActiveLongTermMissions(req.profileId!, created.id);

    res.status(201).json(await withProgress(created));
  } catch (err) {
    next(err);
  }
});

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(LONG_TERM_MISSION_STATUSES).optional()
  })
  .refine((value) => value.title !== undefined || value.status !== undefined, {
    message: "title or status required"
  });

router.patch("/long-term-missions/:id", resolveProfile, async (req, res, next) => {
  try {
    const existing = await getLongTermMissionById(req.params.id as string);
    if (!existing || existing.profile_id !== req.profileId) {
      return res.status(404).json({ error: "not found" });
    }

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = await updateLongTermMission(existing.id, parsed.data);
    if (parsed.data.status === "active") {
      await endOtherActiveLongTermMissions(req.profileId!, updated.id);
    }

    res.json(await withProgress(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
