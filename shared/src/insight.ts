import { z } from "zod";

export const weeklyInsightStatsSchema = z.object({
  windowDays: z.literal(7),
  hasEnoughData: z.boolean(),
  checkInCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  partiallyCompletedCount: z.number().int().nonnegative(),
  notTodayCount: z.number().int().nonnegative(),
  avgBurden: z.number().nullable(),
  mostFrequentTemplateId: z.string().nullable(),
  lowestBurdenTemplateId: z.string().nullable(),
  mostPostponedTemplateId: z.string().nullable(),
  communityParticipationCount: z.number().int().nonnegative(),
  moodThisWeek: z.number().nullable(),
  moodPriorWeek: z.number().nullable(),
  energyThisWeek: z.number().nullable(),
  energyPriorWeek: z.number().nullable()
});

export const weeklyInsightResultSchema = z.object({
  contractVersion: z.literal(1),
  summary: z.string().min(1).max(800),
  maintainedNote: z.string().max(500).nullable(),
  adjustmentSuggestion: z.string().max(500).nullable()
});

export type WeeklyInsightStats = z.infer<typeof weeklyInsightStatsSchema>;
export type WeeklyInsightResult = z.infer<typeof weeklyInsightResultSchema>;
