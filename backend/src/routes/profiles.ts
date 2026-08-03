import { Router } from "express";
import { z } from "zod";
import { createProfile, getProfileById } from "../repositories/profiles.js";
import { getPreferences, upsertPreferences } from "../repositories/preferences.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

// Temporary bootstrap until real auth is wired — see resolveProfile.ts.
router.post("/profiles", async (req, res, next) => {
  try {
    const { locale, timezone } = req.body as { locale?: string; timezone?: string };
    const profile = await createProfile(locale, timezone);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

router.get("/me", resolveProfile, async (req, res, next) => {
  try {
    const profile = await getProfileById(req.profileId!);
    const preferences = await getPreferences(req.profileId!);
    res.json({ ...profile, preferences, signedIn: Boolean(req.authUserId) });
  } catch (err) {
    next(err);
  }
});

const preferencesSchema = z.object({
  maxMinutes: z.number().int().positive().optional(),
  maxDistanceMeters: z.number().int().nonnegative().optional(),
  maxCost: z.number().nonnegative().optional(),
  socialPreference: z.enum(["solo", "low", "medium", "high"]).optional(),
  accessibilityNeeds: z.array(z.string()).optional()
});

router.patch("/me/preferences", resolveProfile, async (req, res, next) => {
  try {
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const preferences = await upsertPreferences(req.profileId!, parsed.data);
    res.json(preferences);
  } catch (err) {
    next(err);
  }
});

export default router;
