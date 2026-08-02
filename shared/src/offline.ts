import { z } from "zod";
import { SYNC_STATUSES } from "./constants.js";

export const syncStatusSchema = z.enum(SYNC_STATUSES);

export const localRecordMetadataSchema = z.object({
  localId: z.string().min(1).max(100),
  contractVersion: z.number().int().positive(),
  updatedAt: z.string().datetime({ offset: true }),
  syncStatus: syncStatusSchema
});

export const syncOperationSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  entityType: z.string().min(1).max(100),
  entityLocalId: z.string().min(1).max(100),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
  retryCount: z.number().int().nonnegative()
});

export type SyncStatus = z.infer<typeof syncStatusSchema>;
export type LocalRecordMetadata = z.infer<typeof localRecordMetadataSchema>;
export type SyncOperation = z.infer<typeof syncOperationSchema>;
