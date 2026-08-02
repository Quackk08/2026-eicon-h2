import { Router } from "express";
import { getPreferences } from "../repositories/preferences.js";
import { getActionTemplateById } from "../repositories/actionTemplates.js";
import { listPlacesByCategories } from "../repositories/places.js";
import { buildRuleBasedPlaceRecommendation } from "../services/placeRuleEngine.js";
import { rerankPlaceWithGemini } from "../services/geminiPlaceAdapter.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/places/search", resolveProfile, async (req, res, next) => {
  try {
    const templateId = req.query.templateId;
    if (typeof templateId !== "string" || !templateId) {
      return res.status(400).json({ error: "templateId query param required" });
    }

    const template = await getActionTemplateById(templateId);
    if (!template) return res.status(404).json({ error: "action template not found" });
    if (template.placeTypes.length === 0) {
      return res.status(422).json({ error: "this action has no associated place types" });
    }

    const [preferences, candidates] = await Promise.all([
      getPreferences(req.profileId!),
      listPlacesByCategories(template.placeTypes)
    ]);

    if (candidates.length === 0) {
      return res.status(422).json({ error: "no reviewed places for this action type yet" });
    }

    const constraints = {
      maxMinutes: preferences?.max_minutes ?? 30,
      maxDistanceMeters: preferences?.max_distance_meters ?? 2000,
      maxCost: preferences?.max_cost ?? 0,
      socialPreference: preferences?.social_preference ?? ("low" as const),
      accessibilityNeeds: preferences?.accessibility_needs ?? []
    };

    const ruleResult = buildRuleBasedPlaceRecommendation(candidates, template.placeTypes, constraints, template.title);

    let finalResult = ruleResult;
    let source: "rules" | "ai" = "rules";

    const aiResult = await rerankPlaceWithGemini({
      templateTitle: template.title,
      ruleResult,
      candidates: candidates.map((c) => ({ placeId: c.id, name: c.name, category: c.category, ruleScore: 1 }))
    });
    if (aiResult) {
      finalResult = aiResult;
      source = "ai";
    }

    res.json({ ...finalResult, source, candidates });
  } catch (err) {
    next(err);
  }
});

export default router;
