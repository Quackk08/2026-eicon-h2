import { Router } from "express";
import { z } from "zod";
import {
  addRouteStep,
  deleteRouteStep,
  getRouteById,
  getRouteStepById,
  reorderRouteSteps,
  replaceRouteStepTemplate,
  updateRouteStatus,
  updateStepStatus
} from "../repositories/routes.js";
import { getVisionById } from "../repositories/visions.js";
import {
  createUserRouteTemplate,
  deleteUserRouteTemplate,
  getVisibleActionTemplate
} from "../repositories/actionTemplates.js";
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
      // Owning the route is not the same as owning this step, and
      // updateStepStatus matches on the step id alone. Without this, any
      // route id of one's own was enough to set the status of a step on
      // someone else's route. The sibling step endpoints below already
      // make exactly this check.
      const step = await getRouteStepById(parsed.data.stepId);
      if (!step || step.route_id !== route.id) {
        return res.status(404).json({ error: "step not found" });
      }
      await updateStepStatus(step.id, parsed.data.stepStatus);
    }

    res.json(await getRouteById((req.params.id as string)));
  } catch (err) {
    next(err);
  }
});

const editableStepSchema = z.object({
  title: z.string().trim().min(1).max(160),
  durationMinutes: z.number().int().min(1).max(180),
  placeType: z.string().trim().min(1).max(80)
});

router.post("/routes/:id/steps", resolveProfile, async (req, res, next) => {
  try {
    const route = await assertOwnedRoute(req.params.id as string, req.profileId!);
    if (!route) return res.status(404).json({ error: "not found" });
    const parsed = editableStepSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const vision = await getVisionById(route.vision_id);
    if (!vision) return res.status(404).json({ error: "vision not found" });

    const level = route.steps.length + 1;
    const template = await createUserRouteTemplate({
      profileId: req.profileId!,
      domain: vision.domain,
      routeId: route.id,
      level,
      ...parsed.data
    });
    await addRouteStep(route.id, template.id, route.steps.length, level);
    res.status(201).json(await getRouteById(route.id));
  } catch (err) {
    next(err);
  }
});

router.patch("/routes/:id/steps/:stepId", resolveProfile, async (req, res, next) => {
  try {
    const route = await assertOwnedRoute(req.params.id as string, req.profileId!);
    if (!route) return res.status(404).json({ error: "not found" });
    const step = await getRouteStepById(req.params.stepId as string);
    if (!step || step.route_id !== route.id) return res.status(404).json({ error: "step not found" });
    const parsed = editableStepSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const vision = await getVisionById(route.vision_id);
    if (!vision) return res.status(404).json({ error: "vision not found" });
    const original = await getVisibleActionTemplate(req.profileId!, step.template_id);

    const template = await createUserRouteTemplate({
      profileId: req.profileId!,
      domain: vision.domain,
      routeId: route.id,
      ladderGroupId: original?.ladderGroupId,
      level: step.sequence + 1,
      ...parsed.data
    });
    await replaceRouteStepTemplate(step.id, template.id, step.sequence + 1);
    if (original?.source === "user") {
      await deleteUserRouteTemplate(req.profileId!, original.id);
    }
    res.json(await getRouteById(route.id));
  } catch (err) {
    next(err);
  }
});

const reorderSchema = z.object({ stepIds: z.array(z.string().uuid()).min(1).max(20) });

router.patch("/routes/:id/steps", resolveProfile, async (req, res, next) => {
  try {
    const route = await assertOwnedRoute(req.params.id as string, req.profileId!);
    if (!route) return res.status(404).json({ error: "not found" });
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    await reorderRouteSteps(route.id, parsed.data.stepIds);
    res.json(await getRouteById(route.id));
  } catch (err) {
    if (err instanceof Error && err.message.includes("stepIds")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

router.delete("/routes/:id/steps/:stepId", resolveProfile, async (req, res, next) => {
  try {
    const route = await assertOwnedRoute(req.params.id as string, req.profileId!);
    if (!route) return res.status(404).json({ error: "not found" });
    const step = await getRouteStepById(req.params.stepId as string);
    if (!step || step.route_id !== route.id) return res.status(404).json({ error: "step not found" });
    const template = await getVisibleActionTemplate(req.profileId!, step.template_id);
    await deleteRouteStep(route.id, step.id);
    if (template?.source === "user") {
      await deleteUserRouteTemplate(req.profileId!, template.id);
    }
    res.json(await getRouteById(route.id));
  } catch (err) {
    next(err);
  }
});

export default router;
