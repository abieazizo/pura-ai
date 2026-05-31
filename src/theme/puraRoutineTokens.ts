/**
 * Pura Routine — visual tokens.
 *
 * Centralized colors, typography, radii and shadows for the Routine
 * domain. Lives next to the existing `puraShop*` tokens so the two
 * surfaces stay sibling — same warm porcelain palette, same editorial
 * serif, same coral accent — without coupling the source files.
 *
 * Nothing in `components/routine` should embed literal hex; all
 * surfaces must read from this module.
 */

import type { TextStyle, ViewStyle } from 'react-native';

const SERIF = 'InstrumentSerif-Regular';
const SERIF_DISPLAY = 'InstrumentSerif-SemiBold';
const SERIF_ITALIC = 'InstrumentSerif-Italic';
const SANS_REG = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';
const SANS_BOLD = 'Inter-Bold';

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const puraRoutineColors = {
  // Surfaces — Pura Blue porcelain system
  background: '#FCFDFF',
  backgroundWarm: '#F7FAFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F7FAFF',
  surfaceBlush: '#EAF4FF',
  surfaceSage: '#E9F8F2',
  surfaceLilac: '#EEF1FB',

  // Ink scale — cool graphite
  ink: '#080A0F',
  inkSoft: '#1F2533',
  body: '#5D6673',
  muted: '#929BA8',

  // Structure — cool hairlines
  line: '#E5EAF1',
  lineStrong: '#D4DCE8',
  hairline: 'rgba(8, 22, 56, 0.06)',

  // Pura Blue accent (legacy `coral*` names retained, values now blue)
  coral: '#147CFF',
  coralStrong: '#075FD1',
  coralDeep: '#063D8F',
  coralWash: '#EAF4FF',
  coralWashStrong: '#CFE3FF',
  peachGlow: '#DFF2FF',
  peachGlowSoft: 'rgba(207, 227, 255, 0.55)',

  // Sage → success green (preserved)
  sage: '#20A67A',
  sageDeep: '#188A65',
  sageWash: '#E9F8F2',

  // Lilac → secondary cool tone (now a soft cyan)
  lilac: '#5BB9FF',
  lilacDeep: '#1487C9',
  lilacWash: '#E7F8FF',

  // Amber → warning (preserved)
  amber: '#C58A1D',
  amberWash: '#FFF7E6',

  // Semantic
  success: '#20A67A',
  successWash: '#E9F8F2',
  warningWash: '#FFF7E6',
  blackButton: '#05070B',
  white: '#FFFFFF',

  // Status badges (background / text pairs) — cool semantics
  badgeOwnedBg: '#E9F8F2',
  badgeOwnedText: '#188A65',
  badgeConfirmBg: '#EAF4FF',
  badgeConfirmText: '#063D8F',
  badgeMatchBg: '#FFF7E6',
  badgeMatchText: '#956712',
  badgeOptionalBg: '#FFFFFF',
  badgeOptionalText: '#5D6673',
  badgeOptionalBorder: '#D4DCE8',
} as const;

export type PuraRoutineColor = keyof typeof puraRoutineColors;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const puraRoutineType = {
  eyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: puraRoutineColors.coralDeep,
  },
  eyebrowMuted: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: puraRoutineColors.muted,
  },
  revealTitle: {
    fontFamily: SERIF_DISPLAY,
    fontSize: 43,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: puraRoutineColors.ink,
  },
  pageTitle: {
    fontFamily: SERIF_DISPLAY,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.25,
    color: puraRoutineColors.ink,
  },
  pageTitleSmall: {
    fontFamily: SERIF_DISPLAY,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.25,
    color: puraRoutineColors.ink,
  },
  dailyScreenTitle: {
    fontFamily: SERIF_DISPLAY,
    fontSize: 28,
    lineHeight: 32,
    color: puraRoutineColors.ink,
  },
  heroSerif: {
    fontFamily: SERIF_DISPLAY,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
    color: puraRoutineColors.ink,
  },
  sectionTitle: {
    fontFamily: SANS_SEMI,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: puraRoutineColors.ink,
  },
  stepTitle: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 21,
    color: puraRoutineColors.ink,
  },
  productName: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 17,
    color: puraRoutineColors.body,
  },
  bodyLarge: {
    fontFamily: SANS_REG,
    fontSize: 15,
    lineHeight: 22,
    color: puraRoutineColors.body,
  },
  body: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 20,
    color: puraRoutineColors.body,
  },
  bodySoft: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 19,
    color: puraRoutineColors.muted,
  },
  microLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: puraRoutineColors.muted,
  },
  badge: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: SANS_SEMI,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  buttonLarge: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: SANS_REG,
    fontSize: 12,
    lineHeight: 16,
    color: puraRoutineColors.muted,
  },
  metaStrong: {
    fontFamily: SANS_SEMI,
    fontSize: 12,
    lineHeight: 16,
    color: puraRoutineColors.body,
  },
  numericLarge: {
    fontFamily: SERIF_DISPLAY,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.5,
    color: puraRoutineColors.coralStrong,
  },
  numericSmall: {
    fontFamily: SANS_SEMI,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: puraRoutineColors.coralStrong,
  },
  percentLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.1,
    color: puraRoutineColors.coralDeep,
  },
} as const satisfies Record<string, TextStyle>;

export type PuraRoutineTypeKey = keyof typeof puraRoutineType;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export const puraRoutineRadius = {
  heroCard: 28,
  card: 22,
  smallCard: 18,
  chip: 999,
  button: 28,
  pill: 999,
  productThumb: 14,
} as const;

export const puraRoutineSpace = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 28,
  gutter: 20,
  /** Top spacing after the safe-area header. */
  topAfterHeader: 18,
  /** Bottom padding to clear the floating dock + safe-area. */
  dockClearance: 96,
} as const;

export const puraRoutineShadows = {
  card: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  hero: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.10,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 13 },
    elevation: 7,
  },
  coralGlow: {
    shadowColor: '#147CFF',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  button: {
    shadowColor: '#05070B',
    shadowOpacity: 0.20,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const satisfies Record<string, ViewStyle>;

// ---------------------------------------------------------------------------
// Motion (durations)
// ---------------------------------------------------------------------------

export const puraRoutineMotion = {
  micro: 140,
  fast: 200,
  base: 240,
  slow: 320,
  shimmer: 1600,
} as const;
