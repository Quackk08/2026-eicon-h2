import {
  checkInInputSchema,
  reflectionSchema,
  trustedContactInputSchema,
  type SyncOperation
} from "@renew/shared";
import { z } from "zod";
import { createCheckIn } from "../repositories/checkIns.js";
import { getOrCreateRhythm, updateRhythm } from "../repositories/checkinRhythms.js";
import { computeNextCheckinAt } from "../services/checkinScheduler.js";
import { createReflection } from "../repositories/reflections.js";
import { getMissionById, updateMissionStatus } from "../repositories/missions.js";
import { savePlace, unsavePlace } from "../repositories/savedPlaces.js";
import {
  createTrustedContact,
  deleteTrustedContact,
  updateTrustedContact
} from "../repositories/trustedContacts.js";

/**
 * A queued operation the server refuses to apply, for a reason retrying
 * will never fix — a malformed payload, or a mission that belongs to
 * someone else. These are marked `conflict` so the client can drop them
 * instead of retrying forever.
 */
export class SyncConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncConflictError";
  }
}

function parseOrConflict<T>(schema: z.ZodType<T>, payload: unknown, what: string): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new SyncConflictError(`invalid ${what} payload`);
  return parsed.data;
}

const savedPlacePayloadSchema = z.object({ placeId: z.string().min(1).max(200) });
const reflectionPayloadSchema = z.intersection(
  z.object({ missionId: z.string().uuid() }),
  reflectionSchema
);
const entityIdPayloadSchema = z.object({ id: z.string().uuid() });

/**
 * Replays one operation that was queued while the device was offline.
 *
 * Every branch goes through the same repositories the online routes use, so
 * an action taken offline lands in exactly the same shape as one taken
 * online — no second, laxer write path.
 */
export async function applyOperation(
  profileId: string,
  operation: SyncOperation
): Promise<void> {
  switch (operation.entityType) {
    case "check_in": {
      const input = parseOrConflict(checkInInputSchema, operation.payload, "check_in");
      await createCheckIn(profileId, input);

      const rhythm = await getOrCreateRhythm(profileId);
      const next = computeNextCheckinAt(new Date(), rhythm);
      await updateRhythm(profileId, {
        last_checkin_at: new Date().toISOString(),
        next_checkin_at: next ? next.toISOString() : null
      });
      return;
    }

    case "reflection": {
      const input = parseOrConflict(reflectionPayloadSchema, operation.payload, "reflection");
      const mission = await getMissionById(input.missionId);
      if (!mission || mission.profile_id !== profileId) {
        throw new SyncConflictError("mission not found for this profile");
      }

      await createReflection(mission.id, profileId, input);
      const statusMap = {
        completed: "completed",
        partially_completed: "partially_completed",
        not_today: "not_today"
      } as const;
      await updateMissionStatus(mission.id, statusMap[input.result]);
      return;
    }

    case "saved_place": {
      const { placeId } = parseOrConflict(
        savedPlacePayloadSchema,
        operation.payload,
        "saved_place"
      );
      if (operation.operation === "delete") await unsavePlace(profileId, placeId);
      else await savePlace(profileId, placeId);
      return;
    }

    case "trusted_contact": {
      if (operation.operation === "delete") {
        const { id } = parseOrConflict(
          entityIdPayloadSchema,
          operation.payload,
          "trusted_contact"
        );
        await deleteTrustedContact(profileId, id);
        return;
      }

      const input = parseOrConflict(
        trustedContactInputSchema,
        operation.payload,
        "trusted_contact"
      );
      if (operation.operation === "update") {
        const { id } = parseOrConflict(
          entityIdPayloadSchema,
          operation.payload,
          "trusted_contact"
        );
        const updated = await updateTrustedContact(profileId, id, input);
        if (!updated) throw new SyncConflictError("trusted contact no longer exists");
        return;
      }

      await createTrustedContact(profileId, input);
      return;
    }

    default:
      // Refusing unknown types keeps the queue from becoming a way to write
      // arbitrary rows; a client sending one is out of date, not offline.
      throw new SyncConflictError(`unsupported entity type: ${operation.entityType}`);
  }
}
