import { z } from "zod";

/**
 * Note there is no "failed" result. A step not done is "not_today" — the
 * product does not record failure (docs/PRODUCT_GUARDRAILS.md).
 */
export const reflectionSchema = z.object({
  result: z.enum(["completed", "partially_completed", "not_today"]),
  burden: z.number().int().min(0).max(4).nullable().optional(),
  socialMode: z.enum(["alone", "with_someone"]).nullable().optional(),
  wantRepeat: z.boolean().nullable().optional(),
  note: z.string().max(2000).nullable().optional()
});

export type ReflectionResult = z.infer<typeof reflectionSchema>["result"];
