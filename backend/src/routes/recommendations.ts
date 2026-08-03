import { Router } from "express";
import { z } from "zod";
import type { RecommendationResult, StateVector } from "@renew/shared";
import { listVisions } from "../repositories/visions.js";
import { getPreferences } from "../repositories/preferences.js";
import { listRecentCheckIns, type CheckInRow } from "../repositories/checkIns.js";
import {
  getActionTemplateById,
  listActionTemplatesForProfile
} from "../repositories/actionTemplates.js";
import { getPlaceById } from "../repositories/places.js";
import { selectPlaceForTemplate } from "../services/placeSelection.js";
import {
  createRecommendation,
  getLatestRecommendation,
  getRecommendationById
} from "../repositories/recommendations.js";
import { createMission } from "../repositories/missions.js";
import { buildRuleBasedRecommendation, computeStateTags } from "../services/ruleEngine.js";
import { rerankWithGemini } from "../services/geminiAdapter.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

function toStateVector(row: CheckInRow): StateVector {
  return {
    mood: row.mood,
    energy: row.energy,
    stress: row.stress,
    sleepQuality: row.sleep_quality,
    loneliness: row.loneliness,
    socialLoad: row.social_load,
    initiationDifficulty: row.initiation_difficulty,
    functionalCapacity: row.functional_capacity,
    craving: row.craving
  };
}

const dailyRequestSchema = z.object({
  visionId: z.string().uuid().optional()
});

router.post("/recommendations/daily", resolveProfile, async (req, res, next) => {
  try {
    const parsed = dailyRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const visions = await listVisions(req.profileId!);
    const vision = parsed.data.visionId
      ? visions.find((v) => v.id === parsed.data.visionId)
      : visions.find((v) => v.status === "active");
    if (!vision) return res.status(422).json({ error: "no active life vision found" });

    const [preferences, recentCheckIns, candidates] = await Promise.all([
      getPreferences(req.profileId!),
      listRecentCheckIns(req.profileId!, 1),
      listActionTemplatesForProfile(req.profileId!, vision.domain)
    ]);

    if (recentCheckIns.length === 0) {
      return res.status(422).json({ error: "submit a check-in before requesting a recommendation" });
    }
    if (candidates.length === 0) {
      return res.status(422).json({ error: "no reviewed action templates for this domain yet" });
    }

    const latestCheckIn = recentCheckIns[0];
    const stateVector = toStateVector(latestCheckIn);
    const stateTags = computeStateTags(stateVector);

    // functionalCapacity is a required field on every check-in input; null
    // here would mean corrupt data, not a normal "missing value" case.
    if (stateVector.functionalCapacity === null) {
      return res.status(422).json({ error: "latest check-in is missing functionalCapacity" });
    }

    const constraints = {
      maxMinutes: preferences?.max_minutes ?? 30,
      maxDistanceMeters: preferences?.max_distance_meters ?? 2000,
      maxCost: preferences?.max_cost ?? 0,
      socialPreference: preferences?.social_preference ?? ("low" as const),
      accessibilityNeeds: preferences?.accessibility_needs ?? []
    };

    const ruleResult = buildRuleBasedRecommendation(
      candidates,
      stateVector.functionalCapacity,
      stateTags,
      constraints,
      vision.summary
    );

    let finalResult: RecommendationResult = ruleResult;
    let source: "rules" | "ai" = "rules";

    const aiResult = await rerankWithGemini({
      visionSummary: vision.summary,
      stateTags,
      ruleResult,
      candidates: candidates.map((c) => ({ templateId: c.id, title: c.title, ruleScore: 1 }))
    });
    if (aiResult) {
      finalResult = aiResult;
      source = "ai";
    }

    const saved = await createRecommendation(req.profileId!, latestCheckIn.id, finalResult, source);
    res.status(201).json({ ...saved, stateTags });
  } catch (err) {
    next(err);
  }
});

/**
 * The recommendation already produced for this profile. Reading is separate
 * from POST /recommendations/daily so that simply opening a page does not
 * mint a new recommendation row on every load.
 */
router.get("/recommendations/latest", resolveProfile, async (req, res, next) => {
  try {
    res.json(await getLatestRecommendation(req.profileId!));
  } catch (err) {
    next(err);
  }
});

const selectSchema = z.object({
  templateId: z.string().min(1).optional(),
  routeStepId: z.string().uuid().optional()
});

router.post("/recommendations/:id/select", resolveProfile, async (req, res, next) => {
  try {
    const recommendation = await getRecommendationById((req.params.id as string));
    if (!recommendation || recommendation.profile_id !== req.profileId) {
      return res.status(404).json({ error: "not found" });
    }

    const parsed = selectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const allowedTemplateIds = new Set(
      [
        recommendation.selected_template_id,
        recommendation.smaller_template_id,
        recommendation.extension_template_id
      ].filter((id): id is string => id !== null)
    );
    const templateId = parsed.data.templateId ?? recommendation.selected_template_id;
    if (!allowedTemplateIds.has(templateId)) {
      return res.status(400).json({ error: "templateId must be one of the recommendation's own options" });
    }

    // Resolve the place at selection time so the Mission arrives with a real
    // location instead of a bare category name.
    const template = await getActionTemplateById(templateId);
    const selection = template ? await selectPlaceForTemplate(req.profileId!, template) : null;

    const mission = await createMission(
      req.profileId!,
      templateId,
      recommendation.id,
      parsed.data.routeStepId ?? null,
      selection?.result.selectedPlaceId ?? null
    );

    const place = selection ? await getPlaceById(selection.result.selectedPlaceId) : null;
    res.status(201).json({ ...mission, template, place, placeReason: selection?.result.userFacingReason ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
