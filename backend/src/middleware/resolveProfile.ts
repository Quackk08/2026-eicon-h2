import type { NextFunction, Request, Response } from "express";
import { supabase } from "../supabase/client.js";
import {
  createProfile,
  getProfileByAuthUserId,
  getProfileById
} from "../repositories/profiles.js";

declare module "express-serve-static-core" {
  interface Request {
    profileId?: string;
    /** Set only for signed-in requests; absent for guests. */
    authUserId?: string;
  }
}

/**
 * Verifies a Supabase Auth access token. Returns null for any invalid or
 * expired token rather than throwing, so callers can fall back to guest
 * mode instead of erroring the whole request.
 */
async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Two ways in, by product decision:
 *
 * 1. Signed in — `Authorization: Bearer <supabase access token>`. The token
 *    is verified server-side and mapped to the profile owning that auth
 *    user, creating one on first sign-in.
 * 2. Guest — `x-profile-id`. ReNew is usable without an account so the
 *    first step is never gated behind sign-up; the guest profile can be
 *    claimed later via POST /auth/link.
 *
 * A guest id is only trusted when there is no bearer token: once someone is
 * signed in, their own profile always wins over a supplied header.
 */
export async function resolveProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.header("authorization");
    const bearer = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (bearer) {
      const authUserId = await verifyAccessToken(bearer);
      if (!authUserId) {
        return res.status(401).json({ error: "invalid or expired session" });
      }

      let profile = await getProfileByAuthUserId(authUserId);
      if (!profile) {
        profile = await createProfile("ko", "Asia/Seoul", authUserId);
      }

      req.profileId = profile.id;
      req.authUserId = authUserId;
      return next();
    }

    const guestProfileId = req.header("x-profile-id");
    if (!guestProfileId) {
      return res.status(401).json({ error: "sign in, or send x-profile-id for guest access" });
    }

    const profile = await getProfileById(guestProfileId);
    if (!profile) {
      return res.status(404).json({ error: "profile not found" });
    }
    // A profile that has been claimed by an account is no longer reachable
    // with just its id — otherwise anyone holding an old guest id would keep
    // access to a now signed-in person's records.
    if (profile.auth_user_id) {
      return res.status(401).json({ error: "this profile requires sign in" });
    }

    req.profileId = profile.id;
    return next();
  } catch (err) {
    return next(err);
  }
}
