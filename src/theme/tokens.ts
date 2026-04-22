/**
 * Pura design tokens — v5 editorial rebuild.
 *
 * Warm off-white surfaces. Terracotta brand. Instrument Serif for every hero
 * moment. Inter for functional UI. This file is the ONLY legitimate home for
 * hex color literals.
 *
 *   grep '#[0-9A-Fa-f]\{3,6\}' src --exclude-dir=theme
 *
 * The result must be empty.
 */

import type { TextStyle, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

type Scheme = 'light' | 'dark';

// ---------- Palette ----------
// Surfaces, text, brand, semantic. Named for material (clay, sand, moss,
// rust, amber) not for function (primary/secondary/accent) — the naming is
// part of the editorial voice.

export const palette = {
  // Surfaces
  bg: '#FAF7F4',          // warm off-white — every screen's default
  bgDeep: '#F4EFEA',      // stepped-down surface for contrast
  bgInk: '#1A1614',       // inverse surface (scan capture, sheets at night)
  bgInkElevated: '#2A2420',

  // Text
  ink: '#1A1614',
  inkSecondary: '#5C544E',
  inkTertiary: '#8E8680',
  inkInverse: '#FAF7F4',

  // Brand — clay is the primary, coral only highlights
  clay: '#C65D48',
  clayDeep: '#A04632',
  clayLight: '#E8C4B8',
  clayPaper: '#F5E4DD',

  coral: '#E85A4F',
  coralGlow: 'rgba(232, 90, 79, 0.28)',

  sand: '#D4A574',
  sandLight: '#EADDC8',
  sandPaper: '#F5EDE0',

  // Semantic — warm-toned variants
  moss: '#6B8E4E',
  mossLight: '#DDE7CF',
  mossDeep: '#4A6B32',
  amber: '#D97706',
  amberLight: '#FDE6C8',
  amberDeep: '#9A5308',
  rust: '#B23A2F',
  rustLight: '#F5DAD5',

  // Structure
  hairline: '#E5DDD3',
  divider: '#EADDD2',
  scrim: 'rgba(26, 22, 20, 0.55)',
  scrimSoft: 'rgba(26, 22, 20, 0.25)',

  // Utility
  grainOverlay: 'rgba(26, 22, 20, 0.03)',
  shadowTint: '#1A1614',
} as const;

export type Palette = typeof palette;

// Alias so the hundreds of `colors.bg`-style call sites still resolve. The
// v5 recommendation is to import `palette` in new code.
export const colors = {
  // Surfaces (v5 vocabulary)
  bg: palette.bg,
  bgElevated: palette.bgDeep,
  bgSubtle: palette.bgDeep,
  bgDeep: palette.bgDeep,
  bgInk: palette.bgInk,
  bgInkElevated: palette.bgInkElevated,
  surface: palette.bg,

  // Text
  textPrimary: palette.ink,
  textSecondary: palette.inkSecondary,
  textTertiary: palette.inkTertiary,
  textInverse: palette.inkInverse,
  ink: palette.ink,
  inkSecondary: palette.inkSecondary,
  inkTertiary: palette.inkTertiary,
  inkInverse: palette.inkInverse,

  // Brand
  accent: palette.clay,          // v5: "accent" now means clay
  accentLight: palette.clayLight,
  accentDark: palette.clayDeep,
  accentPaper: palette.clayPaper,
  accentGlow: palette.coralGlow,
  clay: palette.clay,
  clayDeep: palette.clayDeep,
  clayLight: palette.clayLight,
  clayPaper: palette.clayPaper,
  coral: palette.coral,
  coralGlow: palette.coralGlow,
  sand: palette.sand,
  sandLight: palette.sandLight,
  sandPaper: palette.sandPaper,

  // Semantic
  success: palette.moss,
  successLight: palette.mossLight,
  successDark: palette.mossDeep,
  warning: palette.amber,
  warningLight: palette.amberLight,
  warningDark: palette.amberDeep,
  danger: palette.rust,
  dangerLight: palette.rustLight,
  moss: palette.moss,
  mossLight: palette.mossLight,
  amber: palette.amber,
  amberLight: palette.amberLight,
  rust: palette.rust,
  rustLight: palette.rustLight,

  // Structure
  border: palette.hairline,
  borderLight: palette.divider,
  borderStrong: palette.hairline,
  hairline: palette.hairline,
  divider: palette.divider,
  scrim: palette.scrim,
  scrimLight: palette.scrimSoft,
  overlayWeak: palette.grainOverlay,
  overlayStrong: palette.scrim,
  shimmer: 'rgba(255,255,255,0.08)',
  shadowTint: palette.shadowTint,
  grainOverlay: palette.grainOverlay,
};

export type ColorPalette = typeof colors;

// Dark palette kept for future flip — v5 ships light-only.
export const darkColors: ColorPalette = {
  ...colors,
  bg: palette.bgInk,
  bgElevated: palette.bgInkElevated,
  bgSubtle: palette.bgInkElevated,
  bgDeep: palette.bgInkElevated,
  surface: palette.bgInkElevated,
  textPrimary: palette.inkInverse,
  textSecondary: '#A39890',
  textTertiary: '#6F6861',
  textInverse: palette.ink,
  ink: palette.inkInverse,
  inkSecondary: '#A39890',
  inkTertiary: '#6F6861',
  inkInverse: palette.ink,
  hairline: '#332D29',
  border: '#332D29',
  borderLight: '#2A2420',
  divider: '#2A2420',
};

export const lightColors = colors;
export const colorsFor = (scheme: Scheme): ColorPalette =>
  scheme === 'dark' ? darkColors : lightColors;

// ---------- Spacing, radius ----------

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// v5: squarer radii — pills are reserved for true pill shapes (tags),
// cards step down to md (12) not lg (16).
export const radius = {
  sq: 4,        // buttons, status pills — intentionally squarer
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

// ---------- Typography ----------
// Dual-family system. `InstrumentSerif-*` fonts need to be registered via
// expo-font (see App.tsx). If they fail to load, `fontFamily` falls back to
// the platform serif (Times New Roman on iOS, Noto Serif on Android), which
// still reads editorial — just less distinctive.

const SERIF = 'InstrumentSerif-Regular';
const SERIF_ITALIC = 'InstrumentSerif-Italic';
const SANS_REG = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';
const SANS_BOLD = 'Inter-Bold';

export const type = {
  // ===== Editorial serif — hero moments =====
  displaySerif: {
    fontFamily: SERIF,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -1.5,
  },
  heroSerif: {
    fontFamily: SERIF,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.0,
  },
  titleSerif: {
    fontFamily: SERIF,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  italicSerif: {
    fontFamily: SERIF_ITALIC,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  italicLead: {
    fontFamily: SERIF_ITALIC,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  },

  // ===== UI sans =====
  subhead: {
    fontFamily: SANS_SEMI,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: SANS_SEMI,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: SANS_REG,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMed: {
    fontFamily: SANS_MED,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 20,
  },
  captionMed: {
    fontFamily: SANS_MED,
    fontSize: 14,
    lineHeight: 20,
  },
  micro: {
    fontFamily: SANS_SEMI,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  tabLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  // ===== Data display =====
  dataDisplay: {
    fontFamily: SERIF,
    fontSize: 72,
    lineHeight: 72,
    letterSpacing: -2.5,
  },
  dataLarge: {
    fontFamily: SERIF,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.5,
  },
  dataMed: {
    fontFamily: SANS_BOLD,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
} as const satisfies Record<string, TextStyle>;

export const typeMaxScale = {
  displaySerif: 1.15,
  heroSerif: 1.2,
  titleSerif: 1.2,
  italicSerif: 1.2,
  italicLead: 1.25,
  subhead: 1.3,
  heading: 1.3,
  body: 1.3,
  bodyMed: 1.3,
  bodyBold: 1.3,
  caption: 1.3,
  captionMed: 1.3,
  micro: 1.1,
  tabLabel: 1.0,
  dataDisplay: 1.1,
  dataLarge: 1.15,
  dataMed: 1.2,
} as const;

// ---------- Shadows ----------
// Warm-toned, not gray. Layered for premium surfaces.

type SingleShadow = ViewStyle;

export interface LayeredShadowDef {
  outer: SingleShadow;
  inner: SingleShadow;
}

const shadowBase = palette.shadowTint;

export const shadow: {
  none: SingleShadow;
  subtle: SingleShadow;
  sm: SingleShadow;
  md: SingleShadow;
  card: LayeredShadowDef;
  hero: LayeredShadowDef;
  mark: LayeredShadowDef;
  fab: LayeredShadowDef;
} = {
  none: { shadowOpacity: 0, elevation: 0 },
  subtle: {
    shadowColor: shadowBase,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sm: {
    shadowColor: shadowBase,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: shadowBase,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  card: {
    outer: {
      shadowColor: shadowBase,
      shadowOpacity: 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.03,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
  },
  hero: {
    outer: {
      shadowColor: shadowBase,
      shadowOpacity: 0.10,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 16 },
      elevation: 14,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
  },
  mark: {
    outer: {
      shadowColor: palette.clay,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  },
  fab: {
    outer: {
      shadowColor: palette.clay,
      shadowOpacity: 0.35,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 14,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  },
};

// Pressed tints (internal to PrimaryButton — keep outside ColorPalette).
export const pressedTints = {
  primary: '#151110',
  accent: palette.clayDeep,
  success: palette.mossDeep,
} as const;

// ---------- Motion ----------
// One deliberate spring. No bouncy material variants.

export const easing = {
  // Editorial "settle" — our go-to for numbers and reveals
  backEaseOut: Easing.bezier(0.22, 1, 0.36, 1),
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0, 1, 1),
};

export const motion = {
  micro: { duration: 120, easing: easing.standard },
  fast: { duration: 180, easing: easing.standard },
  base: { duration: 260, easing: easing.emphasized },
  screen: { duration: 340, easing: easing.emphasized },
  slow: { duration: 420, easing: easing.emphasized },
  photoSettle: { duration: 600, easing: easing.backEaseOut },
  numberSettle: { duration: 800, easing: easing.backEaseOut },
  markIdle: { duration: 4000, easing: Easing.inOut(Easing.sin) },
} as const;

export const spring = {
  default: { damping: 22, stiffness: 140, mass: 1 },
  mark: { damping: 18, stiffness: 90, mass: 1.2 },
  shutter: { damping: 20, stiffness: 300, mass: 0.8 },
};

// ---------- Avatar swatches ----------
// Warm palette — coral-y reds, amber, moss, sand tones. No pure rainbows.
export const avatarSwatches = [
  palette.clay,        // clay (default)
  palette.sand,        // sand
  palette.moss,        // moss
  '#8A6E52',           // taupe
  '#7A5E4F',           // warm brown
  palette.coral,       // coral
] as const;

export type AvatarColor = (typeof avatarSwatches)[number];

// ---------- Layout ----------

export const layout = {
  tabBarHeight: 60,
  fabSize: 68,
  fabRingWidth: 4,
  avatarSize: 32,
  minHitTarget: 44,
  screenHorizontalPadding: 24,
  markBaseline: 28,
  markInset: 20,
} as const;

// ---------- Misc ----------
export const SKIN_CYCLE_DAYS = 84;

// Font family tokens — exported so non-type-token code (e.g. Phosphor labels)
// can pull them without reaching into the type table.
// `serifSemi` was added for the v7.7 scan-analyzing hero typography; it resolves
// to a real TTF dropped into assets/fonts (see App.tsx font loader) and falls
// back to the platform serif until that TTF ships.
export const fontFamily = {
  serif: SERIF,
  serifItalic: SERIF_ITALIC,
  serifSemi: 'InstrumentSerif-SemiBold',
  sans: SANS_REG,
  sansMed: SANS_MED,
  sansSemi: SANS_SEMI,
  sansBold: SANS_BOLD,
} as const;

// ---------- Scan analysis color tokens (v7.7) ----------
// The cinematic analyzing screen uses two closed palettes — one per finding
// type (the pulsing detection markers), one per zone status tier (score
// bubbles). These are additive to `palette` so nothing existing has to move.

export const analysisMarkers = {
  dryness: '#D99E6C',
  texture: '#C65D48',
  barrier: '#7A9476',
  hydration: '#6B8E7F',
  redness: '#C4705A',
  clarity: '#A8B896',
} as const;

export type AnalysisMarkerType = keyof typeof analysisMarkers;

export const status = {
  calm: '#7A9476',
  monitor: '#D99E6C',
  active: '#C65D48',
} as const;

export type StatusTier = keyof typeof status;

// ---------- Scan typography (v7.7, additive) ----------
// Scoped to the scan-analyzing screen; keeps `type` above untouched. Each
// entry is a full TextStyle that a Text can spread.

export const scanTypography = {
  // Header kicker — "ANALYZING · READING YOUR SKIN" / "READING COMPLETE"
  headerKicker: {
    fontFamily: SANS_SEMI,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  // Mid-flight captions — italic serif, left-aligned with photo
  captionItalic: {
    fontFamily: SERIF_ITALIC,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  // Waiting caption (AI pending after Beat 6)
  captionWaiting: {
    fontFamily: SERIF_ITALIC,
    fontSize: 17,
    lineHeight: 23,
  },
  // Roman caption at reveal — "Your reading is ready." (used inside reveal copy)
  captionRoman: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  // Zone label pill — "FOREHEAD / T-ZONE / CHEEKS / CHIN"
  zoneLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  // Score bubble number
  scoreNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.6,
  },
  // Score bubble status word
  scoreStatus: {
    fontFamily: SANS_SEMI,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  // Detection marker label pill
  markerLabel: {
    fontFamily: SERIF_ITALIC,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  // Reveal footer headline — "Your reading is ready."
  revealHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  // Reveal footer overall score — 40pt terracotta
  revealOverallNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  revealOverallKicker: {
    fontFamily: SANS_SEMI,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  revealSummary: {
    fontFamily: SERIF_ITALIC,
    fontSize: 14,
    lineHeight: 20,
  },
  // Error state headline
  errorHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: 'center' as const,
  },
  errorBody: {
    fontFamily: SERIF_ITALIC,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center' as const,
  },
} as const satisfies Record<string, TextStyle>;

export type ScanTypographyKey = keyof typeof scanTypography;
