import {
  generatedLadderSchema,
  isCoherentLadder,
  isSafeLadderStepTitle,
  type ActionTemplate,
  type GeneratedLadderStep
} from "@renew/shared";
import { isAIEnabled } from "../config/env.js";
import { callGeminiRaw } from "./geminiTransport.js";
import { classifyLadderSafety } from "./ladderSafetyClassifier.js";
import {
  logLadderGeneration,
  type LadderVerdict
} from "../repositories/generatedLadderLog.js";
import type { PreferencesRow } from "../repositories/preferences.js";

type Preferences = Partial<PreferencesRow>;

/** Place words a generated step may use, so places still resolve to reviewed venues. */
const ALLOWED_PLACE_TYPES = [
  "home",
  "online",
  "street",
  "cafe",
  "library",
  "park",
  "trail",
  "gym",
  "studio",
  "study_room",
  "community_center"
];

interface GenerateArgs {
  profileId: string;
  visionSummary: string;
  domain: string;
  preferences: Preferences;
}

/**
 * Builds a Life Route ladder for one person's own Vision.
 *
 * The reviewed seed steps only cover a handful of domains, so every Vision
 * produced the same ladder regardless of what the person actually wrote.
 * This asks the model for steps that fit their words, then keeps only what
 * survives schema validation, a safety word check, and a coherence check
 * that the ladder genuinely climbs. Anything failing any of those is
 * discarded and the caller falls back to reviewed seed data — a generated
 * step is never shown on trust alone.
 */
export async function generateLadderForVision(args: GenerateArgs): Promise<ActionTemplate[] | null> {
  if (!isAIEnabled()) return null;

  const log = (verdict: LadderVerdict, raw: string | null, reason?: string) =>
    logLadderGeneration({
      profileId: args.profileId,
      domain: args.domain,
      visionSummary: args.visionSummary,
      rawResponse: raw,
      verdict,
      rejectReason: reason
    });

  const raw = await callGemini(buildPrompt(args));
  if (!raw) {
    await log("rejected_unreachable", null, "no response from model");
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await log("rejected_schema", raw, "response was not valid JSON");
    return null;
  }

  const result = generatedLadderSchema.safeParse(parsed);
  if (!result.success) {
    await log("rejected_schema", raw, "failed shared schema");
    return null;
  }

  const steps = result.data.steps;

  // Gate 1 — cheap wordlist. Catches the blunt cases without a model call.
  const flagged = steps.filter((step) => !isSafeLadderStepTitle(step.title));
  if (flagged.length > 0) {
    await log("rejected_wordlist", raw, flagged.map((s) => s.title).join("; ").slice(0, 400));
    return null;
  }

  // Gate 2 — the ladder has to climb, or "make it smaller" means nothing.
  if (!isCoherentLadder(steps)) {
    await log("rejected_incoherent", raw, "steps do not increase in effort");
    return null;
  }

  // Gate 3 — independent model review. The wordlist only knows the words it
  // was given; this is what catches an action that is unsafe in context.
  const verdict = await classifyLadderSafety(steps);
  if (!verdict.safe) {
    await log("rejected_classifier", raw, verdict.reason);
    return null;
  }

  await log("accepted", raw);

  return steps
    .slice()
    .sort((a, b) => a.ladderLevel - b.ladderLevel)
    .map((step, index) => toActionTemplate(step, index, args));
}

function toActionTemplate(
  step: GeneratedLadderStep,
  index: number,
  args: GenerateArgs
): ActionTemplate {
  const placeTypes = step.placeTypes.filter((type) => ALLOWED_PLACE_TYPES.includes(type));

  return {
    id: `ai-${args.profileId.slice(0, 8)}-${Date.now().toString(36)}-${index + 1}`,
    goalDomains: [args.domain] as ActionTemplate["goalDomains"],
    title: step.title,
    minCapacity: step.minCapacity,
    maxSocialLoad: step.maxSocialLoad,
    // A single step gets a small range around the estimate so the rule
    // engine's duration filter still has something to work with.
    durationRange: [Math.max(1, Math.round(step.estMinutes / 2)), step.estMinutes],
    costLevel: step.costLevel,
    // An unrecognised place word would never match a reviewed venue, so a
    // step keeps no place at all rather than an unresolvable one.
    placeTypes: placeTypes.length > 0 ? placeTypes : ["home"],
    indoorOutdoor: step.indoorOutdoor,
    ladderGroupId: `ai-${args.profileId.slice(0, 8)}-${Date.now().toString(36)}`,
    ladderLevel: index + 1,
    safetyTags: []
  };
}

function buildPrompt(args: GenerateArgs): string {
  const { visionSummary, preferences } = args;
  return `
You design a five-step "Activity Ladder" for ReNew, a lifestyle-architecture app. The ladder turns someone's own long-term direction into concrete daily actions of increasing size, so that on a hard day they can do step 1 and on a good day step 5.

THE PERSON'S OWN WORDS FOR THE LIFE THEY WANT:
"${visionSummary}"

WHAT IS REALISTIC FOR THEM RIGHT NOW:
- Time available per day: ${preferences.max_minutes ?? 20} minutes
- Travel limit: ${preferences.max_distance_meters ?? 2000} meters
- Budget ceiling: ${preferences.max_cost ?? 0} (0 means free only)
- Social comfort: ${preferences.social_preference ?? "low"}

RULES:
1. Every step must clearly serve THEIR stated direction above. Do not fall back on generic study or exercise advice if that is not what they wrote.
2. Step 1 must be almost impossible to fail — a couple of minutes, at home, alone. Each following step gets slightly longer or slightly more social. Step 5 should still fit their stated time limit where possible.
3. estMinutes must not exceed their daily time budget for steps 1-4.
4. maxSocialLoad must respect their social comfort: "solo" means 0, "low" means at most 1, "medium" at most 2.
5. placeTypes must be chosen ONLY from: ${ALLOWED_PLACE_TYPES.join(", ")}. Use ["home"] for anything done at home.
6. Never suggest medication, treatment, therapy, diagnosis, fasting, dieting, alcohol, drugs, or anything self-harming. This is not a medical product.
7. Titles are plain, concrete, and in English. No motivational slogans — describe the action itself.

FIELD RANGES — a single value outside these ranges throws the whole ladder away, so keep every number inside them:
- ladderLevel: integer 1 to 5, one step at each level, no repeats.
- estMinutes: integer 1 to 120.
- minCapacity: integer 0 to 4. NOT 1 to 5 — step 1 uses 0, step 5 uses at most 4. Must never decrease as the level rises.
- maxSocialLoad: integer 0 to 4, subject to rule 4 above.
- costLevel: integer 0 to 4.
- placeTypes: at most 4 entries, from the list in rule 5.
- indoorOutdoor: exactly one of "indoor", "outdoor", "either".

Respond with ONLY a JSON object in exactly this shape:
{"contractVersion":1,"steps":[{"title":"string","ladderLevel":1,"estMinutes":5,"minCapacity":0,"maxSocialLoad":0,"costLevel":0,"placeTypes":["home"],"indoorOutdoor":"indoor"}]}
`.trim();
}

/**
 * Retries once on 429. Generating a ladder happens at most a couple of times
 * per person, and quietly handing someone the generic seed ladder because a
 * rate-limit window was busy is worse than waiting a moment.
 */
async function callGemini(prompt: string, attempt = 0): Promise<string | null> {
  const { text, status } = await callGeminiRaw({
    parts: [{ text: prompt }],
    label: "ladder",
    temperature: 0.5,
    timeoutMs: 25_000
  });

  if (status === 429 && attempt === 0) {
    console.warn("[ladder] rate limited, retrying once in 20s");
    await new Promise((resolve) => setTimeout(resolve, 20000));
    return callGemini(prompt, attempt + 1);
  }
  return text;
}
