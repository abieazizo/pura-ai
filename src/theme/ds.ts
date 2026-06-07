/**
 * ds — Pura mature design system (v36, Cycle 2 of the 20-cycle elevation loop).
 *
 * ONE canonical foundation layer that the elevation cycles (3–20) adopt. The
 * app historically grew eight per-surface token namespaces (pura26, pura27,
 * puraShop, puraShopHome, puraAssist, puraReveal, auroraOrb, puraRoutine);
 * those still resolve and are NOT touched. This module is the unified system
 * new/elevated code reads from: full color ramps, a real elevation/depth
 * system (the fix for the app-wide flat-material problem), time-of-day ambient
 * gradients, brand gradients, an expressive type scale, an 8pt spacing + radius
 * scale, and motion presets (springs + timings).
 *
 * Hex literals are allowed here — the CLAUDE.md grep guard
 * (`grep '#…' src --exclude-dir=theme`) excludes the whole theme dir, not just
 * tokens.ts. The ramp anchors stay faithful to the LOCKED brand DNA:
 *   Porcelain #FCFDFF · Ink #080A0F · Pura Blue #147CFF.
 * Where a ramp step coincides with an existing token (clayLight, clayDeep,
 * blueText, hairline…) the SAME hex is reused so the new system reads as a
 * deepening of the shipped palette, never a reskin.
 */

import type { TextStyle, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

const SERIF = 'InstrumentSerif-Regular';
const SERIF_SEMI = 'InstrumentSerif-SemiBold';
const SERIF_ITALIC = 'InstrumentSerif-Italic';
const SANS_REG = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';
const SANS_BOLD = 'Inter-Bold';

// ===========================================================================
// COLOR RAMPS
// ===========================================================================

/**
 * Pura Blue ramp — anchored on the locked #147CFF (500). Tints climb toward
 * the shipped clayPaper/clayLight; shades descend through clayDeep/blueText.
 * Use 50–200 for fills/washes, 500 for the accent, 600–900 for text-on-tint
 * and pressed states.
 */
export const blue = {
  50: '#EAF4FF',
  100: '#D5E6FF',
  200: '#A8C8FF',
  300: '#6FA8FF',
  400: '#3D90FF',
  500: '#147CFF', // LOCKED anchor — Pura Blue
  600: '#0B6AEB',
  700: '#075FD1',
  800: '#0A4DA1',
  900: '#063D8F',
  950: '#04275C',
} as const;

/**
 * Cool graphite / porcelain neutral ramp. 0 is the elevated white surface,
 * 25 the porcelain page, 900 the Ink. Mid steps coincide with the shipped
 * hairline / border / ink-scale tokens so existing surfaces stay consistent.
 */
export const neutral = {
  0: '#FFFFFF',
  25: '#FCFDFF', // LOCKED porcelain page
  50: '#F7FAFF',
  100: '#EEF4FB',
  150: '#E5EAF1', // hairline
  200: '#D4DCE8', // strong border
  300: '#B5BDC8',
  400: '#929BA8',
  500: '#7C8696',
  600: '#5D6673',
  700: '#3A4150',
  800: '#1B2230',
  900: '#080A0F', // LOCKED Ink
} as const;

/** Success — clinical green (improvement, safe, done). Faithful to #20A67A. */
export const success = {
  tint: '#E9F8F2',
  soft: 'rgba(32, 166, 122, 0.12)',
  300: '#7FD3B5',
  500: '#20A67A',
  700: '#188A65',
  text: '#0F6B4D',
} as const;

/** Warning — amber. Reserved for genuine cautions, never decoration. */
export const warning = {
  tint: '#FFF7E6',
  soft: 'rgba(197, 138, 29, 0.14)',
  300: '#E8C06A',
  500: '#C58A1D',
  700: '#956712',
  text: '#7A540E',
} as const;

/** Danger — red (redness, breakouts, irritation, destructive). */
export const danger = {
  tint: '#FFF0F0',
  soft: 'rgba(226, 77, 77, 0.12)',
  300: '#F0918F',
  500: '#E24D4D',
  700: '#C23636',
  text: '#9A2828',
} as const;

/** Info reuses the brand blue family (one accent, no second blue). */
export const info = {
  tint: blue[50],
  soft: 'rgba(20, 124, 255, 0.10)',
  300: blue[300],
  500: blue[500],
  700: blue[700],
  text: blue[900],
} as const;

/**
 * Semantic surface + text aliases — what most elevated components read. Keeps
 * call sites legible ("ds.textSecondary") instead of indexing raw ramps.
 */
export const ds = {
  // Surfaces
  page: neutral[25],
  pageDeep: '#F4F8FE',
  surface: neutral[0],
  surfaceSunken: neutral[50],
  surfaceTint: blue[50],
  ink: neutral[900],
  onInk: neutral[0],

  // Text
  textPrimary: neutral[900],
  textSecondary: neutral[600],
  textTertiary: neutral[500],
  textMuted: neutral[400],
  textOnAccent: neutral[0],

  // Brand
  accent: blue[500],
  accentDeep: blue[700],
  accentSoft: blue[50],
  accentText: blue[900],

  // Structure
  border: neutral[150],
  borderStrong: neutral[200],
  hairline: 'rgba(8, 22, 56, 0.06)',
  divider: '#EEF1F5',

  // Scrims
  scrim: 'rgba(8, 10, 15, 0.55)',
  scrimSoft: 'rgba(8, 10, 15, 0.28)',
  scrimFaint: 'rgba(8, 10, 15, 0.12)',

  // Shadow base (cool ink — never neutral gray)
  shadow: '#0A1A2F',
  glowBlue: 'rgba(20, 124, 255, 0.30)',
} as const;

export const ramps = { blue, neutral, success, warning, danger, info } as const;

// ===========================================================================
// ELEVATION — the fix for the app-wide flat-material problem.
//
// The shipped surfaces lifted with ~0.04 shadow opacity → almost no
// figure-ground over porcelain. This ramp uses a cool-ink shadow with a
// real opacity/blur progression so a card visibly floats. Components should
// step UP a level vs. what they use today (resting card = e2, not e1).
// `elevation` is set for Android parity; web maps shadow* → boxShadow.
// ===========================================================================

export const dsElevation = {
  e0: { shadowColor: ds.shadow, shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  /** Hairline lift — chips, quiet rows. */
  e1: { shadowColor: ds.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  /** Resting card — the new default. Genuinely separates from the page. */
  e2: { shadowColor: ds.shadow, shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  /** Raised — hero cards, sheets at rest, lifted swipe card. */
  e3: { shadowColor: ds.shadow, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  /** Floating — FAB, active dragged card, popovers. */
  e4: { shadowColor: ds.shadow, shadowOpacity: 0.16, shadowRadius: 36, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  /** Modal / spotlight. */
  e5: { shadowColor: ds.shadow, shadowOpacity: 0.22, shadowRadius: 48, shadowOffset: { width: 0, height: 24 }, elevation: 18 },
  /** Brand glow — accented controls (scan FAB, active recommend). */
  glow: { shadowColor: blue[500], shadowOpacity: 0.30, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  glowSoft: { shadowColor: blue[500], shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
} as const satisfies Record<string, ViewStyle>;

export type ElevationLevel = keyof typeof dsElevation;

// ===========================================================================
// AMBIENT — time-of-day atmosphere (powers Routine AM/PM, Home mood).
//
// Each period is a top→bottom porcelain gradient (`sky`), a `glow` the surface
// can bloom behind a hero, an `accent`, and an `onAtmosphere` ink. Light theme
// throughout — "night" dims and cools the porcelain, it does not go black.
// Consume `sky` with expo-linear-gradient; the arrays are ordered top→bottom.
// ===========================================================================

export type AmbientPeriod = 'dawn' | 'day' | 'dusk' | 'night';

export const dsAmbient: Record<
  AmbientPeriod,
  { sky: [string, string, string]; glow: string; accent: string; eyebrow: string }
> = {
  // AM — cool porcelain with a faint warm top-light. Fresh, awake.
  dawn: {
    sky: ['#FFFDFB', '#F6F8FF', '#EAF1FB'],
    glow: 'rgba(255, 214, 170, 0.16)',
    accent: blue[500],
    eyebrow: neutral[500],
  },
  // Bright neutral daylight — the default calm porcelain.
  day: {
    sky: ['#FCFDFF', '#F4F8FE', '#EAF2FB'],
    glow: 'rgba(20, 124, 255, 0.07)',
    accent: blue[500],
    eyebrow: neutral[500],
  },
  // PM — deeper, cooler porcelain leaning blue, NEVER violet. The locked DNA
  // forbids purple surface gradients; "winding down" reads as a calm, slightly
  // desaturated dusk-blue haze. (The onboarding orb keeps its own violet aura —
  // a small glowing object, deliberately separate from this surface vocabulary.)
  dusk: {
    sky: ['#F5F7FC', '#EAEEF7', '#DDE4EF'],
    glow: 'rgba(76, 116, 178, 0.13)',
    accent: blue[600],
    eyebrow: neutral[500],
  },
  // Night — dim, hushed, cool slate-blue porcelain (still a light surface).
  night: {
    sky: ['#EFF2F9', '#E4EAF3', '#D7DEEC'],
    glow: 'rgba(64, 92, 142, 0.15)',
    accent: blue[600],
    eyebrow: neutral[500],
  },
};

/** Map a 0–23 hour to a period. 5–11 dawn · 11–17 day · 17–21 dusk · else night. */
export function periodForHour(hour: number): AmbientPeriod {
  if (hour >= 5 && hour < 11) return 'dawn';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

/** Routine AM/PM → the two atmospheres the ritual surface should feel. */
export function ambientForRoutine(timeOfDay: 'am' | 'pm'): (typeof dsAmbient)[AmbientPeriod] {
  return timeOfDay === 'am' ? dsAmbient.dawn : dsAmbient.dusk;
}

// ===========================================================================
// GRADIENTS — brand sweeps (expo-linear-gradient `colors` arrays).
// ===========================================================================

export const dsGradient = {
  /** Pura Blue intelligence sweep — progress fills, the scan FAB, accents. */
  blueSweep: [blue[400], blue[500], blue[700]] as [string, string, string],
  /** Soft blue wash — hero card backgrounds, score arcs at rest. */
  blueWash: [blue[50], '#DCEBFF'] as [string, string],
  /** Score arc — health reads success→blue (good→great). */
  scoreArc: [success[500], blue[500]] as [string, string],
  /** Ink CTA — near-black with a whisper of cool, not flat #000. */
  inkCta: ['#11151E', '#05070B'] as [string, string],
  /** Porcelain veil — fades content into the page behind a floating dock. */
  pageVeil: ['rgba(252,253,255,0)', 'rgba(252,253,255,0.9)', '#FCFDFF'] as [string, string, string],
} as const;

// ===========================================================================
// TYPOGRAPHY — expressive editorial scale. Instrument Serif owns display +
// data moments; Inter carries UI. `tnum` is the tabular-figure modifier every
// metric/number must spread so digits don't jitter as they animate.
// ===========================================================================

export const dsType = {
  // Editorial serif — hero & display
  display: { fontFamily: SERIF_SEMI, fontSize: 48, lineHeight: 50, letterSpacing: -1.4 },
  displayItalic: { fontFamily: SERIF_ITALIC, fontSize: 44, lineHeight: 47, letterSpacing: -1.0 },
  title: { fontFamily: SERIF_SEMI, fontSize: 32, lineHeight: 35, letterSpacing: -0.8 },
  titleRoman: { fontFamily: SERIF, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },

  // Data — serif numerals at scale (scores, deltas, counts)
  dataHero: { fontFamily: SERIF_SEMI, fontSize: 72, lineHeight: 72, letterSpacing: -2.4 },
  dataLarge: { fontFamily: SERIF_SEMI, fontSize: 48, lineHeight: 50, letterSpacing: -1.4 },
  dataMed: { fontFamily: SANS_BOLD, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },

  // UI sans
  headline: { fontFamily: SANS_SEMI, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  subhead: { fontFamily: SANS_SEMI, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: SANS_REG, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodyMed: { fontFamily: SANS_MED, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodySm: { fontFamily: SANS_REG, fontSize: 14, lineHeight: 20 },
  bodySmMed: { fontFamily: SANS_MED, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: SANS_REG, fontSize: 12.5, lineHeight: 16 },
  button: { fontFamily: SANS_SEMI, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },

  // Eyebrow / label caps — tracked uppercase
  label: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  labelSm: {
    fontFamily: SANS_SEMI,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const satisfies Record<string, TextStyle>;

export type DsTypeKey = keyof typeof dsType;

/** Tabular figures — spread onto any animated/columnar number. */
export const tnum: TextStyle = { fontVariant: ['tabular-nums'] };

// ===========================================================================
// SPACING & RADIUS — 8pt base with 4pt half-steps.
// ===========================================================================

export const dsSpace = {
  none: 0,
  hair: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  mega: 56,
  giant: 64,
} as const;

export const dsRadius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999,
} as const;

// ===========================================================================
// MOTION — spring + timing presets. Springs are reanimated `withSpring`
// configs; timings pair a duration with an easing. One vocabulary so every
// surface animates with the same physical feel.
// ===========================================================================

export const dsSpring = {
  /** Crisp UI response — toggles, taps, tab swaps. */
  snappy: { damping: 26, stiffness: 320, mass: 0.9 },
  /** The default — cards, sheets, list entrances. */
  smooth: { damping: 24, stiffness: 180, mass: 1 },
  /** Slow settle — large hero moves, ambient shifts. */
  gentle: { damping: 30, stiffness: 120, mass: 1 },
  /** Celebratory overshoot — completion checkmarks, milestones. */
  bouncy: { damping: 13, stiffness: 210, mass: 1 },
  /** Press scale — tight, no overshoot. */
  press: { damping: 30, stiffness: 420, mass: 0.7 },
} as const;

export type SpringKey = keyof typeof dsSpring;

export const dsEasing = {
  /** Editorial settle — numbers, reveals (ease-out back-ish). */
  settle: Easing.bezier(0.22, 1, 0.36, 1),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const dsTiming = {
  micro: { duration: 120, easing: dsEasing.standard },
  fast: { duration: 180, easing: dsEasing.standard },
  base: { duration: 260, easing: dsEasing.emphasized },
  screen: { duration: 340, easing: dsEasing.emphasized },
  slow: { duration: 440, easing: dsEasing.emphasized },
  settle: { duration: 640, easing: dsEasing.settle },
  count: { duration: 900, easing: dsEasing.settle },
} as const;

/** Stagger helper — entrance delay for the Nth item in a list (capped). */
export function stagger(index: number, step = 60, max = 6): number {
  return Math.min(index, max) * step;
}

// ===========================================================================
// Z-INDEX — a small named stack so overlays don't fight with magic numbers.
// ===========================================================================

export const dsZ = {
  base: 0,
  raised: 1,
  sticky: 10,
  dock: 20,
  overlay: 100,
  sheet: 110,
  toast: 200,
} as const;
