import { Router } from "express";
import { z } from "zod";
import { countLabel, type ReasoningStep, type RecommendationResult, type StateVector } from "@renew/shared";
import { listVisions } from "../repositories/visions.js";
import { getLatestRouteForVision } from "../repositories/routes.js";
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
import { getActiveLongTermMission } from "../repositories/longTermMissions.js";
import { buildRuleBasedRecommendation, computeStateTags } from "../services/ruleEngine.js";
import { rerankWithGemini } from "../services/geminiAdapter.js";
import { isAIEnabled } from "../config/env.js";
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

    const [preferences, recentCheckIns, domainCandidates, route] = await Promise.all([
      getPreferences(req.profileId!),
      listRecentCheckIns(req.profileId!, 1),
      listActionTemplatesForProfile(req.profileId!, vision.domain),
      getLatestRouteForVision(vision.id)
    ]);

    if (recentCheckIns.length === 0) {
      return res.status(422).json({ error: "submit a check-in before requesting a recommendation" });
    }

    // A Vision with a Route has already chosen its ladder; recommending from
    // the whole domain could (and did) pick a template from a different
    // ladder, which the client can neither display against the Route nor
    // select — every choice then failed template validation.
    const routeTemplateIds = new Set((route?.steps ?? []).map((step) => step.template_id));
    const routeCandidates = domainCandidates.filter((candidate) => routeTemplateIds.has(candidate.id));
    const candidates = routeCandidates.length > 0 ? routeCandidates : domainCandidates;

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

    // The rule engine throws when nothing in the Route fits today's
    // capacity. That is a fact about the data, not a fault, and letting it
    // reach the error handler answered a 500 — which the client can only
    // read as "check your connection" while the connection is fine.
    let ruleResult;
    let ruleTrace;
    try {
      ({ result: ruleResult, trace: ruleTrace } = buildRuleBasedRecommendation(
        candidates,
        stateVector.functionalCapacity,
        stateTags,
        constraints,
        vision.summary
      ));
    } catch {
      return res.status(422).json({
        error: "No step in your Route fits today's capacity. Regenerate the Route, or check in again when more feels possible."
      });
    }

    // The Route narrowing happened above, before the rule engine saw
    // anything, so its step is prepended rather than produced there.
    const trace: ReasoningStep[] = [
      {
        key: "route",
        label: "Looked only at your Route",
        detail:
          routeCandidates.length > 0
            ? `Today's step comes from the ${countLabel(routeCandidates.length, "step")} of the Route you built, not from every action in the library.`
            : `Your Route has no steps yet, so the ${countLabel(domainCandidates.length, "reviewed step")} for this area were used instead.`,
        before: domainCandidates.length,
        after: candidates.length
      },
      ...ruleTrace
    ];

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

    /*
     * Said plainly, because it is the one step people most need to be able
     * to check. The model can only reorder steps that were already reviewed
     * and already passed every filter above — it cannot invent an action —
     * and when it is off or unreachable the rules stand on their own.
     */
    trace.push({
      key: "ai",
      label: source === "ai" ? "Ordering reviewed by AI" : "Decided by rules alone",
      detail:
        source === "ai"
          ? "An AI adjusted the wording and the order of these already-reviewed steps. It cannot add a step that was not on your Route."
          : isAIEnabled()
            ? "The AI pass did not return a usable answer, so the rules above decided this on their own."
            : "No AI was involved. The rules above decided this on their own."
    });

    const saved = await createRecommendation(req.profileId!, latestCheckIn.id, finalResult, source);
    res.status(201).json({ ...saved, stateTags, trace });
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

    // Stamped at selection so the Mission carries which longer goal it was
    // advancing, permanently. Reading it back from whatever happens to be
    // active later would silently re-attribute a month of finished work the
    // first time someone changed direction.
    const longTerm = await getActiveLongTermMission(req.profileId!);

    const mission = await createMission(
      req.profileId!,
      templateId,
      recommendation.id,
      parsed.data.routeStepId ?? null,
      selection?.result.selectedPlaceId ?? null,
      longTerm?.id ?? null
    );

    const place = selection ? await getPlaceById(selection.result.selectedPlaceId) : null;
    res.status(201).json({ ...mission, template, place, placeReason: selection?.result.userFacingReason ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
