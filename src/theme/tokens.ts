/**
 * Pura design tokens — v8 cool premium-software rebrand.
 *
 * Cool white surfaces, refined azure brand, slate ink. Instrument Serif
 * preserved for hero numbers + editorial moments; Inter carries the UI.
 * This file is the ONLY legitimate home for hex color literals.
 *
 *   grep '#[0-9A-Fa-f]\{3,6\}' src --exclude-dir=theme
 *
 * The result must be empty.
 *
 * NOTE on the naming: the legacy material names (`clay`, `sand`, `moss`,
 * `rust`, `amber`, `coral`) are retained so every existing call site still
 * resolves, but the HEX values are now cool. `clay` is now the brand azure.
 * New code should prefer the semantic `brand*` / `success*` / `warning*` /
 * `danger*` aliases in `colors` below.
 */

import type { TextStyle, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

type Scheme = 'light' | 'dark';

// ---------- Palette ----------
// Surfaces, text, brand, semantic. v8 is built on three families: cool
// neutrals (bg/ink), a single azure brand line (clay → brand), and three
// restrained semantic families (moss=success, amber=warning, rust=danger).

export const palette = {
  // Surfaces — cool off-white. Never pure #FFFFFF.
  bg: '#F8FAFC',          // primary surface, subtle cool tint
  bgDeep: '#EEF2F7',      // elevated mist gray with blue undertone
  bgInk: '#0B1220',       // inverse surface (scan capture, sheets at night)
  bgInkElevated: '#131C2E',

  // Text — cool graphite scale
  ink: '#0B1220',
  inkSecondary: '#475569',
  inkTertiary: '#94A3B8',
  inkInverse: '#F8FAFC',

  // Brand — clay is now refined azure. `clayDeep` is cobalt, used sparingly
  // for max-contrast surfaces. `clayLight` is an icy blue tint. `clayPaper`
  // is a near-white blue-tinted surface.
  clay: '#2B7FFF',
  clayDeep: '#1560E5',
  clayLight: '#DCE9FF',
  clayPaper: '#EEF4FF',

  // `coral` was a near-sibling to clay; now it's an alias to brand so any
  // lingering `palette.coral` call sites render the same azure.
  coral: '#2B7FFF',
  coralGlow: 'rgba(43, 127, 255, 0.24)',

  // `sand` was the secondary warm tint; now it's a cool neutral used for
  // tabs, tiles, and soft surfaces that need a bit more weight than the
  // base bg.
  sand: '#CBD5E1',
  sandLight: '#E2E8F0',
  sandPaper: '#F1F5F9',

  // Semantic — harmonized with the cool palette. Success is a forest sage
  // with cool undertone; warning is muted amber; danger is a clean clinical
  // red that doesn't scream.
  moss: '#4C9B7A',
  mossLight: '#E2EDE7',
  mossDeep: '#2C7052',
  amber: '#D4A55E',
  amberLight: '#F5E8CC',
  amberDeep: '#997038',
  rust: '#D64545',
  rustLight: '#FCE0D9',

  // Structure — cool hairlines. `hairline` is the visible divider; `divider`
  // is softer, used as a row-separator that shouldn't compete with content.
  hairline: '#E2E8F0',
  divider: '#EEF2F7',
  scrim: 'rgba(11, 18, 32, 0.55)',
  scrimSoft: 'rgba(11, 18, 32, 0.25)',

  // Utility
  grainOverlay: 'rgba(11, 18, 32, 0.02)',
  shadowTint: '#0B1220',
} as const;

export type Palette = typeof palette;

// ---------- Semantic color API ----------
// `colors` is the semantic layer — code that doesn't care whether brand is
// "clay" or "azure" should pull from here. Declared as a plain `string`
// record so the two schemes (`lightColors` / `darkColors`) can freely assign
// different values to the same keys without literal-type collisions (this
// was the pre-existing TS regression we're fixing along the way).

export interface ColorPalette {
  // Surfaces
  bg: string;
  bgElevated: string;
  bgSubtle: string;
  bgDeep: string;
  bgInk: string;
  bgInkElevated: string;
  surface: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  inkInverse: string;

  // Brand (v8 semantic — prefer these in new code)
  brand: string;
  brandDeep: string;
  brandLight: string;
  brandPaper: string;
  brandGlow: string;
  // Legacy brand aliases (warm-era names retained so existing call sites
  // don't have to move; point to the cool system)
  accent: string;
  accentLight: string;
  accentDark: string;
  accentPaper: string;
  accentGlow: string;
  clay: string;
  clayDeep: string;
  clayLight: string;
  clayPaper: string;
  coral: string;
  coralGlow: string;
  sand: string;
  sandLight: string;
  sandPaper: string;

  // Semantic
  success: string;
  successLight: string;
  successDark: string;
  warning: string;
  warningLight: string;
  warningDark: string;
  danger: string;
  dangerLight: string;
  // Legacy semantic aliases
  moss: string;
  mossLight: string;
  amber: string;
  amberLight: string;
  rust: string;
  rustLight: string;

  // Structure
  border: string;
  borderLight: string;
  borderStrong: string;
  hairline: string;
  divider: string;
  scrim: string;
  scrimLight: string;
  overlayWeak: string;
  overlayStrong: string;
  shimmer: string;
  shadowTint: string;
  grainOverlay: string;
}

export const colors: ColorPalette = {
  // Surfaces
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

  // Brand (semantic — new canonical names)
  brand: palette.clay,
  brandDeep: palette.clayDeep,
  brandLight: palette.clayLight,
  brandPaper: palette.clayPaper,
  brandGlow: palette.coralGlow,
  // Brand (legacy aliases — pointing to the same cool tokens)
  accent: palette.clay,
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
  shimmer: 'rgba(248,250,252,0.08)',
  shadowTint: palette.shadowTint,
  grainOverlay: palette.grainOverlay,
};

// Dark palette — retained for a future scheme flip, not shipped.
export const darkColors: ColorPalette = {
  ...colors,
  bg: palette.bgInk,
  bgElevated: palette.bgInkElevated,
  bgSubtle: palette.bgInkElevated,
  bgDeep: palette.bgInkElevated,
  surface: palette.bgInkElevated,
  textPrimary: palette.inkInverse,
  textSecondary: '#8E9AAE',
  textTertiary: '#586073',
  textInverse: palette.ink,
  ink: palette.inkInverse,
  inkSecondary: '#8E9AAE',
  inkTertiary: '#586073',
  inkInverse: palette.ink,
  hairline: '#1F2A3F',
  border: '#1F2A3F',
  borderLight: '#17213A',
  divider: '#17213A',
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
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sm: {
    shadowColor: shadowBase,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: shadowBase,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  card: {
    outer: {
      shadowColor: shadowBase,
      shadowOpacity: 0.04,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.02,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
  },
  hero: {
    outer: {
      shadowColor: shadowBase,
      shadowOpacity: 0.08,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
  },
  mark: {
    outer: {
      shadowColor: palette.clay,
      shadowOpacity: 0.20,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 3 },
      elevation: 8,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
  },
  fab: {
    outer: {
      shadowColor: palette.clay,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    inner: {
      shadowColor: shadowBase,
      shadowOpacity: 0.10,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
  },
};

// Pressed tints (internal to PrimaryButton — keep outside ColorPalette).
// Darkened values used when a button is held down; match the new cool system.
export const pressedTints = {
  primary: '#070B14',
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
// Cool palette — brand azure + moss + amber + slate tones.
export const avatarSwatches = [
  palette.clay,        // brand azure (default)
  palette.moss,        // forest sage
  palette.amber,       // muted amber
  '#6366F1',           // indigo
  '#64748B',           // slate
  '#36A3B3',           // teal
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

// ---------- Scan analysis color tokens (v8 cool-system) ----------
// The cinematic analyzing screen uses two closed palettes — one per finding
// type (the pulsing detection markers), one per zone status tier (score
// bubbles). Harmonized to the cool palette while keeping each finding
// distinguishable by hue.

export const analysisMarkers = {
  dryness: '#CA9B65',   // desaturated amber — dryness reads warm
  texture: '#2B7FFF',   // brand azure — texture is the headline metric
  barrier: '#4C9B7A',   // sage — a healthy barrier
  hydration: '#36A3B3', // teal — water-adjacent
  redness: '#D64545',   // clinical red
  clarity: '#8B94A8',   // slate — clean / neutral
} as const;

export type AnalysisMarkerType = keyof typeof analysisMarkers;

export const status = {
  calm: '#4C9B7A',      // mirrors palette.moss (success)
  monitor: '#D4A55E',   // mirrors palette.amber (warning)
  active: '#D64545',    // mirrors palette.rust (danger)
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
