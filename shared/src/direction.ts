/**
 * Recognises a Vision that names no direction yet.
 *
 * "I don't know what I want" is a real and common answer, and it deserves a
 * Route rather than a generic one borrowed from whichever domain happened to
 * be selected. This decides only what the TEXT does — whether it names
 * something to move toward — and never what the person is like. There is no
 * score and no inference about mood here, per PRODUCT_GUARDRAILS.md.
 */

/** Phrases where someone says outright that they have no direction. */
const DIRECTIONLESS_PATTERNS: RegExp[] = [
  /\b(i )?(really )?(do ?n'?t|dont) know what (i|to)\b/i,
  /\bno (idea|clue|goal|goals|direction|plan|purpose|point)\b/i,
  /\bnothing (in particular|specific|really|much)\b/i,
  /\bnot sure what\b/i,
  /\b(any|whatever|something) (thing|is fine|works)\b/i,
  /모르겠|모르겠어|잘 모르|모름/,
  /목적이? ?없|방향이? ?없|하고 ?싶은 ?게? ?없|딱히 ?없/,
  /아무거나|아무것도|그냥/
];

/**
 * Wording that is NOT simply "no direction yet".
 *
 * Someone writing about hopelessness or self-harm is not asking for a
 * starter ladder, and answering them with one would talk past what they
 * said. These are excluded here and left to the Support path, which is
 * user-controlled and always reachable — this module deliberately does not
 * decide anything about them.
 */
const DISTRESS_PATTERNS: RegExp[] = [
  /\b(hopeless|worthless|pointless to (live|go on)|end it|kill myself|suicid|self[- ]?harm|hurt myself)\b/i,
  /\b(want to|wanna) (die|disappear|vanish)\b/i,
  /죽고 ?싶|사라지고 ?싶|살기 ?싫|의미 ?없는 ?삶/
];

export function mentionsDistress(text: string): boolean {
  return DISTRESS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * True when the text names no direction to move toward.
 *
 * Very short entries count: three words cannot describe a life someone is
 * heading for, and treating them as a real Vision produces a ladder built on
 * nothing.
 */
export function looksDirectionless(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Distress is not directionlessness; it is left alone entirely.
  if (mentionsDistress(trimmed)) return false;

  if (DIRECTIONLESS_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  // A handful of characters with no verb is not a direction either. Korean
  // is counted by characters since it packs more meaning per character.
  const isKorean = /[가-힣]/.test(trimmed);
  return isKorean ? trimmed.length <= 5 : trimmed.split(/\s+/).length <= 2;
}

/** The reviewed ladder that answers "I don't know yet". */
export const ORIENTING_LADDER_GROUP_ID = "orienting-start";
