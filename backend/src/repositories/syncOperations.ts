import { supabase } from "../supabase/client.js";
import type { SyncOperation, SyncStatus } from "@renew/shared";

export interface SyncOperationRow {
  idempotency_key: string;
  profile_id: string;
  entity_type: string;
  entity_local_id: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  created_at: string;
  processed_at: string | null;
}

/**
 * Looks up an operation the client has sent before.
 *
 * This is what makes replay safe: a queued write that actually reached the
 * server but whose response was lost offline will be sent again, and must
 * not be applied twice.
 */
export async function findOperation(
  idempotencyKey: string
): Promise<SyncOperationRow | null> {
  const { data, error } = await supabase
    .from("sync_operations")
    .select()
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return (data as SyncOperationRow) ?? null;
}

export async function claimOperation(
  profileId: string,
  operation: SyncOperation
): Promise<void> {
  const { error } = await supabase.from("sync_operations").insert({
    idempotency_key: operation.idempotencyKey,
    profile_id: profileId,
    entity_type: operation.entityType,
    entity_local_id: operation.entityLocalId,
    operation: operation.operation,
    payload: operation.payload,
    status: "syncing",
    retry_count: operation.retryCount,
    created_at: operation.createdAt
  });
  if (error) throw error;
}

export async function markOperation(
  idempotencyKey: string,
  status: Extract<SyncStatus, "synced" | "failed" | "conflict">
): Promise<void> {
  const { error } = await supabase
    .from("sync_operations")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("idempotency_key", idempotencyKey);
  if (error) throw error;
}
