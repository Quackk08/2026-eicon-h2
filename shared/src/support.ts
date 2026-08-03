import { z } from "zod";

export const trustedContactInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  relationship: z.string().trim().max(80).nullish(),
  // Kept loose on purpose: international formats vary, and rejecting a
  // number someone actually uses would cut them off from their own
  // support contact. The device's phone app is the real validator.
  phone: z.string().trim().min(3).max(40).nullish()
});

export const supportChannelSchema = z.enum(["sms", "tel"]);

/**
 * Logged only after the person approves the handoff preview. ReNew never
 * sends the message itself — it hands off to the device's SMS or phone app.
 */
export const supportMessageInputSchema = z.object({
  trustedContactId: z.string().uuid().nullish(),
  channel: supportChannelSchema,
  messagePreview: z.string().trim().min(1).max(2000),
  includedData: z.array(z.string().max(200)).max(50).default([]),
  excludedData: z.array(z.string().max(200)).max(50).default([])
});

export type TrustedContactInput = z.infer<typeof trustedContactInputSchema>;
export type SupportChannel = z.infer<typeof supportChannelSchema>;
export type SupportMessageInput = z.infer<typeof supportMessageInputSchema>;
