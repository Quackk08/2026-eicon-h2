import { Router } from "express";
import { z } from "zod";
import { getPreferences } from "../repositories/preferences.js";
import {
  getCommunityActivityById,
  listCommunityActivities
} from "../repositories/communityActivities.js";
import {
  cancelParticipation,
  countJoined,
  getParticipation,
  joinActivity,
  listMyParticipations
} from "../repositories/participations.js";
import { createCommunityReport } from "../repositories/communityReports.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

const SOCIAL_RANK: Record<string, number> = { solo: 0, low: 1, medium: 2, high: 3 };

/**
 * Only shows reviewed activities at or below the user's own stated social
 * capacity — never a random open feed, per PRODUCT_GUARDRAILS.md
 * ("Community is structured around small shared actions, not an open
 * social network").
 */
router.get("/community/activities", resolveProfile, async (req, res, next) => {
  try {
    const preferences = await getPreferences(req.profileId!);
    const maxSocialLoad = SOCIAL_RANK[preferences?.social_preference ?? "low"] ?? 1;

    const activities = await listCommunityActivities(maxSocialLoad);
    const withCounts = await Promise.all(
      activities.map(async (activity) => {
        const [joinedCount, myParticipation] = await Promise.all([
          countJoined(activity.id),
          getParticipation(activity.id, req.profileId!)
        ]);
        return {
          ...activity,
          joinedCount,
          isFull: activity.maxParticipants !== null && joinedCount >= activity.maxParticipants,
          myStatus: myParticipation?.status ?? null
        };
      })
    );

    res.json(withCounts);
  } catch (err) {
    next(err);
  }
});

router.post("/community/activities/:id/join", resolveProfile, async (req, res, next) => {
  try {
    const activityId = req.params.id as string;
    const activity = await getCommunityActivityById(activityId);
    if (!activity) return res.status(404).json({ error: "not found" });

    const existing = await getParticipation(activityId, req.profileId!);
    if (existing?.status === "joined") return res.json(existing);

    if (activity.maxParticipants !== null) {
      const joinedCount = await countJoined(activityId);
      if (joinedCount >= activity.maxParticipants) {
        return res.status(409).json({ error: "activity is full" });
      }
    }

    const participation = await joinActivity(activityId, req.profileId!);
    res.status(201).json(participation);
  } catch (err) {
    next(err);
  }
});

// Explicit cancellation path — required alongside join per PRODUCT_GUARDRAILS.md.
router.post("/community/activities/:id/cancel", resolveProfile, async (req, res, next) => {
  try {
    const activityId = req.params.id as string;
    const existing = await getParticipation(activityId, req.profileId!);
    if (!existing) return res.status(404).json({ error: "not joined" });
    res.json(await cancelParticipation(activityId, req.profileId!));
  } catch (err) {
    next(err);
  }
});

router.get("/community/participations", resolveProfile, async (req, res, next) => {
  try {
    res.json(await listMyParticipations(req.profileId!));
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({
  reason: z.string().min(1).max(1000)
});

// Reports target activity content, not other participants — this MVP
// never exposes who else joined, so there's no per-user report/block yet.
router.post("/community/activities/:id/report", resolveProfile, async (req, res, next) => {
  try {
    const activityId = req.params.id as string;
    const activity = await getCommunityActivityById(activityId);
    if (!activity) return res.status(404).json({ error: "not found" });

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const report = await createCommunityReport(activityId, req.profileId!, parsed.data.reason);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
