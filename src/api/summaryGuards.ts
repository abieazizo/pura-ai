/**
 * v26.2 — Summary guard rails.
 *
 * Extracted from `liveProducts.ts` so the verify script (and any
 * other RN-free consumer) can import them without pulling in the
 * Zustand store + AsyncStorage + the rest of the React Native tree.
 *
 * `FORBIDDEN_SUMMARY_PATTERNS` is the single canonical "do not
 * render" list applied to every user-facing summary string —
 * server-prompted, AI-generated, or planner-built. Anything that
 * matches falls back to the UI's deterministic builder, which
 * always produces clean editorial copy.
 *
 * `sanitizeUserNeedSummary` is the entry-point sanitizer used
 * everywhere the AI's planner or the deterministic planner emits
 * a summary string. It normalizes phrasing, caps length, and
 * rejects unfinished fragments / hallucinated trust claims.
 */

export const FORBIDDEN_SUMMARY_PATTERNS: RegExp[] = [
  /\buser needs\b/i,
  /\bthe user\b/i,
  /\bneeds to\b/i,
  /\bdiagnosed\b/i,
  /\bcures?\b/i,
  /\bguaranteed\b/i,
  /\bverified\b/i,
  /\bclinically proven\b/i,
  /\bdermatologist[- ]?verified\b/i,
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bNaN\b/i,
];

export function sanitizeUserNeedSummary(
  input: string | null | undefined
): string | null {
  if (!input) return null;
  let s = input.trim();
  if (s.length === 0) return null;
  // Strip legacy third-person prefixes the planner sometimes emits.
  s = s.replace(
    /^\s*(?:the\s+)?user\s+(?:needs|wants|requires|asks for|is looking for)\s+/i,
    ''
  );
  // Strip "User is …" or "User has …" prefixes.
  s = s.replace(/^\s*user\s+(?:is|has)\s+/i, '');
  // Strip stray leading articles after removal.
  s = s.replace(/^(?:a|an|the)\s+/i, '');
  if (s.length === 0) return null;
  // Re-capitalize the first letter.
  s = s[0].toUpperCase() + s.slice(1);
  // Hard cap to 110 chars so over-long planner outputs never
  // overflow the editorial caption.
  if (s.length > 110) {
    s = s.slice(0, 107).replace(/[.,;:\s]+$/, '') + '…';
  }
  // v22.11 — validation: reject if any forbidden token survived.
  // Returning null lets the UI fall through to its deterministic
  // builder.
  for (const re of FORBIDDEN_SUMMARY_PATTERNS) {
    if (re.test(s)) return null;
  }
  // v26.2 — fragment guards. Reject summaries that look like
  // unfinished thoughts:
  //   • end on a known conjunction ("…tonight and")
  //   • end on mid-sentence punctuation (",", ":", ";")
  //   • are too short to be useful editorial copy
  if (/\b(and|or|but|because|to|with|for|when|while)\s*$/i.test(s)) {
    return null;
  }
  if (/[,:;]\s*$/.test(s)) return null;
  if (s.length < 6) return null;
  return s;
}
