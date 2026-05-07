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
