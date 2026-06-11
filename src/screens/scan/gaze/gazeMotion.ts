/**
 * THE GAZE — motion grammar.
 *
 * One place for every duration/easing so the screen breathes as one
 * organism. The quality signals arrive pre-smoothed (engine lerp,
 * τ=180ms); the short bridge timings here only silk over the 66ms
 * steps between engine ticks — they must stay SHORT or the guide
 * feels laggy rather than alive.
 */

import { Easing } from 'react-native-reanimated';

export const MOTION = {
  /** Bridge between 15Hz signal steps → continuous motion. */
  SIGNAL_BRIDGE_MS: 150,

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

  // ---- capture ----
  INHALE_MS: 190,
  INHALE_SCALE: 0.985,
  BLOOM_MS: 300,
  FREEZE_HOLD_MS: 320,
  EXIT_VEIL_MS: 280,
  /** Total shutter → navigate. Keep ≤ 950ms — a held breath, not a pause. */
  HANDOFF_TOTAL_MS: 900,

  // ---- easings ----
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  easeBreath: Easing.inOut(Easing.sin),
} as const;
