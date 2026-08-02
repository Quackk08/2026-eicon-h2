import type { NextFunction, Request, Response } from "express";
import { getProfileById } from "../repositories/profiles.js";

declare module "express-serve-static-core" {
  interface Request {
    profileId?: string;
  }
}

/**
 * Temporary auth substitute until docs/IMPLEMENTATION_PLAN.md section 12's
 * "인증 공급자와 로그인 방식" decision lands. The client bootstraps a
 * profile once via POST /api/profiles and sends its id back on every
 * request. Swap this for real Supabase Auth session verification later
 * without changing any route handler signatures.
 */
export async function resolveProfile(req: Request, res: Response, next: NextFunction) {
  const profileId = req.header("x-profile-id");
  if (!profileId) {
    return res.status(401).json({ error: "x-profile-id header required" });
  }
  const profile = await getProfileById(profileId);
  if (!profile) {
    return res.status(404).json({ error: "profile not found" });
  }
  req.profileId = profile.id;
  next();
}
