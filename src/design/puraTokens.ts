/**
 * Pura design tokens — v29 nightly-mirror rebuild.
 *
 * This is the canonical token set for the redesigned core experience
 * (Home as nightly mirror, AI Assist as private consultation, Routine
 * as guided ritual, Products as interpreted shelf). It deliberately
 * shifts from the warm-paper pura26 palette to a slightly cooler
 * paper + warmer clay system so the rebuilt screens read as a
 * distinct, more original product — not a polished version of the
 * previous skin.
 *
 * Color usage rules:
 *   • canvas is the screen background.
 *   • ink is reserved for the highest-level statements and actions.
 *   • clay is for key active cues, NOT every interactive element.
 *   • Scan glow must feel atmospheric, never neon.
 *   • Safe / skip / caution status uses text + shape, never color
 *     alone.
 */

export const puraColors = {
  // Background atmosphere — porcelain Pura Blue system
  canvas: '#FCFDFF',
  canvasWarm: '#F7FAFF',
  canvasDepth: '#EEF6FF',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceQuiet: '#F7FAFF',
  surfacePressed: '#EAF4FF',

  // Ink — cool graphite
  ink: '#080A0F',
  inkSecondary: '#1F2533',
  body: '#5D6673',
  muted: '#7C8696',
  faint: '#B5BDC8',
  disabled: '#C9D0DA',
  inverse: '#FFFFFF',

  // Hairlines and structure
  line: '#E5EAF1',
  lineSoft: '#EEF1F5',
  lineStrong: '#D4DCE8',

  // Brand — Pura Blue (legacy `clay*` names retained)
  clay: '#147CFF',
  clayDeep: '#075FD1',
  claySoft: '#EAF4FF',
  clayMist: '#F3F8FF',
  rose: '#A8C8FF',
  roseLight: '#DFF2FF',
  sand: '#929BA8',
  sandLight: '#E5EAF1',

  // Scan intelligence — luminous blue (formerly warm clay)
  scanGlow: 'rgba(20, 124, 255, 0.18)',
  scanGlowStrong: 'rgba(20, 124, 255, 0.32)',
  scanLine: 'rgba(20, 124, 255, 0.55)',
  scanContour: 'rgba(7, 95, 209, 0.18)',
  scanContourActive: 'rgba(20, 124, 255, 0.62)',

  // High contrast action
  actionInk: '#05070B',
  actionInkPressed: '#1A1F2A',

  // Semantic, extremely restrained
  safeBg: '#E9F8F2',
  safeText: '#188A65',
  cautionBg: '#FFF7E6',
  cautionText: '#956712',
  skipBg: '#FFF0F0',
  skipText: '#A33B3B',
  observationBg: '#F7FAFF',
  observationText: '#5D6673',

  // Overlay
  overlay: 'rgba(8, 10, 15, 0.36)',
  overlaySoft: 'rgba(8, 10, 15, 0.18)',
} as const;

export type PuraColor = keyof typeof puraColors;

export const puraSpace = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
  section: 40,
  heroGap: 48,
  spacious: 64,
  screenX: 22,
  screenTop: 18,
  bottomNavClearance: 104,
  composerNavClearance: 176,
} as const;

export const puraRadius = {
  small: 12,
  medium: 17,
  input: 21,
  productTile: 22,
  sheet: 30,
  button: 999,
  ritualOrb: 999,
} as const;

export const puraShadow = {
  softLift: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  actionLift: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.09,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  orbAmbient: {
    shadowColor: '#147CFF',
    shadowOpacity: 0.20,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
} as const;

// Editorial serif and sans families. Reuses the existing installed
// fonts (InstrumentSerif + Inter) rather than introducing a new font
// payload. If a future brand serif is installed it can be swapped
// here without touching screens.
export const puraType = {
  consultationMarker: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2.2,
    color: puraColors.muted,
    textTransform: 'uppercase' as const,
  },
  homeHero: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.9,
    color: puraColors.ink,
  },
  verdictHero: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.1,
    color: puraColors.ink,
  },
  answerHero: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 41,
    letterSpacing: -0.75,
    color: puraColors.ink,
  },
  routineHero: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 41,
    letterSpacing: -0.7,
    color: puraColors.ink,
  },
  productHero: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.7,
    color: puraColors.ink,
  },
  sectionSerif: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: puraColors.ink,
  },
  questionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 23,
    color: puraColors.ink,
  },
  bodyLarge: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
    lineHeight: 25,
    color: puraColors.body,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: puraColors.body,
  },
  bodyStrong: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 21,
    color: puraColors.inkSecondary,
  },
  itemTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 21,
    color: puraColors.ink,
  },
  itemMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: puraColors.muted,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2,
    color: puraColors.muted,
    textTransform: 'uppercase' as const,
  },
  eyebrowClay: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2,
    color: puraColors.clay,
    textTransform: 'uppercase' as const,
  },
  buttonPrimary: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    color: puraColors.inverse,
  },
  buttonQuiet: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: puraColors.inkSecondary,
  },
  tab: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.35,
    textTransform: 'uppercase' as const,
  },
  micro: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: puraColors.muted,
  },
} as const;

export const puraMotion = {
  pressMs: 90,
  quickMs: 170,
  normalMs: 260,
  revealMs: 420,
  atmosphereMs: 3600,
  orbBreathMs: 4400,
  springGentle: { damping: 22, stiffness: 230, mass: 0.9 },
  springPress: { damping: 20, stiffness: 350, mass: 0.7 },
  springStep: { damping: 26, stiffness: 260, mass: 0.9 },
} as const;
