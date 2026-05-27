/**
 * Decision Room intent classifier.
 *
 * A focused keyword classifier that maps a free-form question onto one
 * of the Decision Room's response shapes. We deliberately keep this
 * deterministic — the redesign is built around the user trusting that
 * "Can I exfoliate tonight?" always lands on the same compact answer,
 * not whatever the model felt like saying.
 */

export type DecisionIntent =
  | 'CHALLENGE_EXFOLIATE'
  | 'CHALLENGE_RETINOID'
  | 'CHALLENGE_RESTART'
  | 'EXPLAIN'
  | 'SUBSTITUTE'
  | 'REPORT_BURNING'
  | 'REPORT_TIGHT'
  | 'GENERAL';

export function classifyDecisionIntent(text: string): DecisionIntent {
  const t = text.toLowerCase();

  if (/(burn|stings? badly|stinging won.t|swell|hives|severe pain|chemical burn)/.test(t)) {
    return 'REPORT_BURNING';
  }
  if (/(tight|tightness|dry|dryness|stripped|squeak)/.test(t) && !/should/.test(t)) {
    return 'REPORT_TIGHT';
  }

  if (/(when|how long).*restart|when.*active|when.*again/.test(t)) {
    return 'CHALLENGE_RESTART';
  }
  if (/(retin|differin|adapalene|tretinoin)/.test(t)) {
    return 'CHALLENGE_RETINOID';
  }
  if (/(exfoliat|\bbha\b|\baha\b|salicylic|glycolic|lactic acid)/.test(t)) {
    return 'CHALLENGE_EXFOLIATE';
  }
  if (/(safest|alternat|instead|substitute|what.*should i use|which.*moisturiz|which.*safer)/.test(t)) {
    return 'SUBSTITUTE';
  }
  if (/(why.*chang|why.*irritat|why.*worse|what changed|why.*down|why.*recovery)/.test(t)) {
    return 'EXPLAIN';
  }

  return 'GENERAL';
}
