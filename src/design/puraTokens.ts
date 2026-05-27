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
  // Background atmosphere
  canvas: '#F8F4EF',
  canvasWarm: '#F6F0EA',
  canvasDepth: '#F1E8E0',
  surface: '#FCF9F5',
  surfaceRaised: '#FFFCF8',
  surfaceQuiet: '#F5EFE9',
  surfacePressed: '#EFE7DF',

  // Ink
  ink: '#171513',
  inkSecondary: '#3C3632',
  body: '#625B55',
  muted: '#8D847C',
  faint: '#AEA59D',
  disabled: '#C7BFB7',
  inverse: '#FFF9F5',

  // Hairlines and structure
  line: '#E8DED5',
  lineSoft: '#EFE7DF',
  lineStrong: '#D7C8BE',

  // Brand warmth
  clay: '#BC6650',
  clayDeep: '#A65340',
  claySoft: '#ECD2C9',
  clayMist: '#F7EBE7',
  rose: '#D9A79C',
  roseLight: '#F1DCD6',
  sand: '#E8D7C1',
  sandLight: '#F5ECDF',

  // Scan intelligence
  scanGlow: 'rgba(188, 102, 80, 0.17)',
  scanGlowStrong: 'rgba(188, 102, 80, 0.30)',
  scanLine: 'rgba(188, 102, 80, 0.46)',
  scanContour: 'rgba(111, 84, 74, 0.18)',
  scanContourActive: 'rgba(188, 102, 80, 0.62)',

  // High contrast action
  actionInk: '#171513',
  actionInkPressed: '#292522',

  // Semantic, extremely restrained
  safeBg: '#E8F0E9',
  safeText: '#46604B',
  cautionBg: '#F4E7D2',
  cautionText: '#795A2D',
  skipBg: '#F3DFDB',
  skipText: '#874D45',
  observationBg: '#EFE9E4',
  observationText: '#665C55',

  // Overlay
  overlay: 'rgba(23, 21, 19, 0.34)',
  overlaySoft: 'rgba(23, 21, 19, 0.18)',
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
    shadowColor: '#3B2B23',
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  actionLift: {
    shadowColor: '#3B2B23',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  orbAmbient: {
    shadowColor: '#BC6650',
    shadowOpacity: 0.13,
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
