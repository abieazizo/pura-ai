/**
 * Shared prop contract for the two interchangeable face compositors
 * (FallbackFaceCompositor = RN-only, runs today · SeenIntoFocusSkiaCompositor =
 * full-fidelity, lights up once Skia is installed). The screen owns the single
 * `progress` timeline and feeds these derived values down; both compositors
 * consume identical inputs so they are drop-in swappable.
 */

import type { SharedValue } from 'react-native-reanimated';

export interface FaceCompositorProps {
  photoUri: string;
  frameW: number;
  frameH: number;
  reduceMotion: boolean;

  /** Center of attention, in px within the frame (the gaze). */
  focusCenter: SharedValue<{ x: number; y: number }>;
  /** Center of the warm key light, in px (≈14% of frame height above focus). */
  keyCenter: SharedValue<{ x: number; y: number }>;

  /** Base-layer blur radius (px). 7 → 0 at release. */
  blurR: SharedValue<number>;
  /** Clarity-pool radius (px). Grows huge at release. */
  focusRpx: SharedValue<number>;
  /** Sharp-layer fade-in (0→1). */
  sharpOpacity: SharedValue<number>;
  /** Base-layer brightness (≈0.82 → 1.0). */
  baseBright: SharedValue<number>;
  /** Sharp-layer brightness (≈1.04 → 1.07). */
  sharpBright: SharedValue<number>;
  /** Warm key opacity (0 → ~0.5). */
  keyOpacity: SharedValue<number>;
}
