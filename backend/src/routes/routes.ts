import { Router } from "express";
import { z } from "zod";
import { getRouteById, updateRouteStatus, updateStepStatus } from "../repositories/routes.js";
import { getVisionById } from "../repositories/visions.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

async function assertOwnedRoute(routeId: string, profileId: string) {
  const route = await getRouteById(routeId);
  if (!route) return null;
  const vision = await getVisionById(route.vision_id);
  if (!vision || vision.profile_id !== profileId) return null;
  return route;
}

router.get("/routes/:id", resolveProfile, async (req, res, next) => {
  try {
    const route = await assertOwnedRoute((req.params.id as string), req.profileId!);
    if (!route) return res.status(404).json({ error: "not found" });
    res.json(route);
  } catch (err) {
    next(err);
  }
});

const patchRouteSchema = z.object({
  status: z.enum(["active", "paused"]).optional(),
  stepId: z.string().uuid().optional(),
  stepStatus: z.enum(["pending", "current", "done", "skipped"]).optional()
});

router.patch("/routes/:id", resolveProfile, async (req, res, next) => {
  try {
    const route = await assertOwnedRoute((req.params.id as string), req.profileId!);
    if (!route) return res.status(404).json({ error: "not found" });

    const parsed = patchRouteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    if (parsed.data.status) {
      await updateRouteStatus((req.params.id as string), parsed.data.status);
    }
    if (parsed.data.stepId && parsed.data.stepStatus) {
      await updateStepStatus(parsed.data.stepId, parsed.data.stepStatus);
    }

    res.json(await getRouteById((req.params.id as string)));
  } catch (err) {
    next(err);
  }
});

export default router;
