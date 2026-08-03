import { z } from "zod";

export const communityActivitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  domain: z.string().nullable(),
  startsAt: z.string().nullable(),
  isOnline: z.boolean(),
  location: z.string().nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  socialLoad: z.number().int().min(0).max(4).nullable(),
  maxParticipants: z.number().int().positive().nullable(),
  requiredItems: z.string().nullable()
});

export const participationStatusSchema = z.enum(["joined", "cancelled"]);

export type CommunityActivity = z.infer<typeof communityActivitySchema>;
export type ParticipationStatus = z.infer<typeof participationStatusSchema>;
