import { Router } from "express";
import { getActionTemplateById } from "../repositories/actionTemplates.js";
import { listAllPlaces } from "../repositories/places.js";
import { selectPlaceForTemplate } from "../services/placeSelection.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/places", async (_req, res, next) => {
  try {
    res.json(await listAllPlaces());
  } catch (err) {
    next(err);
  }
});

router.get("/places/search", resolveProfile, async (req, res, next) => {
  try {
    const templateId = req.query.templateId;
    if (typeof templateId !== "string" || !templateId) {
      return res.status(400).json({ error: "templateId query param required" });
    }

    const template = await getActionTemplateById(templateId);
    if (!template) return res.status(404).json({ error: "action template not found" });

    const selection = await selectPlaceForTemplate(req.profileId!, template);
    if (!selection) {
      return res.status(422).json({ error: "no reviewed place fits this action and your conditions" });
    }

    res.json({ ...selection.result, source: selection.source, candidates: selection.candidates });
  } catch (err) {
    next(err);
  }
});

export default router;
