import { Router } from "express";
import { z } from "zod";
import {
  createReflection,
  listRecentReflections,
  type ReflectionInput
} from "../repositories/reflections.js";
import {
  getMissionById,
  getTodayMission,
  listMissionsForProfile,
  switchMissionTemplate,
  updateMissionStatus
} from "../repositories/missions.js";
import { getActionTemplateById, listActionTemplatesInLadderGroup } from "../repositories/actionTemplates.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/missions", resolveProfile, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const missions = await listMissionsForProfile(req.profileId!, limit);
    const withTemplates = await Promise.all(
      missions.map(async (mission) => ({ ...mission, template: await getActionTemplateById(mission.template_id) }))
    );
    res.json(withTemplates);
  } catch (err) {
    next(err);
  }
});

router.get("/reflections", resolveProfile, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(await listRecentReflections(req.profileId!, limit));
  } catch (err) {
    next(err);
  }
});

router.get("/missions/today", resolveProfile, async (req, res, next) => {
  try {
    const mission = await getTodayMission(req.profileId!);
    if (!mission) return res.json(null);
    const template = await getActionTemplateById(mission.template_id);
    res.json({ ...mission, template });
  } catch (err) {
    next(err);
  }
});

const adaptSchema = z.object({
  direction: z.enum(["smaller", "bigger"]).optional(),
  templateId: z.string().min(1).optional()
});

/**
 * "smaller"/"bigger" step within the same reviewed Activity Ladder group —
 * never a freely invented action. An explicit templateId is only accepted
 * if it belongs to the same ladder group, for the same reason.
 */
router.post("/missions/:id/adapt", resolveProfile, async (req, res, next) => {
  try {
    const mission = await getMissionById((req.params.id as string));
    if (!mission || mission.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });

    const parsed = adaptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const currentTemplate = await getActionTemplateById(mission.template_id);
    if (!currentTemplate) return res.status(422).json({ error: "current mission template no longer exists" });

    const siblings = await listActionTemplatesInLadderGroup(currentTemplate.ladderGroupId);

    let targetTemplateId: string | undefined;
    if (parsed.data.templateId) {
      const target = siblings.find((s) => s.id === parsed.data.templateId);
      if (!target) return res.status(400).json({ error: "templateId must be in the same ladder group" });
      targetTemplateId = target.id;
    } else if (parsed.data.direction === "smaller") {
      const smaller = siblings
        .filter((s) => s.ladderLevel < currentTemplate.ladderLevel)
        .sort((a, b) => b.ladderLevel - a.ladderLevel)[0];
      if (!smaller) return res.status(422).json({ error: "already at the smallest step in this ladder" });
      targetTemplateId = smaller.id;
    } else if (parsed.data.direction === "bigger") {
      const bigger = siblings
        .filter((s) => s.ladderLevel > currentTemplate.ladderLevel)
        .sort((a, b) => a.ladderLevel - b.ladderLevel)[0];
      if (!bigger) return res.status(422).json({ error: "already at the largest step in this ladder" });
      targetTemplateId = bigger.id;
    } else {
      return res.status(400).json({ error: "direction or templateId required" });
    }

    const updated = await switchMissionTemplate(mission.id, targetTemplateId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const reflectionSchema = z.object({
  result: z.enum(["completed", "partially_completed", "not_today"]),
  burden: z.number().int().min(0).max(4).nullable().optional(),
  socialMode: z.enum(["alone", "with_someone"]).nullable().optional(),
  wantRepeat: z.boolean().nullable().optional(),
  note: z.string().max(2000).nullable().optional()
});

function suggestNext(result: string, burden: number | null | undefined): string {
  if (result === "partially_completed") {
    return "Next time will start from the part you finished, one level smaller.";
  }
  if (result === "completed" && (burden ?? 0) >= 3) {
    return "The same step stays available to repeat at this size.";
  }
  if (result === "completed") return "A slightly larger step becomes available next time.";
  return "Leaving this for another day is fine — it is not recorded as a failure.";
}

router.post("/missions/:id/reflection", resolveProfile, async (req, res, next) => {
  try {
    const mission = await getMissionById((req.params.id as string));
    if (!mission || mission.profile_id !== req.profileId) return res.status(404).json({ error: "not found" });

    const parsed = reflectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const input: ReflectionInput = parsed.data;
    const reflection = await createReflection(mission.id, req.profileId!, input);

    const statusMap = {
      completed: "completed",
      partially_completed: "partially_completed",
      not_today: "not_today"
    } as const;
    await updateMissionStatus(mission.id, statusMap[input.result]);

    res.status(201).json({ reflection, suggestion: suggestNext(input.result, input.burden) });
  } catch (err) {
    next(err);
  }
});

export default router;
