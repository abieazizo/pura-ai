/**
 * Pura scan-results — design tokens.
 *
 * The new scan-results surface is the only legitimate consumer of these
 * tokens. The rest of the app keeps reading `theme/tokens.ts` so this
 * file does not bleed into Home / Routine / Shop.
 *
 * v30 — warm Pura editorial palette + four restrained concern colors.
 */

import type { TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Palette.
// ---------------------------------------------------------------------------

export const scanColors = {
  background: '#FFFDF9',
  warmBackground: '#FFF8F2',
  card: '#FFFFFF',
  cardSoft: '#FFFAF5',
  ink: '#17151A',
  inkSoft: '#302D31',
  body: '#6C6765',
  muted: '#9D9590',
  line: '#EEDFD4',
  lineStrong: '#E3C9BB',

  coral: '#E98973',
  coralStrong: '#DF735C',
  coralDark: '#A85A47',
  coralWash: '#FBE7DF',
  peachGlow: '#FFD9CC',

  sage: '#96A487',
  sageDeep: '#68745A',
  sageWash: '#EEF0E8',

  lilac: '#B39AD0',
  lilacDeep: '#785A99',
  lilacWash: '#F2ECF8',

  amber: '#D4A360',
  amberDeep: '#9C713B',
  amberWash: '#FAF0DF',

  danger: '#C87262',
  white: '#FFFFFF',
} as const;

// ---------------------------------------------------------------------------
// Concern visuals — one entry per ConcernType in `types/scanResults.ts`.
// Overlay paint settings live here so the geometry layer never has to
// invent colors.
// ---------------------------------------------------------------------------

export interface ConcernVisualPaint {
  label: string;
  tint: string;
  fill: string;
  border: string;
  glow: string;
  /** Pale wash for chip/finding card backgrounds. */
  wash: string;
}

// v30.5 — opacity values boosted from the original 0.20-0.27 range to
// 0.34-0.42 so overlays read clearly on real-world skin tones and on
// web (where SVG opacity composites differently than on native). The
// shapes are still soft and editorial — not clinical heatmaps.
export const concernVisuals = {
  texture: {
    label: 'Texture',
    tint: '#F19A86',
    fill: 'rgba(241, 154, 134, 0.40)',
    border: 'rgba(225, 116, 94, 0.85)',
    glow: 'rgba(241, 154, 134, 0.30)',
    wash: '#FBE7DF',
  },
  under_eye_fatigue: {
    label: 'Under-eyes',
    tint: '#AE93D0',
    fill: 'rgba(174, 147, 208, 0.40)',
    border: 'rgba(143, 104, 187, 0.78)',
    glow: 'rgba(174, 147, 208, 0.28)',
    wash: '#F2ECF8',
  },
  breakouts: {
    label: 'Breakouts',
    tint: '#D6A25D',
    fill: 'rgba(214, 162, 93, 0.38)',
    border: 'rgba(187, 130, 55, 0.78)',
    glow: 'rgba(214, 162, 93, 0.26)',
    wash: '#FAF0DF',
  },
  redness: {
    label: 'Redness',
    tint: '#EC8179',
    fill: 'rgba(236, 129, 121, 0.40)',
    border: 'rgba(216, 89, 80, 0.78)',
    glow: 'rgba(236, 129, 121, 0.28)',
    wash: '#FBE6E1',
  },
  dryness: {
    label: 'Dryness',
    tint: '#B5AC8E',
    fill: 'rgba(181, 172, 142, 0.36)',
    border: 'rgba(140, 128, 100, 0.74)',
    glow: 'rgba(181, 172, 142, 0.24)',
    wash: '#EDEAE0',
  },
  oil_balance: {
    label: 'Oil balance',
    tint: '#A1AF8C',
    fill: 'rgba(161, 175, 140, 0.36)',
    border: 'rgba(122, 142, 100, 0.75)',
    glow: 'rgba(161, 175, 140, 0.26)',
    wash: '#EEF0E8',
  },
  dark_marks: {
    label: 'Dark marks',
    tint: '#BB907D',
    fill: 'rgba(187, 144, 125, 0.38)',
    border: 'rgba(153, 104, 84, 0.78)',
    glow: 'rgba(187, 144, 125, 0.26)',
    wash: '#F3E6DE',
  },
  barrier_stress: {
    label: 'Barrier support',
    tint: '#92A27F',
    fill: 'rgba(146, 162, 127, 0.36)',
    border: 'rgba(105, 126, 85, 0.74)',
    glow: 'rgba(146, 162, 127, 0.24)',
    wash: '#E8EDE0',
  },
} as const satisfies Record<string, ConcernVisualPaint>;

// ---------------------------------------------------------------------------
// Typography — uses the fonts already registered in App.tsx
// (`InstrumentSerif-*`, `Inter-*`).
// ---------------------------------------------------------------------------

const SERIF = 'InstrumentSerif-Regular';
const SERIF_ITALIC = 'InstrumentSerif-Italic';
const INTER = 'Inter-Regular';
const INTER_MEDIUM = 'Inter-Medium';
const INTER_SEMI = 'Inter-SemiBold';
const INTER_BOLD = 'Inter-Bold';

export const scanType = {
  eyebrow: {
    fontFamily: INTER_SEMI,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: scanColors.coralDark,
  } as TextStyle,
  heroTitleSerif: {
    fontFamily: SERIF,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -0.6,
    color: scanColors.ink,
  } as TextStyle,
  heroAccentSerif: {
    fontFamily: SERIF_ITALIC,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -0.5,
    color: scanColors.coralDark,
  } as TextStyle,
  editorialHeading: {
    fontFamily: SERIF,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: scanColors.ink,
  } as TextStyle,
  sectionHeading: {
    fontFamily: INTER_BOLD,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: scanColors.ink,
  } as TextStyle,
  bodyLarge: {
    fontFamily: INTER,
    fontSize: 16,
    lineHeight: 23,
    color: scanColors.body,
  } as TextStyle,
  body: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
    color: scanColors.body,
  } as TextStyle,
  bodyStrong: {
    fontFamily: INTER_SEMI,
    fontSize: 14,
    lineHeight: 20,
    color: scanColors.inkSoft,
  } as TextStyle,
  caption: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 16,
    color: scanColors.muted,
  } as TextStyle,
  chip: {
    fontFamily: INTER_SEMI,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
  cardTitle: {
    fontFamily: INTER_SEMI,
    fontSize: 16,
    lineHeight: 22,
    color: scanColors.ink,
  } as TextStyle,
  buttonLabel: {
    fontFamily: INTER_SEMI,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: scanColors.white,
  } as TextStyle,
  secondaryAction: {
    fontFamily: INTER_MEDIUM,
    fontSize: 14,
    lineHeight: 20,
    color: scanColors.coralDark,
  } as TextStyle,
} as const;

// ---------------------------------------------------------------------------
// Geometry.
// ---------------------------------------------------------------------------

export const scanRadius = {
  imageFrame: 30,
  largeCard: 28,
  smallCard: 20,
  pill: 999,
  button: 30,
  circleButton: 32,
} as const;

export const scanShadows = {
  // Photo card — layered shadow for real depth. Two-pass shadow
  // emulation: the underlying View uses these values; if the
  // component wants the double-shadow effect it stacks two Views
  // with the `cardLift` and `cardDeep` shadows.
  card: {
    shadowColor: '#35251E',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  } as ViewStyle,
  cardDeep: {
    shadowColor: '#35251E',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 10,
  } as ViewStyle,
  glow: {
    shadowColor: '#E98973',
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  } as ViewStyle,
  softLift: {
    shadowColor: '#35251E',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  } as ViewStyle,
} as const;

// ---------------------------------------------------------------------------
// Layout — paged carousel constants. UI components share these so the
// progress segments stay aligned with the actual photo frame.
// ---------------------------------------------------------------------------

export const scanLayout = {
  pageHorizontalPadding: 24,
  pageTopGutter: 8,
  photoMaxWidth: 285,
  photoMinWidth: 230,
  /** Total number of slides in the reveal carousel. */
  slideCount: 4,
} as const;
