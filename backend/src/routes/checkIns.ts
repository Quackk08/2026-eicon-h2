import { Router } from "express";
import { checkInInputSchema, type StateVector } from "@renew/shared";
import { createCheckIn, listRecentCheckIns, type CheckInRow } from "../repositories/checkIns.js";
import { z } from "zod";
import {
  getOrCreateRhythm,
  updateRhythm,
  type CheckinRhythmRow
} from "../repositories/checkinRhythms.js";
import { computeNextCheckinAt } from "../services/checkinScheduler.js";
import { computeStateTags } from "../services/ruleEngine.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function toRhythmResponse(row: CheckinRhythmRow) {
  const frequency =
    row.rhythm_type === "weekdays" || row.rhythm_type === "weekly" || row.rhythm_type === "custom"
      ? row.rhythm_type
      : "daily";
  const days =
    frequency === "daily"
      ? [0, 1, 2, 3, 4, 5, 6]
      : frequency === "weekdays"
        ? [1, 2, 3, 4, 5]
        : frequency === "weekly"
          ? [Math.max(0, DAY_NAMES.indexOf((row.specific_day ?? "mon") as (typeof DAY_NAMES)[number]))]
          : (row.specific_day ?? "")
              .split(",")
              .map(Number)
              .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  return {
    frequency,
    days,
    time: row.preferred_time ?? "19:00",
    enabled: !row.paused_until || new Date(row.paused_until).getTime() <= Date.now(),
    nextCheckInAt: row.next_checkin_at,
    lastCheckInAt: row.last_checkin_at
  };
}

router.get("/check-in-rhythm", resolveProfile, async (req, res, next) => {
  try {
    res.json(toRhythmResponse(await getOrCreateRhythm(req.profileId!)));
  } catch (err) {
    next(err);
  }
});

const rhythmSchema = z.object({
  frequency: z.enum(["daily", "weekdays", "weekly", "custom"]),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  enabled: z.boolean()
});

router.patch("/check-in-rhythm", resolveProfile, async (req, res, next) => {
  try {
    const parsed = rhythmSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    await getOrCreateRhythm(req.profileId!);

    const specificDay =
      parsed.data.frequency === "weekly"
        ? DAY_NAMES[parsed.data.days[0]]
        : parsed.data.frequency === "custom"
          ? [...new Set(parsed.data.days)].sort((a, b) => a - b).join(",")
          : null;
    const settings = {
      rhythm_type: parsed.data.frequency,
      interval_days: null,
      specific_day: specificDay,
      preferred_time: parsed.data.time,
      paused_until: parsed.data.enabled ? null : "9999-12-31T23:59:59.999Z"
    } as const;
    const next = computeNextCheckinAt(new Date(), settings);
    const updated = await updateRhythm(req.profileId!, {
      ...settings,
      next_checkin_at: next?.toISOString() ?? null
    });
    res.json(toRhythmResponse(updated));
  } catch (err) {
    next(err);
  }
});

router.get("/check-ins", resolveProfile, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(await listRecentCheckIns(req.profileId!, limit));
  } catch (err) {
    next(err);
  }
});

router.post("/check-ins", resolveProfile, async (req, res, next) => {
  try {
    const parsed = checkInInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const checkIn = await createCheckIn(req.profileId!, parsed.data);

    const rhythm = await getOrCreateRhythm(req.profileId!);
    const next = computeNextCheckinAt(new Date(), rhythm);
    await updateRhythm(req.profileId!, {
      last_checkin_at: new Date().toISOString(),
      next_checkin_at: next ? next.toISOString() : null
    });

    res.status(201).json(checkIn);
  } catch (err) {
    next(err);
  }
});

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

function average(rows: CheckInRow[], key: keyof CheckInRow): number | null {
  const values = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null;
}

/**
 * Compares the latest check-in to the user's OWN recent history — never to
 * other users — and says so explicitly when there isn't enough of it yet.
 */
router.get("/state/summary", resolveProfile, async (req, res, next) => {
  try {
    const recent = await listRecentCheckIns(req.profileId!, 30);
    if (recent.length === 0) {
      return res.json({ hasEnoughData: false, message: "No Check-Ins recorded yet.", stateTags: [] });
    }

    const latest = recent[0];
    const stateTags = computeStateTags(toStateVector(latest));

    if (recent.length < 3) {
      return res.json({
        hasEnoughData: false,
        message: "There is not enough recorded history yet to compare against your own recent pattern.",
        latestCheckIn: latest,
        stateTags
      });
    }

    const prior = recent.slice(1);
    res.json({
      hasEnoughData: true,
      latestCheckIn: latest,
      stateTags,
      baseline: {
        mood: average(prior, "mood"),
        energy: average(prior, "energy"),
        functionalCapacity: average(prior, "functional_capacity"),
        stress: average(prior, "stress"),
        sleepQuality: average(prior, "sleep_quality"),
        loneliness: average(prior, "loneliness")
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
