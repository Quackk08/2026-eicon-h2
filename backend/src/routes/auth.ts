import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase/client.js";
import { resolveProfile } from "../middleware/resolveProfile.js";
import {
  deleteProfile,
  getProfileByAuthUserId,
  getProfileById,
  linkProfileToAuthUser,
  profileHasRecords
} from "../repositories/profiles.js";

const router = Router();

const linkSchema = z.object({
  guestProfileId: z.string().uuid()
});

/**
 * Claims a guest profile for the signed-in account, so someone who used
 * ReNew before creating an account keeps their Vision, Route, Check-Ins,
 * and Missions.
 *
 * Sign-up/sign-in themselves happen directly against Supabase Auth from the
 * client — this backend never receives a password.
 */
router.post("/auth/link", resolveProfile, async (req, res, next) => {
  try {
    if (!req.authUserId) {
      return res.status(401).json({ error: "sign in before linking a guest profile" });
    }

    const parsed = linkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const guest = await getProfileById(parsed.data.guestProfileId);
    if (!guest) return res.status(404).json({ error: "guest profile not found" });

    if (guest.auth_user_id === req.authUserId) {
      return res.json({ linked: true, profile: guest });
    }
    if (guest.auth_user_id) {
      return res.status(409).json({ error: "this profile already belongs to another account" });
    }

    // Signing in always resolves to a profile, so a brand-new account has an
    // empty placeholder by the time it gets here. Discard that placeholder
    // and keep the guest's real history. If the account's own profile
    // already holds records, refuse instead — merging two populated
    // profiles needs a conflict rule that does not exist yet, and guessing
    // would mean silently dropping someone's records.
    const existing = await getProfileByAuthUserId(req.authUserId);
    if (existing && existing.id !== guest.id) {
      if (await profileHasRecords(existing.id)) {
        return res.status(409).json({
          error: "this account already has recorded activity; merging two profiles is not supported yet"
        });
      }
      await deleteProfile(existing.id);
    }

    const linked = await linkProfileToAuthUser(guest.id, req.authUserId);
    if (!linked) {
      return res.status(409).json({ error: "profile was claimed while linking; retry" });
    }

    res.json({ linked: true, profile: linked });
  } catch (err) {
    next(err);
  }
});

/** Reports whether the caller is signed in, and which profile they resolve to. */
router.get("/auth/session", resolveProfile, async (req, res, next) => {
  try {
    const profile = await getProfileById(req.profileId!);
    let email: string | null = null;

    if (req.authUserId) {
      const { data } = await supabase.auth.admin.getUserById(req.authUserId);
      email = data.user?.email ?? null;
    }

    res.json({
      signedIn: Boolean(req.authUserId),
      profileId: req.profileId,
      email,
      profile
    });
  } catch (err) {
    next(err);
  }
});

export default router;
