import { upsertActionTemplates } from "../repositories/actionTemplates.js";
import { actionTemplateSeeds } from "../data/actionTemplates.seed.js";
import { upsertPlaces } from "../repositories/places.js";
import { placeSeeds } from "../data/places.seed.js";

async function main() {
  await upsertActionTemplates(actionTemplateSeeds);
  console.log(`Seeded ${actionTemplateSeeds.length} action templates.`);

  await upsertPlaces(placeSeeds);
  console.log(`Seeded ${placeSeeds.length} places.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
