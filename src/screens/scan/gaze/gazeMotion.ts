/**
 * THE GAZE — motion grammar.
 *
 * One place for every duration/easing so the screen breathes as one
 * organism. The quality signals arrive pre-smoothed by the engine
 * (lerp, τ=180ms), so the living frame consumes them DIRECTLY — no
 * per-tick re-tween. The only scripted timings here are the discrete
 * beats (entry, the held breath, capture).
 */

import { Easing } from 'react-native-reanimated';

export const MOTION = {
  // ---- entry (the aperture) ----
  APERTURE_MS: 720,
  APERTURE_DELAY_MS: 90,
  FEED_FADE_MS: 540,
  FRAME_DRAW_MS: 700,
  FRAME_DRAW_DELAY_MS: 260,

  // ---- the living frame ----
  BREATH_MS: 3400,
  BREATH_SCALE: 0.0075,
  DRIFT_X_MS: 5200,
  DRIFT_Y_MS: 6800,

  // ---- guidance line ----
  HINT_SWAP_MS: 260,

  // ---- fill light ----
  FILL_MS: 650,

  // ---- capture: the held breath -------------------------------------------
  // A genuine three-beat so light GATHERS INWARD and CLEARS to reveal
  // the lit, crisp captured face — never a wash that buries it.
  //   1) the frame inhales (a small dip)
  //   2) the captured face lands FAST underneath (FREEZE_IN)
  //   3) the bloom PULSES: floods up (BLOOM_UP), then recedes
  //      (BLOOM_DOWN) while its light condenses inward — clearing to
  //      leave the crisp face ("There you are")
  //   4) a beat of crisp face (CRISP_HOLD), then the veil rises.
  INHALE_MS: 190,
  INHALE_SCALE: 0.982,
  FREEZE_IN_MS: 180,
  BLOOM_UP_MS: 280,
  BLOOM_DOWN_MS: 300,
  CRISP_HOLD_MS: 160,
  VEIL_MS: 220,

  // ---- easings ----
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  easeBreath: Easing.inOut(Easing.sin),
} as const;

/** Capture timeline derived from the beats above (single source of truth). */
export const CAPTURE = {
  /** Bloom fully cleared → veil begins. */
  VEIL_START_MS: MOTION.BLOOM_UP_MS + MOTION.BLOOM_DOWN_MS + MOTION.CRISP_HOLD_MS, // 740
  /** Veil fully opaque → navigate beneath it (one unbroken moment). */
  HANDOFF_MS:
    MOTION.BLOOM_UP_MS + MOTION.BLOOM_DOWN_MS + MOTION.CRISP_HOLD_MS + MOTION.VEIL_MS, // 960
} as const;
