import { databasePromise, type OutboxOperation } from "../data/appData";
import { api, ApiError } from "./client";

type OperationDraft = Omit<OutboxOperation, "idempotencyKey" | "createdAt" | "retryCount">;

interface SyncResult {
  idempotencyKey: string;
  status: "synced" | "failed" | "conflict";
  error?: string;
}

/**
 * Records a write that could not reach the server, so it can be replayed
 * later. The key is generated here and reused on every retry — that is what
 * lets the server recognise a replay and refuse to apply it twice.
 */
export async function enqueue(draft: OperationDraft): Promise<void> {
  const database = await databasePromise;
  await database.put("outbox", {
    ...draft,
    idempotencyKey: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0
  });
}

export async function pendingCount(): Promise<number> {
  const database = await databasePromise;
  return database.count("outbox");
}

let flushing = false;

/**
 * Sends everything queued, oldest first, and clears what the server
 * accepted.
 *
 * Operations the server rejects as `conflict` are dropped too: they are
 * malformed or refer to something that no longer exists, so retrying would
 * block every later write behind them forever. Anything that merely
 * `failed` stays queued for the next attempt.
 *
 * Returns the number of operations still waiting.
 */
export async function flushQueue(): Promise<number> {
  if (flushing) return pendingCount();
  flushing = true;

  try {
    const database = await databasePromise;
    const operations = (await database.getAll("outbox")).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    if (operations.length === 0) return 0;

    let response: { results: SyncResult[] };
    try {
      response = await api.post<{ results: SyncResult[] }>("/sync", { operations });
    } catch (error) {
      // Still offline, or the server is down. Bump retry counts so a
      // permanently stuck operation is visible rather than silent.
      if (!(error instanceof ApiError) || error.status >= 500) {
        const transaction = database.transaction("outbox", "readwrite");
        await Promise.all(
          operations.map((operation) =>
            transaction.store.put({ ...operation, retryCount: operation.retryCount + 1 })
          )
        );
        await transaction.done;
      }
      return operations.length;
    }

    const settled = response.results
      .filter((result) => result.status === "synced" || result.status === "conflict")
      .map((result) => result.idempotencyKey);

    const transaction = database.transaction("outbox", "readwrite");
    await Promise.all(settled.map((key) => transaction.store.delete(key)));
    await transaction.done;

    return database.count("outbox");
  } finally {
    flushing = false;
  }
}

/**
 * Runs a write, and queues it instead of losing it when the network is the
 * reason it failed. A 4xx means the server understood and refused, so
 * retrying it unchanged would never help — those still throw.
 */
export async function writeOrQueue(
  send: () => Promise<unknown>,
  draft: OperationDraft
): Promise<{ queued: boolean }> {
  try {
    await send();
    return { queued: false };
  } catch (error) {
    const isRejection = error instanceof ApiError && error.status >= 400 && error.status < 500;
    if (isRejection) throw error;

    await enqueue(draft);
    return { queued: true };
  }
}
