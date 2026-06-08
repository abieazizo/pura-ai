/**
 * motion.ts — the SINGLE DIAL BOARD for the "Seen Into Focus" observe moment.
 *
 * Everything tunable lives here so it can be dialed on-device without hunting
 * through the screen: timeline constants, the gaze PATH, every envelope curve,
 * the warm-key color, companion timing, the warm-dark tokens, and the font
 * families. The screen and the companion both import from this file FIRST.
 *
 * The worklet math (easeIO / lerp / sample / env) is colocated here and marked
 * `'worklet'` so the Reanimated babel plugin serializes it; the screen's
 * `useDerivedValue` worklets call these directly. (Cross-file worklet calls are
 * supported — these are pure number helpers, the safest possible case.)
 *
 * Ground truth: design-ref/pura_seen_into_focus.html. The keyframes below are
 * ported verbatim from that prototype.
 */

import type { TextStyle } from 'react-native';

// ───────────────────────────────────────────────────────────────────────────
// 1 · TIMELINE  (ms)
// ───────────────────────────────────────────────────────────────────────────

/**
 * The examination floor. The cinematic ALWAYS plays for this long, decoupled
 * from the network — a finished, clear face is what "complete" looks like, not
 * a spinner. Raise it to linger longer; the result still arrives whenever it
 * arrives and is gated separately (see SeenIntoFocusScreen).
 */
export const MIN_DURATION = 4700;
export const SETTLE = MIN_DURATION; // alias — they are intentionally the same beat.

/** The window where the face snaps fully clear and the companion blooms. */
export const RESOLVE_WINDOW = { start: 4300, end: 4700 } as const;

// ───────────────────────────────────────────────────────────────────────────
// 2 · GAZE PATH  — how real eyes move across a face.
//     (t ms, x %, y %) of the frame. Converted to px by the screen.
//     Dwell pairs (same x,y at two t's) make attention LINGER, not glide.
// ───────────────────────────────────────────────────────────────────────────

export interface GazeKey {
  t: number;
  x: number; // % of frame width
  y: number; // % of frame height
}

export const PATH: GazeKey[] = [
  { t: 600, x: 50, y: 33 }, // arrive on the eyes
  { t: 1500, x: 50, y: 33 }, //   …and dwell
  { t: 2200, x: 37, y: 55 }, // drift to the cheek / skin texture
  { t: 2900, x: 37, y: 55 }, //   …and dwell
  { t: 3500, x: 50, y: 30 }, // up to the forehead / T-zone
  { t: 3900, x: 50, y: 30 }, //   …and dwell
  { t: 4300, x: 50, y: 46 }, // down to under-eyes / nose, then release
];

// ───────────────────────────────────────────────────────────────────────────
// 3 · ENVELOPES  — scalar curves over time. [t ms, value], piecewise-eased.
// ───────────────────────────────────────────────────────────────────────────

export type Stops = ReadonlyArray<readonly [number, number]>;

/** Global softness of the base layer, in px of blur. 7 → 0 at release. */
export const BLUR_R: Stops = [
  [0, 7],
  [600, 7],
  [4300, 3.4],
  [4700, 0],
];

/** Radius of the moving clarity pool, as a MULTIPLE of frame width.
 *  Grows huge at release so the whole face snaps crisp. */
export const FOCUS_R: Stops = [
  [0, 0.34],
  [4300, 0.34],
  [4700, 1.7],
];

/** Opacity of the sharp (in-focus) layer — fades in as focus begins. */
export const SHARP_OPACITY: Stops = [
  [0, 0],
  [520, 0],
  [760, 1],
];

/** Brightness of the blurred base and the sharp layer (gentle warm lift). */
export const BASE_BRIGHT: Stops = [
  [0, 0.82],
  [4700, 1.0],
];
export const SHARP_BRIGHT: Stops = [
  [0, 1.04],
  [4700, 1.07],
];

/** Opacity of the warm directional key light. */
export const KEY_OPACITY: Stops = [
  [0, 0],
  [1100, 0.42],
  [4300, 0.42],
  [4700, 0.5],
];

// ── Reduced-motion variants: no gaze travel, one gentle global resolve. ──────
/** A single soft warm key pulse instead of a tracking light. */
export const RM_KEY_OPACITY: Stops = [
  [0, 0],
  [1400, 0.4],
  [3200, 0.4],
  [4700, 0.34],
];
/** Static focus center (% of frame) when motion is reduced. */
export const RM_FOCUS_CENTER = { x: 50, y: 41 } as const;

// ───────────────────────────────────────────────────────────────────────────
// 4 · WARM KEY LIGHT  — appears to come from the companion, tracks the gaze.
//     Centered ~14% of frame height ABOVE the focus point.
// ───────────────────────────────────────────────────────────────────────────

export const KEY_LIGHT = {
  /** How far above the focus center the light sits (fraction of frame height). */
  liftAboveFocus: 0.14,
  /** Radial stops, core → falloff → transparent. */
  core: 'rgba(255, 239, 214, 0.95)',
  mid: 'rgba(255, 226, 182, 0.35)',
  edge: 'rgba(255, 226, 182, 0)',
  /** Key radius as a multiple of frame width. */
  radiusMult: 0.62,
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 5 · COMPANION ("living light") timing + aurora recipe.
// ───────────────────────────────────────────────────────────────────────────

export const COMPANION = {
  /** Wake: 0 → this ms. glow .4→1, scale .98→1.03, lean +5px toward the face. */
  wakeMs: 760,
  wakeGlow: { from: 0.4, to: 1.0 },
  wakeScale: { from: 0.98, to: 1.03 },
  leanPx: 5,
  /** Examining: gentle breathing until SETTLE. */
  breathGlow: { base: 0.9, amp: 0.04 },
  breathScale: { base: 1.02, amp: 0.04 },
  breathPeriodMs: 700,
  /** Settle: 300ms pop as it "turns to you". */
  settleMs: 300,
  settleGlow: 0.88,
  settleScalePop: { from: 1.06, to: 1.0 },
  castGlow: 0.5, // warm bloom toward the viewer
  /** Aurora palette. */
  sphere: ['#BFE0FF', '#3F8BFF', '#0E5BD6'] as const, // radial in→out
  blobs: ['#DFF0FF', '#54A6FF', '#86F0FF'] as const, // screen-blended drifters
  outerGlow: 'rgba(63, 139, 255, 0.55)',
  castColor: 'rgba(255, 234, 205, 0.9)', // warm "turns to you" cast
  faceInk: 'rgba(10, 28, 64, 0.55)', // minimal eyes + smile, very soft
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 6 · TOKENS + FONTS  — warm-dark hero. Deliberately diverges from the light
//     porcelain DS (src/theme/ds.ts) for this one immersive moment; accent
//     stays the locked Pura Blue so it still reads as the same product.
// ───────────────────────────────────────────────────────────────────────────

export const TOK = {
  bg: ['#14151B', '#0B0C10', '#070709'] as const, // radial top → bottom
  ink: '#F4F4EF',
  muted: '#A9AAB3',
  accent: '#147CFF', // == ds blue[500], the locked anchor
  frameRadius: 28,
  frameBorder: 'rgba(20, 124, 255, 0.22)',
  vignetteTop: 'rgba(7, 7, 9, 0.45)',
  vignetteBottom: 'rgba(7, 7, 9, 0.78)',
  grainOpacity: 0.05,
} as const;

const SERIF = 'InstrumentSerif-Regular';
const SERIF_SEMI = 'InstrumentSerif-SemiBold';
const SANS_SEMI = 'Inter-SemiBold';

export const FONTS = {
  /** Voice line — single line, italic-feeling editorial serif. */
  voice: {
    fontFamily: SERIF,
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  /** Orient block — larger serif, reflows under large-text. */
  orient: {
    fontFamily: SERIF_SEMI,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.6,
  } satisfies TextStyle,
  /** Honest-handoff reason + tip. */
  reason: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  tip: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  button: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  } satisfies TextStyle,
} as const;

/** Frame aspect — fixed so portrait/landscape/square photos never shift layout. */
export const FRAME_ASPECT = 322 / 464;
export const FRAME_WIDTH_FRACTION = 0.86;

// ───────────────────────────────────────────────────────────────────────────
// 7 · VOICE  — timed to the dwells. (ms → line). Cross-fade handled by screen.
// ───────────────────────────────────────────────────────────────────────────

export const VOICE: ReadonlyArray<{ t: number; text: string }> = [
  { t: 300, text: 'Looking…' },
  { t: 1500, text: 'your skin, in good light…' },
  { t: 2900, text: 'reading texture and tone…' },
];

/** Shown if SETTLE elapses while analysis is still pending. */
export const CONSIDERING_LINE = 'Almost there…';

export const ORIENT_TITLE = 'Okay. I looked closely.\nHere’s what your skin’s telling me.';
export const ORIENT_CTA = 'See what I found';

/** Honest handoff (unusable photo). retakeReason from the canonical scan
 *  quality message overrides the first line when present. */
export const HANDOFF_FALLBACK_REASON =
  'It was a little dark for me to read your skin clearly.';
export const HANDOFF_TIP = 'Try facing a window, in even, indirect light.';
export const HANDOFF_CTA = 'Retake';

// ───────────────────────────────────────────────────────────────────────────
// WORKLET MATH — easeInOutCubic everywhere. Pure number helpers.
// ───────────────────────────────────────────────────────────────────────────

/** easeInOutCubic. */
export function easeIO(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/**
 * Sample the gaze PATH at time t → {x, y} in PERCENT of the frame.
 * Piecewise eased between keyframes; clamps to the first/last key outside range.
 */
export function sample(path: GazeKey[], t: number): { x: number; y: number } {
  'worklet';
  const n = path.length;
  if (t <= path[0].t) return { x: path[0].x, y: path[0].y };
  if (t >= path[n - 1].t) return { x: path[n - 1].x, y: path[n - 1].y };
  for (let i = 0; i < n - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const k = span <= 0 ? 0 : easeIO((t - a.t) / span);
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
    }
  }
  return { x: path[n - 1].x, y: path[n - 1].y };
}

/**
 * Sample a scalar envelope at time t. Piecewise eased; clamps at both ends.
 */
export function env(stops: Stops, t: number): number {
  'worklet';
  const n = stops.length;
  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[n - 1][0]) return stops[n - 1][1];
  for (let i = 0; i < n - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const span = b[0] - a[0];
      const k = span <= 0 ? 0 : easeIO((t - a[0]) / span);
      return lerp(a[1], b[1], k);
    }
  }
  return stops[n - 1][1];
}
