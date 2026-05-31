/**
 * Pura design tokens — v31 "Pura Blue" rebrand.
 *
 * Premium white + perfect blue + black. Porcelain surfaces, ink type,
 * a single blue intelligence accent reserved for scan, AI, progress,
 * and active states. Instrument Serif preserved for editorial moments;
 * Inter carries the UI. This file is the ONLY legitimate home for hex
 * color literals.
 *
 *   grep '#[0-9A-Fa-f]\{3,6\}' src --exclude-dir=theme
 *
 * The result must be empty.
 *
 * NOTE on the naming: the legacy material names (`clay`, `sand`, `moss`,
 * `rust`, `amber`, `coral`, `terracotta`) are retained so every existing
 * call site resolves, but the HEX values are now COOL. `clay` and
 * `coral` and `terracotta` ALL resolve to the new Pura Blue (`#147CFF`).
 * `sand` is now a cool gray. `moss` stays as the success green, `amber`
 * stays as warning, `rust` stays as danger — semantic states are not
 * recolored. New code should prefer the semantic `brand*` / `success*` /
 * `warning*` / `danger*` aliases in `colors` below.
 */

import type { TextStyle, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

type Scheme = 'light' | 'dark';

// ---------- Palette ----------
// Surfaces, text, brand, semantic. v25 is built on three families: warm
// neutrals (paper/ink), a single terracotta brand line (clay → brand),
// and three restrained semantic families (sage=success, clay=warning,
// rust=danger).

export const palette = {
  // Surfaces — porcelain white. Never pure cold #FFFFFF, never warm cream.
  bg: '#FCFDFF',          // Page — primary surface (icy white)
  bgDeep: '#EEF6FF',      // Blue-wash elevated surface
  bgInk: '#05070B',       // Black — inverse surface
  bgInkElevated: '#111827',

  // Text — cool graphite scale (slightly blue-leaning ink)
  ink: '#080A0F',
  inkSecondary: '#5D6673',
  inkTertiary: '#929BA8',
  inkInverse: '#FFFFFF',

  // Brand — Pura Blue. The legacy `clay*` names are RETAINED so all
  // existing call sites resolve, but every value is now blue. `clayDeep`
  // is the pressed state; `clayLight` is the soft blue tint; `clayPaper`
  // is the blue wash for secondary surfaces.
  clay: '#147CFF',
  clayDeep: '#075FD1',
  clayLight: '#A8C8FF',
  clayPaper: '#EAF4FF',

  // `coral` legacy alias → also Pura Blue (no actual coral anywhere).
  coral: '#147CFF',
  coralGlow: 'rgba(20, 124, 255, 0.28)',

  // `sand` legacy alias → cool gray family used for inactive states,
  // dividers, and quiet surface accents. No warm taupe.
  sand: '#929BA8',
  sandLight: '#E5EAF1',
  sandPaper: '#F7FAFF',

  // Semantic — restrained, preserved meaning. Success stays green
  // (improvement, safety). Warning stays amber (only true warnings).
  // Danger stays red (redness, breakouts, irritation).
  moss: '#20A67A',
  mossLight: '#E9F8F2',
  mossDeep: '#188A65',
  amber: '#C58A1D',
  amberLight: '#FFF7E6',
  amberDeep: '#956712',
  rust: '#E24D4D',
  rustLight: '#FFF0F0',

  // Structure — cool hairlines. `hairline` is the visible divider;
  // `divider` is softer, used as a row-separator that shouldn't compete
  // with content.
  hairline: '#E5EAF1',
  divider: '#EEF1F5',
  scrim: 'rgba(8, 10, 15, 0.55)',
  scrimSoft: 'rgba(8, 10, 15, 0.25)',

  // Utility
  grainOverlay: 'rgba(8, 10, 15, 0.02)',
  shadowTint: '#0A1A2F',

  // v26 — home rebuild palette. Centralized per CLAUDE.md (theme/tokens
  // is the only legitimate home for hex literals). Reused by the home,
  // routine, and assistant nightly surfaces. Names retained for source
  // stability; values now cool/blue.
  paper:               '#FCFDFF',
  surfaceWarm:         '#FFFFFF',
  warmTint:            '#F7FAFF',
  inkPrimary:          '#080A0F',
  inkSecondary26:      '#5D6673',
  inkMuted:            '#7C8696',
  inkFaint:            '#B5BDC8',
  borderHairline:      '#E5EAF1',
  borderStrong26:      '#D4DCE8',
  terracotta:          '#147CFF',
  terracottaPressed:   '#075FD1',
  terracottaTint:      '#EAF4FF',
  terracottaSoft:      '#F3F8FF',
  terracottaText:      '#063D8F',
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
  textSecondary: '#C2C8D2',
  textTertiary: '#828B98',
  textInverse: palette.ink,
  ink: palette.inkInverse,
  inkSecondary: '#C2C8D2',
  inkTertiary: '#828B98',
  inkInverse: palette.ink,
  hairline: '#2A303B',
  border: '#2A303B',
  borderLight: '#1F242E',
  divider: '#1F242E',
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
// Darkened values used when a button is held down; match the cool system.
export const pressedTints = {
  primary: '#0A0C12',
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
// Cool palette — Pura Blue + supporting cool tones. No warm taupes.
export const avatarSwatches = [
  palette.clay,        // Pura Blue (default)
  palette.moss,        // success green
  '#18B7FF',           // cyan
  '#5D6673',           // cool body
  '#929BA8',           // cool muted
  '#A8C8FF',           // pale blue
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

/**
 * v26 home rebuild — semantic tokens. Components in `src/components/home`
 * and the new `HomeScreen` MUST read from this object instead of inlining
 * hex values. Adding/removing a color here is the only legitimate way to
 * shift the visual language of the home experience.
 *
 * Translucent variants are named after their semantic use, not their
 * underlying color, so a designer reading a component can tell what role
 * the rgba is playing without decoding the alpha math.
 */
export const pura26 = {
  // Solid surfaces
  paper:             palette.paper,
  surface:           palette.surfaceWarm,
  warmTint:          palette.warmTint,

  // Ink
  ink:               palette.inkPrimary,
  inkSecondary:      palette.inkSecondary26,
  inkMuted:          palette.inkMuted,
  inkFaint:          palette.inkFaint,

  // Structure
  border:            palette.borderHairline,
  borderStrong:      palette.borderStrong26,

  // Brand family — legacy `terracotta*` names retained, values are
  // now Pura Blue.
  terracotta:        palette.terracotta,
  terracottaPressed: palette.terracottaPressed,
  terracottaTint:    palette.terracottaTint,
  terracottaSoft:    palette.terracottaSoft,
  terracottaText:    palette.terracottaText,

  // Translucent variants — named by use, not alpha math. Now use a
  // Pura Blue base so MirrorPortal aura, FloatingTabBar tint, paused
  // routine marker rings, etc. all read in cool intelligence tones.
  paperTranslucent:        'rgba(252, 253, 255, 0.82)',
  mirrorAuraOuter:         'rgba(20, 124, 255, 0.06)',
  mirrorAuraInner:         'rgba(234, 244, 255, 0.32)',
  mirrorRim:               'rgba(7, 95, 209, 0.16)',
  scanRingBorder:          'rgba(7, 95, 209, 0.22)',
  pausedMarkerRingBorder:  'rgba(20, 124, 255, 0.32)',

  // White highlights used inside the portal SVG. These are LIGHT
  // effects (not brand colors) so they live here as well so every
  // surface in the home experience consults one file.
  highlightStrong: 'rgba(255, 255, 255, 0.70)',
  highlightSoft:   'rgba(255, 255, 255, 0.34)',
  highlightFaint:  'rgba(255, 255, 255, 0.16)',
  highlightOff:    'rgba(255, 255, 255, 0)',

  // Atmospheric stops used by the mirror radial gradient. Named by
  // their position in the radial sweep ("hot" → "edge") rather than
  // by their hex value. Now a cool icy gradient.
  mirrorHot:     '#FAFCFF',
  mirrorWarm:    '#F3F8FF',
  mirrorHollow:  '#EAF4FF',
  mirrorEdge:    '#DDE9FB',
  mirrorGather:  '#F1F6FF',

  // v26.2 — Decision-state signal colors. The CompressedDecisionAnchor
  // and any other at-a-glance state indicator reads from these so the
  // bar color reflects the actual decision state (not always brand).
  // Semantic meanings preserved.
  signalRecovery:  palette.terracotta,   // pause / recovery → Pura Blue
  signalReset:     palette.amberDeep,    // stop actives / reset (warning)
  signalCheckIn:   palette.amber,        // soft warning
  signalStandard:  palette.moss,         // stay consistent (success)
  signalTreatment: palette.terracottaText, // active night allowed (deep blue)
} as const;

export type Pura26Token = keyof typeof pura26;

/**
 * pura27 — Nightly control center rebuild (Home / Products / Routine).
 *
 * Apple-Health-precision-meets-luxury-skincare-studio tokens. Slightly
 * brighter and more legible than v26 (which targeted the emotional
 * "MirrorPortal" home composition). pura27 is the warm-paper / ink /
 * terracotta system tuned for the literal nightly action surface — the
 * three production screens the user lands on every night. Per
 * CLAUDE.md, theme/tokens.ts is the only legitimate home for hex.
 *
 * All three screens (Home, Products, Routine) and their shared UI
 * primitives consume tokens from here. No component in
 * `src/screens/pura27/` or `src/components/pura27/` may inline hex.
 */
export const pura27 = {
  // Surfaces — porcelain white system. Cooler than warm paper, calmer
  // than pure #FFFFFF where it matters.
  background:       '#FCFDFF',
  backgroundSoft:   '#F7FAFF',
  surface:          '#FFFFFF',
  surfaceWarm:      '#F7FAFF',
  imageSurface:     '#EAF4FF',

  // Atmospheric blue — used for hero glows and intelligence modules.
  // Replaces the warm blush family.
  blush:            '#EAF4FF',
  blushStrong:      '#CFE3FF',

  // Brand Pura Blue — reads as precise intelligence, not warm
  // hospitality. Semantic name `accent` retained.
  accent:           '#147CFF',
  accentPressed:    '#075FD1',
  accentSoft:       '#EAF4FF',
  accentText:       '#063D8F',

  // Ink scale — strict legibility target. Body copy never falls below
  // inkSecondary; tertiary is reserved for metadata labels only.
  ink:              '#080A0F',
  inkSecondary:     '#5D6673',
  inkTertiary:      '#7C8696',
  inkMuted:         '#929BA8',

  // Structure
  border:           '#E5EAF1',
  borderStrong:     '#D4DCE8',
  activeBorder:     '#A8C8FF',

  // Semantic — restrained, always paired with text not just a swatch.
  success:          '#20A67A',
  successBackground:'#E9F8F2',
  warning:          '#C58A1D',
  warningBackground:'#FFF7E6',
  info:             '#147CFF',
  infoBackground:   '#EAF4FF',

  // Deep gradient stops — paired with the base semantic above to sweep
  // the ProgressMeter fill into a two-stop gradient. Each pair leans
  // brighter at the leading edge and deepens toward the tail so the bar
  // reads as a single sweep, never a label.
  accentGradientDeep:  '#075FD1',
  successGradientDeep: '#188A65',
  warningGradientDeep: '#956712',
  infoGradientDeep:    '#063D8F',

  // CTA — deliberate near-black, not pure black.
  buttonPrimary:    '#05070B',
  buttonPressed:    '#1A1F2A',
  buttonDisabled:   '#D4DCE8',

  white:            '#FFFFFF',
} as const;

export type Pura27Token = keyof typeof pura27;

/**
 * pura27 typography — every Text in the nightly screens reads from
 * here. Two families: editorial serif for hero moments, Inter for the
 * UI. The font keys match those already registered in App.tsx (see the
 * existing `fontFamily` export above).
 */
export const pura27Type = {
  displayHero: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 39,
    lineHeight: 43,
    letterSpacing: -1.35,
  },
  displayScreen: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -1.05,
  },
  displayCard: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: -0.75,
  },
  screenTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  functionalTitle: {
    fontFamily: SANS_SEMI,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  bodyLarge: {
    fontFamily: SANS_REG,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.15,
  },
  body: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 21,
  },
  bodyMed: {
    fontFamily: SANS_MED,
    fontSize: 14,
    lineHeight: 21,
  },
  metadata: {
    fontFamily: SANS_BOLD,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.7,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily: SANS_SEMI,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
  },
} as const satisfies Record<string, TextStyle>;

export const pura27Radius = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
  card: 24,
  hero: 30,
  pill: 999,
} as const;

export const pura27Space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 22,
  xxxl: 24,
  section: 32,
  largeSection: 40,
  hero: 48,
  massive: 56,
} as const;

export const pura27Shadow = {
  card: {
    shadowColor: '#08111F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 22,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#08111F',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 34,
    elevation: 3,
  },
  accent: {
    shadowColor: '#147CFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 3,
  },
} as const satisfies Record<string, ViewStyle>;

export const pura27Layout = {
  maxContentWidth: 430,
  horizontalPadding: 22,
  horizontalPaddingLarge: 24,
  bottomNavClearance: 112,
  minTouchTarget: 44,
  primaryButtonHeight: 58,
  compactButtonHeight: 46,
  /**
   * Bottom padding that nightly screens should leave so the floating
   * tab bar never crops a primary action. Reads the safe-area inset
   * so notch + home-indicator devices compose correctly.
   */
  bottomClearance(safeAreaBottom: number): number {
    return safeAreaBottom + this.bottomNavClearance;
  },
} as const;

/**
 * v26 home rebuild — layout tokens. The Home composition reads from
 * here so magic numbers don't drift between FloatingTabBar (the bar)
 * and HomeScreen (the bottom clearance it has to leave for the bar).
 */
export const layoutPura26 = {
  tabBarHeight: 64,
  /**
   * Bottom padding HomeScreen / RecoveryNightFallback content should
   * leave so the floating tab bar never crops the last action. Reads
   * the device safe-area inset so notch + home-indicator devices
   * compose correctly.
   */
  bottomClearance(safeAreaBottom: number): number {
    return safeAreaBottom + this.tabBarHeight + 48;
  },
} as const;

// ---------- Scan analysis color tokens (v25 warm-system) ----------
// The cinematic analyzing screen uses two closed palettes — one per finding
// type (the pulsing detection markers), one per zone status tier (score
// bubbles). Harmonized to the warm palette while keeping each finding
// distinguishable by hue.

export const analysisMarkers = {
  // Cool intelligence palette. Concern colors that must carry meaning
  // are preserved (redness → red, breakouts → red). The rest read as
  // cool tones in the Pura Blue family.
  dryness: '#18B7FF',   // cyan — dryness reads cool/clean
  texture: '#147CFF',   // Pura Blue — texture is the headline AI metric
  barrier: '#20A67A',   // success green — a healthy barrier
  hydration: '#5BB9FF', // light cyan — water-adjacent
  redness: '#E24D4D',   // danger red — must read as redness
  clarity: '#5D6673',   // cool body — neutral
} as const;

export type AnalysisMarkerType = keyof typeof analysisMarkers;

export const status = {
  calm: '#20A67A',      // mirrors palette.moss (success)
  monitor: '#C58A1D',   // mirrors palette.amber (warning)
  active: '#E24D4D',    // mirrors palette.rust (danger)
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

// ---------------------------------------------------------------------------
// puraShop — Pura Shop (commerce) tokens.
//
// The Shop tab is the monetizable storefront ("an elevated beauty store where
// every product is filtered through your skin"). It reads from the existing
// warm-paper palette but introduces a small set of shop-specific accents
// (light-cream page, subtle search-bar glow, dark CTA pill, status tag pills)
// not present elsewhere. Per CLAUDE.md, hex literals live ONLY in this file.
// ---------------------------------------------------------------------------

/**
 * Pura Shop tokens — v30 luxury rebuild.
 *
 * Calibrated to feel luminous, calm, and expensive. Pure ivory base
 * surfaces, restrained coral brand accent, refined warm hairlines.
 * No muddy beiges. The shop never reads from these directly — its
 * components consume the `puraShop` namespace exclusively, and no
 * hex literal lives outside this file (per CLAUDE.md).
 */
export const puraShop = {
  // ----- Surfaces — Pura Blue porcelain -----
  canvas:           '#FCFDFF',
  surface:          '#FFFFFF',
  surfaceWarm:      '#F7FAFF',
  surfaceMuted:     '#EEF6FF',
  glassSurface:     'rgba(252, 253, 255, 0.84)',
  glassSurfaceStrong:'rgba(252, 253, 255, 0.94)',
  pageBg:           '#FCFDFF',

  // ----- Ink — cool graphite scale -----
  ink:              '#080A0F',
  inkSecondary:     '#5D6673',
  inkMuted:         '#7C8696',
  inkFaint:         '#B5BDC8',
  inkOnDark:        '#FFFFFF',

  // ----- Accent (Pura Blue — replaces the warm coral system) -----
  coral:            '#147CFF',
  coralDeep:        '#075FD1',
  coralSoft:        '#EAF4FF',
  coralWashLight:   'rgba(20, 124, 255, 0.10)',
  blush:            '#EAF4FF',
  peachGlow:        '#CFE3FF',
  champagne:        '#F3F8FF',
  ivory:            '#F7FAFF',

  // ----- Semantic soft tag colors (restrained, cool-coherent) -----
  sageSoft:         '#E9F8F2',
  sageText:         '#188A65',
  honeySoft:        '#FFF7E6',
  honeyText:        '#956712',
  oceanSoft:        '#EAF4FF',
  oceanText:        '#063D8F',
  coralChipSoft:    '#EAF4FF',
  coralChipText:    '#063D8F',

  // ----- Structure — cool hairlines -----
  border:           'rgba(8, 22, 56, 0.08)',
  borderWarm:       'rgba(20, 124, 255, 0.22)',
  borderStrongWarm: 'rgba(20, 124, 255, 0.38)',
  hairline:         'rgba(8, 22, 56, 0.06)',

  // ----- Search bar -----
  searchBg:         '#FFFFFF',
  searchBorder:     'rgba(20, 124, 255, 0.22)',
  searchBorderFocus:'rgba(20, 124, 255, 0.45)',
  searchPlaceholder:'#929BA8',
  searchButton:     '#147CFF',
  searchButtonDeep: '#075FD1',
  searchSparkle:    '#147CFF',

  // ----- Personalization context pills -----
  contextLabel:     '#080A0F',
  contextActiveBg:  '#EAF4FF',
  contextActiveText:'#075FD1',
  contextIdleBg:    '#F7FAFF',
  contextIdleText:  '#1F2533',

  // ----- Concern filter chips -----
  chipBg:           '#FFFFFF',
  chipBorder:       'rgba(8, 22, 56, 0.08)',
  chipBgActive:     '#05070B',
  chipText:         '#080A0F',
  chipTextActive:   '#FFFFFF',
  chipIcon:         '#1F2533',
  chipIconActive:   '#A8C8FF',

  // ----- Cards -----
  cardSurface:      '#FFFFFF',
  cardBorder:       'rgba(8, 22, 56, 0.08)',
  cardSurfaceWarm:  '#F7FAFF',

  // Image area backdrops (luminous porcelain + ice gradients)
  packshotIvory:    '#F7FAFF',
  packshotIvoryDeep:'#E8EFF8',
  packshotBlush:    '#EAF4FF',
  packshotBlushDeep:'#CFE3FF',
  packshotSage:     '#E9F8F2',
  packshotSageDeep: '#CDE5DC',
  packshotPeach:    '#DFF2FF',
  packshotPeachDeep:'#B2D7F4',
  packshotMist:     '#EEF1F8',
  packshotMistDeep: '#D8DDE7',

  // ----- Hero featured card -----
  heroFrom:         '#EAF4FF',
  heroVia:          '#A8C8FF',
  heroTo:           '#075FD1',
  heroTagBg:        'rgba(8, 10, 15, 0.84)',
  heroTagText:      '#FFFFFF',
  heroSparkle:      '#A8C8FF',
  heroInfoBg:       '#FFFFFF',
  heroInfoBgGlass:  'rgba(252, 253, 255, 0.92)',

  // Match orb — Pura Blue illuminated recommendation signal
  orbBg:            '#DFF2FF',
  orbCenter:        '#EAF4FF',
  orbHighlight:     'rgba(255, 255, 255, 0.86)',
  orbRim:           'rgba(20, 124, 255, 0.34)',
  orbPercentText:   '#063D8F',
  orbMatchText:     '#063D8F',

  // ----- Status pill tones -----
  tagGentleBg:      '#E9F8F2',
  tagGentleText:    '#188A65',
  tagValueBg:       '#FFF7E6',
  tagValueText:     '#956712',
  tagCoasterBg:     '#EAF4FF',
  tagCoasterText:   '#063D8F',
  tagNewBg:         '#EAF4FF',
  tagNewText:       '#063D8F',
  tagBestsellerBg:  '#EAF4FF',
  tagBestsellerText:'#063D8F',
  tagViralBg:       '#E9F8F2',
  tagViralText:     '#188A65',

  // ----- Rating -----
  ratingStar:       '#C58A1D',
  ratingText:       '#080A0F',

  // ----- Price pill -----
  pricePillBg:      '#FFFFFF',
  pricePillBorder:  'rgba(8, 22, 56, 0.08)',
  pricePillText:    '#080A0F',

  // ----- Plus / Add button — black with restraint -----
  plusBg:           '#05070B',
  plusBgPressed:    '#1A1F2A',
  plusBgConfirmed:  '#188A65',
  plusIcon:         '#FFFFFF',

  // ----- Bag badge — Pura Blue -----
  badgeBg:          '#147CFF',
  badgeText:        '#FFFFFF',

  // ----- Section -----
  sectionTitle:     '#080A0F',
  sectionSub:       '#7C8696',
  viewAll:          '#080A0F',
  viewAllPillBg:    '#F7FAFF',

  // ----- Floating bottom dock -----
  dockSurface:      '#FFFFFF',
  dockSurfaceGlass: 'rgba(252, 253, 255, 0.95)',
  dockHairline:     'rgba(8, 22, 56, 0.08)',
  dockShadow:       '#0A1A2F',
  dockIcon:         '#080A0F',
  dockIconIdle:     '#929BA8',
  dockLabel:        '#080A0F',
  dockLabelIdle:    '#929BA8',
  dockActivePillBg: '#EAF4FF',
  dockActiveText:   '#075FD1',
  dockScanTint:     '#DFF2FF',
  dockScanRim:      'rgba(20, 124, 255, 0.34)',
  dockScanCore:     '#FFFFFF',
  dockScanIcon:     '#147CFF',
  dockScanHighlight:'rgba(255, 255, 255, 0.85)',

  white:            '#FFFFFF',
  black:            '#05070B',
} as const;

export type PuraShopToken = keyof typeof puraShop;

export const puraShopType = {
  // Editorial serif — "Pura Shop", section titles, hero product name.
  headerSerif: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  sectionSerif: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
  },
  heroProductSerif: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  supportingProductSerif: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  miniProductSerif: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontFamily: SANS_REG,
    fontSize: 13.5,
    lineHeight: 18,
  },
  contextLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  contextPill: {
    fontFamily: SANS_SEMI,
    fontSize: 14.5,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  chipLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  tagLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 10.5,
    lineHeight: 12,
    letterSpacing: 0.4,
  },
  brand: {
    fontFamily: SANS_MED,
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  benefitLine: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  usageLine: {
    fontFamily: SANS_REG,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.05,
  },
  price: {
    fontFamily: SANS_SEMI,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  priceLarge: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  rating: {
    fontFamily: SANS_SEMI,
    fontSize: 12,
    lineHeight: 15,
  },
  viewAll: {
    fontFamily: SANS_SEMI,
    fontSize: 13.5,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: SANS_REG,
    fontSize: 12,
    lineHeight: 16,
  },
  matchPercent: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.6,
  },
  matchLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 8.5,
    lineHeight: 11,
    letterSpacing: 1.0,
    textTransform: 'uppercase' as const,
  },
  dockLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.2,
  },
} as const satisfies Record<string, TextStyle>;

export const puraShopRadius = {
  chip: 999,
  card: 26,
  cardSmall: 22,
  hero: 28,
  pricePill: 999,
  plus: 18,
  search: 30,
  dock: 32,
  badge: 999,
  matchOrb: 999,
} as const;

export const puraShopSpace = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  gutter: 20,
} as const;

export const puraShopShadow = {
  card: {
    shadowColor: '#0A1A2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  hero: {
    shadowColor: '#0A1A2F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  dock: {
    shadowColor: '#0A1A2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  plus: {
    shadowColor: '#05070B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  scanOrb: {
    shadowColor: '#147CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  search: {
    shadowColor: '#0A1A2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
} as const satisfies Record<string, ViewStyle>;

export const puraShopLayout = {
  horizontalPadding: 20,
  /** Floating tab bar's outer height (background container). */
  dockBarHeight: 66,
  /** Bottom padding the ScrollView must leave so the floating dock
   *  never crops the last row of content. Caller composes this with
   *  the safe-area inset:
   *    `dockBarHeight + safeAreaBottom + extra`. */
  dockClearance: 96,
  /** Minimum tappable size for any interactive control. */
  minTouchTarget: 44,
} as const;
