import { Router } from "express";
import { z } from "zod";
import { syncOperationSchema, type SyncStatus } from "@renew/shared";
import { claimOperation, findOperation, markOperation } from "../repositories/syncOperations.js";
import { SyncConflictError, applyOperation } from "../services/syncApplier.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

const syncRequestSchema = z.object({
  operations: z.array(syncOperationSchema).max(200)
});

interface OperationResult {
  idempotencyKey: string;
  status: Extract<SyncStatus, "synced" | "failed" | "conflict">;
  error?: string;
}

/**
 * Drains the client's offline queue.
 *
 * Operations are applied in the order they were queued, because a
 * Reflection can depend on a Mission an earlier operation touched. One
 * failure does not abort the batch: the rest still apply and the client is
 * told per-operation what happened, so a single bad record cannot block
 * every Check-In behind it.
 */
router.post("/sync", resolveProfile, async (req, res, next) => {
  try {
    const parsed = syncRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const results: OperationResult[] = [];

    for (const operation of parsed.data.operations) {
      // Replay protection. A queued write may have reached the server
      // before the connection dropped, with only the response lost, so the
      // client will send it again — applying it twice would double-record
      // a Check-In the person only made once.
      const existing = await findOperation(operation.idempotencyKey);
      if (existing) {
        if (existing.profile_id !== req.profileId) {
          results.push({
            idempotencyKey: operation.idempotencyKey,
            status: "conflict",
            error: "operation belongs to another profile"
          });
          continue;
        }
        results.push({
          idempotencyKey: operation.idempotencyKey,
          status: existing.status === "synced" ? "synced" : "conflict",
          error: existing.status === "synced" ? undefined : "already processed"
        });
        continue;
      }

      try {
        await claimOperation(req.profileId!, operation);
      } catch {
        // Another in-flight request claimed the same key first; treat it as
        // already handled rather than racing it.
        results.push({
          idempotencyKey: operation.idempotencyKey,
          status: "conflict",
          error: "already claimed"
        });
        continue;
      }

      try {
        await applyOperation(req.profileId!, operation);
        await markOperation(operation.idempotencyKey, "synced");
        results.push({ idempotencyKey: operation.idempotencyKey, status: "synced" });
      } catch (err) {
        const conflict = err instanceof SyncConflictError;
        await markOperation(operation.idempotencyKey, conflict ? "conflict" : "failed");
        results.push({
          idempotencyKey: operation.idempotencyKey,
          status: conflict ? "conflict" : "failed",
          error: conflict ? err.message : "could not be applied"
        });
      }
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
