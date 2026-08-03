import { Router } from "express";
import { listSavedPlaceIds, savePlace, unsavePlace } from "../repositories/savedPlaces.js";
import { getPlaceById } from "../repositories/places.js";
import { resolveProfile } from "../middleware/resolveProfile.js";

const router = Router();

router.get("/saved-places", resolveProfile, async (req, res, next) => {
  try {
    res.json(await listSavedPlaceIds(req.profileId!));
  } catch (err) {
    next(err);
  }
});

router.put("/saved-places/:placeId", resolveProfile, async (req, res, next) => {
  try {
    const placeId = req.params.placeId as string;
    // Checked before writing so a typo cannot leave a saved id that no
    // longer resolves to anything on the Places screen.
    const place = await getPlaceById(placeId);
    if (!place) return res.status(404).json({ error: "place not found" });

    await savePlace(req.profileId!, placeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete("/saved-places/:placeId", resolveProfile, async (req, res, next) => {
  try {
    await unsavePlace(req.profileId!, req.params.placeId as string);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
