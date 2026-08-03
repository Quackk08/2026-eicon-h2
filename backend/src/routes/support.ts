import { Router } from "express";
import { supportMessageInputSchema, trustedContactInputSchema } from "@renew/shared";
import {
  createTrustedContact,
  deleteTrustedContact,
  getTrustedContact,
  listTrustedContacts,
  updateTrustedContact
} from "../repositories/trustedContacts.js";
import { createSupportMessage, listSupportMessages } from "../repositories/supportMessages.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/trusted-contacts", resolveProfile, async (req, res, next) => {
  try {
    res.json(await listTrustedContacts(req.profileId!));
  } catch (err) {
    next(err);
  }
});

router.post("/trusted-contacts", resolveProfile, async (req, res, next) => {
  try {
    const parsed = trustedContactInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.status(201).json(await createTrustedContact(req.profileId!, parsed.data));
  } catch (err) {
    next(err);
  }
});

router.patch("/trusted-contacts/:id", resolveProfile, async (req, res, next) => {
  try {
    const parsed = trustedContactInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = await updateTrustedContact(req.profileId!, req.params.id as string, parsed.data);
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/trusted-contacts/:id", resolveProfile, async (req, res, next) => {
  try {
    await deleteTrustedContact(req.profileId!, req.params.id as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get("/support-messages", resolveProfile, async (req, res, next) => {
  try {
    res.json(await listSupportMessages(req.profileId!));
  } catch (err) {
    next(err);
  }
});

/**
 * Records an approved handoff. This does NOT send anything: the client
 * opens the device's own SMS or phone app afterwards, so the person stays
 * in control of what actually leaves the device
 * (docs/PRODUCT_GUARDRAILS.md — approval is required, never automatic).
 */
router.post("/support-messages", resolveProfile, async (req, res, next) => {
  try {
    const parsed = supportMessageInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // A contact id from another profile must not be recorded against this one.
    if (parsed.data.trustedContactId) {
      const contact = await getTrustedContact(req.profileId!, parsed.data.trustedContactId);
      if (!contact) return res.status(404).json({ error: "trusted contact not found" });
    }

    const message = await createSupportMessage(req.profileId!, {
      trustedContactId: parsed.data.trustedContactId ?? null,
      channel: parsed.data.channel,
      messagePreview: parsed.data.messagePreview,
      includedData: parsed.data.includedData,
      excludedData: parsed.data.excludedData
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

export default router;
