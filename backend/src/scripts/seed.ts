import { upsertActionTemplates } from "../repositories/actionTemplates.js";
import { actionTemplateSeeds } from "../data/actionTemplates.seed.js";

async function main() {
  await upsertActionTemplates(actionTemplateSeeds);
  console.log(`Seeded ${actionTemplateSeeds.length} action templates.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
