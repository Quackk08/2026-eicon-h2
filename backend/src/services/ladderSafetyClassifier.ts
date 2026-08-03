import { z } from "zod";
import type { GeneratedLadderStep } from "@renew/shared";
import { env, isAIEnabled } from "../config/env.js";

const verdictSchema = z.object({
  safe: z.boolean(),
  unsafeStepTitles: z.array(z.string()).max(10),
  reason: z.string().max(400)
});

export interface SafetyVerdict {
  safe: boolean;
  reason: string;
}

/**
 * A second, independent look at a generated ladder.
 *
 * The generator is told what the person wants, which biases it toward saying
 * yes. This pass is given only the steps — no Vision, no goal, no reason to
 * justify them — and asked one question: could any of these harm someone who
 * is isolated, exhausted, or in a bad place? Keeping it uninformed is the
 * point; a reviewer that knows the intended answer is not a reviewer.
 *
 * Fails closed: if the check cannot run, the ladder is not accepted. A
 * generated ladder is a convenience, so losing it costs a fallback to seed
 * data — shipping unreviewed text costs more.
 */
export async function classifyLadderSafety(steps: GeneratedLadderStep[]): Promise<SafetyVerdict> {
  if (!isAIEnabled()) {
    return { safe: false, reason: "safety classifier unavailable (AI disabled)" };
  }

  const raw = await callGemini(buildPrompt(steps));
  if (!raw) {
    return { safe: false, reason: "safety classifier unreachable" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { safe: false, reason: "safety classifier returned unparseable output" };
  }

  const result = verdictSchema.safeParse(parsed);
  if (!result.success) {
    return { safe: false, reason: "safety classifier output failed validation" };
  }

  if (!result.data.safe) {
    const flagged = result.data.unsafeStepTitles.join("; ");
    return { safe: false, reason: `${result.data.reason}${flagged ? ` [${flagged}]` : ""}`.slice(0, 400) };
  }

  return { safe: true, reason: "passed classifier" };
}

function buildPrompt(steps: GeneratedLadderStep[]): string {
  const titles = steps
    .slice()
    .sort((a, b) => a.ladderLevel - b.ladderLevel)
    .map((step) => `${step.ladderLevel}. ${step.title} (${step.estMinutes} min)`)
    .join("\n");

  return `
You are reviewing suggested daily actions before they are shown in a wellbeing app. Many users are isolated, exhausted, low on money, or having a hard time. Some may be minors.

Judge ONLY the actions below. You are not told why they were suggested, and you should not assume there is a good reason.

Mark the set UNSAFE if any action could plausibly:
- put someone in physical danger (late at night, isolated places, strenuous activity without context)
- damage health (skipping meals, sleep deprivation, overexertion, substances, anything medical)
- worsen isolation (cutting off contact, deleting or avoiding people, withdrawing)
- damage a relationship or a job (confrontations, quitting, sending something regrettable)
- cause financial harm (spending, gambling, purchases framed as a fix)
- involve anything illegal, sexual, or age-inappropriate
- read as therapy, diagnosis, treatment, or medication advice

Ordinary small actions — tidying, a short walk in daylight, cooking, texting a friend, sitting in a cafe, opening a notebook — are SAFE. Do not flag something merely for being unambitious.

ACTIONS:
${titles}

Respond with ONLY a JSON object:
{"safe": true, "unsafeStepTitles": [], "reason": "short explanation"}
`.trim();
}

async function callGemini(prompt: string, attempt = 0): Promise<string | null> {
  if (!env.geminiApiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Deterministic: a safety verdict should not vary run to run.
        generationConfig: { responseMimeType: "application/json", temperature: 0 }
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (res.status === 429 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 20000));
      return callGemini(prompt, attempt + 1);
    }
    if (!res.ok) {
      console.error("[ladder-safety] request failed", res.status);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch (err) {
    console.error("[ladder-safety] request threw", err);
    return null;
  }
}
