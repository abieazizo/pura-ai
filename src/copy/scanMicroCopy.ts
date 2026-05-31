/**
 * Pura AI — scan / result micro-copy constants (v19.16).
 *
 * SINGLE source of truth for the small set of user-facing strings
 * used by the scan loading, slow-loading, blocked-retake, and
 * low-confidence states. Every relevant screen consumes these
 * exported literals — no inline duplicates, no near-paraphrases,
 * no scattered competing wording.
 *
 * Required by CLAUDE.md / Phase 0A. Do not paraphrase.
 */

/**
 * Loading sequence shown during the post-capture analyze flow.
 * Cycles through these in order; ScanAnalyzing's choreography
 * picks the line that matches the current beat.
 */
export const LOADING_MESSAGES = [
  'Mapping your skin zones...',
  'Identifying your top concerns...',
  'Finding products matched to your skin...',
  'Building your personalized plan...',
] as const;

/**
 * Shown when loading exceeds the normal threshold (~5s+).
 * Replaces the earlier rotating line so the user sees explicit
 * "we know it's slow, still working" reassurance.
 */
export const SLOW_LOADING_MESSAGE =
  'Almost there — finding the best matches for you...';

/**
 * Hard-block message for an unusable scan
 * (`imageQuality.confidence < 0.4`). Used as the retake-recovery
 * screen's primary headline. Brief, clear, never blames the user.
 */
export const SCAN_BLOCKED_MESSAGE =
  'We need a clearer photo to analyze your skin.';

/**
 * Soft-warning banner for a low-confidence scan
 * (`0.4 ≤ imageQuality.confidence < 0.7`). Sits above the
 * ResultScreen content as a calm caveat, not a blocker.
 */
export const SCAN_LOW_CONFIDENCE_MESSAGE =
  'Results based on partial scan. Retake for higher accuracy.';

/**
 * Type alias for the loading-message tuple — useful when a
 * choreography wants to type-narrow against the rotating set.
 */
export type LoadingMessage = (typeof LOADING_MESSAGES)[number];

/**
 * v35 Pass-1 — the analyzing screen's mid-flight captions, in the
 * "Practitioner's Notes" voice. Replaces the LOADING_MESSAGES
 * aliases that previously narrated the AI process step-by-step
 * ("Mapping your skin zones..."). The voice here is observational —
 * a high-end facialist narrating to themselves as they read your
 * skin, not a loading screen describing system work. Quiet
 * authority, anatomical without clinical, specific without medical.
 *
 * Beat → caption mapping (matches useAnalysisChoreography beats):
 *   preflight  → before the analysis starts (post-capture hold)
 *   locate     → BEAT 2 — first read of the surface
 *   partition  → BEAT 3 — registering distinct zones
 *   detect     → BEAT 4 — surfacing findings
 *   score      → BEAT 5 — the breath before the verdict
 *   waiting    → slow-state fallback (>5s)
 *   reveal     → BEAT 7 — the single roman word that lands the moment
 *
 * Each line is single-sentence, ≤7 words, no trailing ellipses.
 * Pass 5 (Copy & Voice) will deep-tune each line word-for-word; this
 * is the first-pass implementation of the chosen direction.
 *
 * LOADING_MESSAGES is intentionally left intact for any other surface
 * that still consumes the original aliases (per the CLAUDE.md
 * canonical-constants rule). This new constant is screen-specific to
 * the cinematic analyzing flow.
 */
export const ANALYZING_BEATS_PRACTITIONER = {
  // Pass 5 deep-tune: preflight and score lines refined after reading
  // aloud. "Holding the photo steady." sounded mechanical → "Letting
  // my eye adjust." personifies the AI as having a practitioner's
  // gaze. "Pulling it together." sounded casual → "Letting it
  // settle." carries ritual without losing intimacy. The remaining
  // lines passed the read-aloud test on the first take and stay.
  preflight: 'Letting my eye adjust.',
  locate: 'Reading the surface.',
  partition: 'Where the cheekbones turn.',
  detect: 'A few areas asking for attention.',
  score: 'Letting it settle.',
  waiting: 'Still reading. A moment.',
  reveal: 'Ready.',
} as const;
