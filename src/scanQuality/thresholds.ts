/**
 * Scan-quality engine — every tunable in one place.
 *
 * Numbers were calibrated against a desktop browser webcam
 * (landscape ~640×480, user at arm's-length to ~1m). The native
 * MLKit provider (see README.md) must reuse THESE values so the
 * two platforms gate identically.
 *
 * Convention: continuous scores are 0–1; booleans use enter/exit
 * hysteresis pairs (enter ≥, exit <) so chips never flicker at a
 * boundary.
 */

export const THRESHOLDS = {
  // ---- engine cadence -------------------------------------------------
  /** Min ms between detector passes (~15 Hz). */
  DETECT_INTERVAL_MS: 66,
  /** Run luma/sharpness frame stats every Nth detector tick (~7.5 Hz). */
  FRAME_STATS_EVERY_N: 2,
  /** Downsample target for frame stats (keeps getImageData cheap). */
  STATS_WIDTH: 192,
  /** Smoothing time-constant: alpha = 1 − exp(−dt/τ). ~180 ms glide. */
  SMOOTH_TAU_MS: 180,
  /** Consecutive no-detection ms before faceDetected drops (debounce). */
  PRESENCE_LOST_MS: 250,

  // ---- distance (face-box height ÷ frame height) ----------------------
  /** Below this the face is unusably far (score 0). */
  DIST_FAR_MIN: 0.24,
  /** Ideal band — score 1 inside [LO, HI]. */
  DIST_IDEAL_LO: 0.34,
  DIST_IDEAL_HI: 0.62,
  /** Above this the face is unusably close (score 0). */
  DIST_CLOSE_MAX: 0.78,
  DIST_OK_ENTER: 0.55,
  DIST_OK_EXIT: 0.4,

  // ---- centering (face center offset from frame center, normalized) ---
  /** Offset below this is "perfectly centered" (score 1). */
  CENTER_DEAD_ZONE: 0.05,
  /** Offset at which centerScore reaches 0. */
  CENTER_MAX_OFFSET: 0.34,
  CENTER_OK_ENTER: 0.55,
  CENTER_OK_EXIT: 0.42,

  // ---- head pose (degrees) ---------------------------------------------
  YAW_OK_DEG: 18,
  PITCH_OK_DEG: 16,
  ROLL_OK_DEG: 20,
  POSE_OK_ENTER: 0.5,
  POSE_OK_EXIT: 0.38,

  // ---- light (mean face luma, 0–1) --------------------------------------
  /** Pitch black floor — score 0 at/below. */
  LIGHT_DARK_FLOOR: 0.08,
  /** Good band — score 1 inside [LO, HI]. */
  LIGHT_GOOD_LO: 0.24,
  LIGHT_GOOD_HI: 0.78,
  /** Blown out ceiling — score 0 at/above. */
  LIGHT_BRIGHT_CEIL: 0.95,
  /** Fraction of near-clipped face pixels that zeroes the light score. */
  LIGHT_CLIP_FRAC_MAX: 0.3,
  LIGHT_OK_ENTER: 0.55,
  LIGHT_OK_EXIT: 0.42,
  /** lightLevel below this suggests the UI add screen fill-light. */
  FILL_LIGHT_BELOW: 0.2,
  FILL_LIGHT_RELEASE: 0.26,

  // ---- sharpness (Laplacian variance, 0–255 luma units²) ----------------
  /** Variance at/below this = fully blurred (score 0). */
  SHARP_VAR_MIN: 10,
  /** Variance at/above this = fully sharp (score 1). */
  SHARP_VAR_FULL: 110,
  SHARP_OK_ENTER: 0.5,
  SHARP_OK_EXIT: 0.38,

  // ---- stillness (landmark velocity ÷ face diagonal, per second) --------
  // NOTE: MediaPipe's VIDEO mode applies temporal smoothing to the
  // landmarks, which dampens measured velocity — the band is tighter
  // than raw pixel motion would suggest (verified with a 16px/frame
  // shake rig: raw stillness reads ~0.43, a held face reads ~1.0).
  /** Velocity at/below this = perfectly still (score 1). */
  MOTION_NONE_PER_S: 0.05,
  /** Velocity at/above this = clearly moving (score 0). */
  MOTION_FULL_PER_S: 0.55,
  STILL_OK_ENTER: 0.66,
  STILL_OK_EXIT: 0.55,

  // ---- backlight ---------------------------------------------------------
  /** (bgLuma − faceLuma) above this starts registering backlight risk. */
  BACKLIGHT_DELTA_MIN: 0.12,
  /** Delta at which backlightRisk saturates to 1. */
  BACKLIGHT_DELTA_MAX: 0.42,

  // ---- capture -------------------------------------------------------------
  /** allPass must hold this long before auto-capture fires. */
  AUTO_CAPTURE_HOLD_MS: 1300,
} as const;

/** Landmark indices (MediaPipe 478-point face mesh). */
export const LM = {
  NOSE_TIP: 1,
  FOREHEAD_TOP: 10,
  CHIN: 152,
  FACE_LEFT: 234, // user's right cheek edge in raw coords
  FACE_RIGHT: 454,
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_OUTER: 263,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
} as const;

/** Stable anchor points used for the stillness velocity measure. */
export const STILLNESS_ANCHORS: ReadonlyArray<number> = [
  LM.NOSE_TIP,
  LM.LEFT_EYE_OUTER,
  LM.RIGHT_EYE_OUTER,
  LM.MOUTH_LEFT,
  LM.MOUTH_RIGHT,
  LM.CHIN,
  LM.FOREHEAD_TOP,
];
