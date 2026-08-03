import { Router } from "express";
import { z } from "zod";
import {
  getVisibleActionTemplate,
  listVisibleActionTemplates
} from "../repositories/actionTemplates.js";
import { reportActionTemplate } from "../repositories/generatedLadderLog.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

/**
 * The seed library plus this person's own generated ladder, fetched in one
 * request rather than one per route step.
 *
 * Scoped to the caller: generated steps are written from someone's Vision,
 * so serving the whole table here would hand every user's ladder to
 * everybody else.
 */
router.get("/action-templates", resolveProfile, async (req, res, next) => {
  try {
    res.json(await listVisibleActionTemplates(req.profileId!));
  } catch (err) {
    next(err);
  }
});

router.get("/action-templates/:id", resolveProfile, async (req, res, next) => {
  try {
    const template = await getVisibleActionTemplate(req.profileId!, req.params.id as string);
    // Another profile's generated step is "not found" rather than
    // "forbidden", so this cannot be used to probe for their step ids.
    if (!template) return res.status(404).json({ error: "not found" });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({ reason: z.string().min(1).max(1000) });

/**
 * Lets someone flag a step that should not have been suggested. Generated
 * steps ship without prior human review, so this is the path by which a bad
 * one gets seen by a person.
 */
router.post("/action-templates/:id/report", resolveProfile, async (req, res, next) => {
  try {
    const templateId = req.params.id as string;
    // Same visibility rule as reading: you can only report a step you were
    // actually shown.
    const template = await getVisibleActionTemplate(req.profileId!, templateId);
    if (!template) return res.status(404).json({ error: "not found" });

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const report = await reportActionTemplate(templateId, req.profileId!, parsed.data.reason);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
