/**
 * motion.ts — the single DIAL BOARD for the First-Finding screen.
 *
 * Timeline, the analyzing gaze-sweep path, status copy, the two complete themes
 * (DARK is the hero), the type scale, the 8pt spacing rhythm, and the raised
 * two-shadow depth — all tunable in one place. The screen + every sub-component
 * read from here so the choreography stays coherent.
 */

import type { TextStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';
import type { ScreenTheme } from './metricTint';

// ───────────────────────────────────────────────────────────────────────────
// 1 · TIMELINE (ms). Analyzing lasts the REAL API duration — these are the
//     beat lengths AFTER the response arrives, plus the looping sweep cadence.
// ───────────────────────────────────────────────────────────────────────────

export const TIMELINE = {
  /** Each gaze-sweep zone dwell while analyzing (loops forever until ready). */
  sweepZoneMs: 1100,
  /** Status line cross-fade cadence. */
  statusLineMs: 2200,
  /** After this long still analyzing → show the patient "closer look" line. */
  longCallMs: 9000,
  /** Sweep gathers to center at the pivot. */
  gatherMs: 360,
  /** Shared-element photo resize (78%→62% + rise). */
  pivotMs: 520,
  /** Orb "got it" beat before any word. */
  gotItMs: 500,
  /** Opening-line word reveal. */
  wordStaggerMs: 60, // brief: ~55; 60 reads a hair calmer for serif
  wordDurationMs: 460,
  /** Glow bloom per spot. */
  bloomMs: 600,
  bloomStaggerMs: 120,
  /** Finding card settle, ~120ms after the first glow. */
  cardDelayMs: 120,
  cardMs: 360,
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 2 · GAZE SWEEP PATH — soft attention drifting over the face while analyzing.
//     Normalized within the FACE BOX (0..1). forehead → cheeks → nose →
//     under-eyes → chin, looping. NOT a scan line.
// ───────────────────────────────────────────────────────────────────────────

export const SWEEP_PATH: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.5, y: 0.14 }, // forehead
  { x: 0.28, y: 0.56 }, // left cheek
  { x: 0.72, y: 0.56 }, // right cheek
  { x: 0.5, y: 0.52 }, // nose
  { x: 0.5, y: 0.46 }, // under-eyes
  { x: 0.5, y: 0.9 }, // chin
];

// ───────────────────────────────────────────────────────────────────────────
// 3 · STATUS LINES — transparency of process. Cross-fade; no %, no countdown.
// ───────────────────────────────────────────────────────────────────────────

export const STATUS_LINES: readonly string[] = [
  'Looking at your skin…',
  'Checking for redness…',
  'Looking at your cheeks and forehead…',
  'Comparing your left and right side…',
  'Almost there…',
];

export const STATUS_LONG_CALL = 'Taking a closer look…';

// ───────────────────────────────────────────────────────────────────────────
// 4 · COPY — buttons + privacy. Plain words only.
// ───────────────────────────────────────────────────────────────────────────

export const COPY = {
  seeEverything: 'See everything',
  tryBetterLight: 'Try in better light',
  showAnyway: 'Show me anyway',
  tryAgain: 'Try again',
  /** Honest privacy line. The photo IS sent to our AI provider to read the
   *  skin (the app's own Privacy screen says so), so we must NOT claim "never
   *  shared" — only that it isn't stored after the read. */
  privacy:
    'Your photo is sent securely to read your skin, then it’s never stored.',
  errorTitle: 'I couldn’t quite finish that read — let’s try once more.',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 5 · LAYOUT — 8pt grid, 24px side gutters.
// ───────────────────────────────────────────────────────────────────────────

export const LAYOUT = {
  gutter: 24,
  photoWidthFractionAnalyzing: 0.78,
  photoWidthFractionFinding: 0.62,
  photoAspect: 3 / 4, // w/h
  photoCenterYFraction: 0.44, // analyzing vertical center
  photoRiseFraction: 0.08, // rise at the pivot
  orbToPhoto: 20,
  photoToLine: 24,
  lineToCard: 28,
  cardPadding: 18,
  cardRowGap: 10,
  cardToCta: 32,
  ctaToHomeIndicator: 24,
  photoRadius: 28,
  cardRadius: 22,
  // Photo "muting" while analyzing so glows read as ADDED light.
  analyzingDesaturate: 0.06,
  analyzingDim: 0.08,
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 6 · DEPTH — raised = two stacked shadows + hairline + 1% gradient surface.
// ───────────────────────────────────────────────────────────────────────────

export interface RaisedDepth {
  contact: { color: string; offsetY: number; blur: number };
  ambient: { color: string; offsetY: number; blur: number };
  hairline: string;
  /** 1% vertical-gradient white surface (top → bottom). */
  surface: [string, string];
  innerHighlight: string;
}

// ───────────────────────────────────────────────────────────────────────────
// 7 · THEME TOKENS — both fully designed; DARK is the default hero.
// ───────────────────────────────────────────────────────────────────────────

export interface ThemeTokens {
  theme: ScreenTheme;
  /** Page base + the radial lift behind the orb. */
  bg: string;
  bgLift: string;
  /** Photo frame fill + top-lit hairline. */
  frame: string;
  frameHairline: string;
  /** Card surface (solid) + raised depth recipe. */
  cardSurface: string;
  depth: RaisedDepth;
  /** Text. */
  line: string; // orb voice + opening line
  status: string;
  body: string;
  label: string;
  name: string;
  faint: string;
  accent: string; // Pura Blue — UI/action ONLY
  /** Status-bar style. */
  barStyle: 'light' | 'dark';
}

const PURA_BLUE = '#147CFF';

const DARK: ThemeTokens = {
  theme: 'dark',
  bg: '#0A0B12',
  bgLift: '#101218',
  frame: '#16181F',
  frameHairline: 'rgba(255,255,255,0.08)',
  cardSurface: '#1C1E28',
  depth: {
    contact: { color: 'rgba(0,0,0,0.30)', offsetY: 1, blur: 2 },
    ambient: { color: 'rgba(0,0,0,0.45)', offsetY: 10, blur: 28 },
    hairline: 'rgba(255,255,255,0.07)',
    surface: ['#20222D', '#1A1C25'],
    innerHighlight: 'rgba(255,255,255,0.05)',
  },
  line: 'rgba(255,255,255,0.94)',
  status: 'rgba(255,255,255,0.6)',
  body: 'rgba(255,255,255,0.9)',
  label: 'rgba(255,255,255,0.55)',
  name: 'rgba(255,255,255,0.96)',
  faint: 'rgba(255,255,255,0.4)',
  accent: '#3D90FF', // blue[400] — a touch brighter so it reads on near-black
  barStyle: 'light',
};

const LIGHT: ThemeTokens = {
  theme: 'light',
  bg: '#FCFDFF',
  bgLift: '#F4F8FE',
  frame: '#FFFFFF',
  frameHairline: 'rgba(8,10,15,0.06)',
  cardSurface: '#FFFFFF',
  depth: {
    contact: { color: 'rgba(8,10,15,0.04)', offsetY: 1, blur: 2 },
    ambient: { color: 'rgba(8,10,15,0.05)', offsetY: 10, blur: 28 },
    hairline: 'rgba(8,10,15,0.06)',
    surface: ['#FFFFFF', '#FBFCFE'],
    innerHighlight: 'rgba(255,255,255,0.9)',
  },
  line: '#101418',
  status: '#6E6E73',
  body: '#22252B',
  label: '#6E6E73',
  name: '#080A0F',
  faint: '#9A9AA0',
  accent: PURA_BLUE,
  barStyle: 'dark',
};

export function tokensFor(theme: ScreenTheme): ThemeTokens {
  return theme === 'dark' ? DARK : LIGHT;
}

// ───────────────────────────────────────────────────────────────────────────
// 8 · TYPE — exact scale from the brief.
// ───────────────────────────────────────────────────────────────────────────

const SERIF = 'InstrumentSerif-Regular';
const INTER = 'Inter-Regular';
const INTER_MED = 'Inter-Medium';
const INTER_SEMI = 'Inter-SemiBold';

export const TYPE = {
  /** Opening line + orb voice. */
  voice: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.4,
  } satisfies TextStyle,
  /** Analyzing status lines (muted). */
  status: {
    fontFamily: SERIF,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  /** Finding name. */
  name: {
    fontFamily: INTER_SEMI,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  /** Card body + micro-row values. */
  body: {
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** Micro-row labels ("What I see", "THE MOVE"). */
  rowLabel: {
    fontFamily: INTER_MED,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** "THE MOVE" uppercase eyebrow. */
  moveLabel: {
    fontFamily: INTER_MED,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,
  /** Confidence row (italic, muted). */
  confidence: {
    fontFamily: INTER,
    fontStyle: 'italic' as const,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
  /** Level pill word. */
  pill: {
    fontFamily: INTER_SEMI,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** On-photo location chip. */
  chip: {
    fontFamily: INTER_MED,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: -0.1,
  } satisfies TextStyle,
  /** CTA. */
  cta: {
    fontFamily: INTER_SEMI,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  } satisfies TextStyle,
} as const;

// ───────────────────────────────────────────────────────────────────────────
// 9 · EASINGS.
// ───────────────────────────────────────────────────────────────────────────

export const EASE = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  io: Easing.inOut(Easing.cubic),
  standard: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

/** Glow alpha hard cap (additive). Low-confidence halves the per-spot target. */
export const GLOW_ALPHA_CAP = 0.32;
