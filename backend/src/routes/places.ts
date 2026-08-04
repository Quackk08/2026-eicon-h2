import { Router } from "express";
import { z } from "zod";
import { coarsenCoordinate } from "@renew/shared";
import { getActionTemplateById } from "../repositories/actionTemplates.js";
import { listAllPlaces } from "../repositories/places.js";
import { getPreferences } from "../repositories/preferences.js";
import { selectPlaceForTemplate } from "../services/placeSelection.js";
import { suggestNearbyPlaces } from "../services/nearbySuggestions.js";
import { suggestPlaceTip } from "../services/placeTips.js";
import { maxCostLevelFrom } from "../services/ruleEngine.js";
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

    // A home or online action needs no place at all, which is not the same
    // as failing to find one. Collapsing the two told people nothing fit
    // when nothing was ever required.
    const needsPlace = template.placeTypes.some((type) => type !== "home" && type !== "online");
    if (!needsPlace) {
      return res.json({ needsPlace: false, reason: "this action happens at home or online" });
    }

    const selection = await selectPlaceForTemplate(req.profileId!, template);
    if (!selection) {
      return res.status(422).json({ error: "no reviewed place fits this action and your conditions" });
    }

    const selected = selection.candidates.find((c) => c.id === selection.result.selectedPlaceId);
    const preferences = await getPreferences(req.profileId!);
    const tip = selected
      ? await suggestPlaceTip({
          actionTitle: template.title,
          placeName: selected.name,
          placeCategory: selected.category,
          maxCostLevel: maxCostLevelFrom(preferences?.max_cost ?? 0)
        }).catch(() => null)
      : null;

    res.json({
      ...selection.result,
      needsPlace: true,
      source: selection.source,
      candidates: selection.candidates,
      tip
    });
  } catch (err) {
    next(err);
  }
});

const nearbyQuerySchema = z.object({
  templateId: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

/**
 * Reviewed places first, then venues the model believes are nearby.
 *
 * The suggestions have had no human check, so they are returned under a
 * separate key and flagged — the client must not mix them into the reviewed
 * list. Coordinates are coarsened before they reach the model and are never
 * stored (PRODUCT_GUARDRAILS.md: no precise location in logs).
 */
router.get("/places/nearby", resolveProfile, async (req, res, next) => {
  try {
    const parsed = nearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const template = await getActionTemplateById(parsed.data.templateId);
    if (!template) return res.status(404).json({ error: "action template not found" });

    const placeTypes = template.placeTypes.filter((type) => type !== "home" && type !== "online");
    if (placeTypes.length === 0) {
      return res.json({ needsPlace: false, reviewed: [], suggested: [] });
    }

    const preferences = await getPreferences(req.profileId!);
    const reviewedSelection = await selectPlaceForTemplate(req.profileId!, template);

    const suggested = await suggestNearbyPlaces({
      location: {
        latitude: coarsenCoordinate(parsed.data.latitude),
        longitude: coarsenCoordinate(parsed.data.longitude)
      },
      actionTitle: template.title,
      placeTypes,
      maxWalkMinutes: Math.min(preferences?.max_minutes ?? 20, 30),
      maxCostLevel: maxCostLevelFrom(preferences?.max_cost ?? 0)
    }).catch(() => null);

    res.json({
      needsPlace: true,
      reviewed: reviewedSelection?.candidates ?? [],
      reviewedPick: reviewedSelection?.result ?? null,
      suggested: suggested ?? [],
      // Says plainly what the client must show alongside them.
      suggestedAreUnreviewed: true
    });
  } catch (err) {
    next(err);
  }
});

export default router;
