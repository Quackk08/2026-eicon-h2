import { Router } from "express";
import { computeWeeklyInsightStats, buildRuleBasedWeeklySummary } from "../services/weeklyInsight.js";
import { summarizeWeeklyWithGemini } from "../services/geminiWeeklyAdapter.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/insights/weekly", resolveProfile, async (req, res, next) => {
  try {
    const stats = await computeWeeklyInsightStats(req.profileId!);
    const ruleResult = buildRuleBasedWeeklySummary(stats);

    let finalResult = ruleResult;
    let source: "rules" | "ai" = "rules";

    if (stats.hasEnoughData) {
      const aiResult = await summarizeWeeklyWithGemini(stats);
      if (aiResult) {
        finalResult = aiResult;
        source = "ai";
      }
    }

    res.json({ ...finalResult, source, stats });
  } catch (err) {
    next(err);
  }
});

export default router;
