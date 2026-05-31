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
  background: '#FCFDFF',
  warmBackground: '#F7FAFF',
  card: '#FFFFFF',
  cardSoft: '#F7FAFF',
  ink: '#080A0F',
  inkSoft: '#1F2533',
  body: '#5D6673',
  muted: '#929BA8',
  line: '#E5EAF1',
  lineStrong: '#D4DCE8',

  // Pura Blue intelligence — replaces the coral accent. Legacy
  // `coral*` names retained.
  coral: '#147CFF',
  coralStrong: '#075FD1',
  coralDark: '#063D8F',
  coralWash: '#EAF4FF',
  peachGlow: '#CFE3FF',

  // Sage → success green (preserved semantic)
  sage: '#20A67A',
  sageDeep: '#188A65',
  sageWash: '#E9F8F2',

  // Lilac → cyan (cool intelligence secondary)
  lilac: '#5BB9FF',
  lilacDeep: '#1487C9',
  lilacWash: '#E7F8FF',

  // Amber → warning (preserved semantic)
  amber: '#C58A1D',
  amberDeep: '#956712',
  amberWash: '#FFF7E6',

  // Danger red — must read as redness/irritation
  danger: '#E24D4D',
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
  // Texture — Pura Blue (headline AI metric)
  texture: {
    label: 'Texture',
    tint: '#5BB1FF',
    fill: 'rgba(91, 177, 255, 0.38)',
    border: 'rgba(20, 124, 255, 0.80)',
    glow: 'rgba(20, 124, 255, 0.28)',
    wash: '#EAF4FF',
  },
  // Under-eyes — cool indigo/violet-blue (preserved cool semantic)
  under_eye_fatigue: {
    label: 'Under-eyes',
    tint: '#7C8BE6',
    fill: 'rgba(124, 139, 230, 0.40)',
    border: 'rgba(80, 96, 200, 0.80)',
    glow: 'rgba(124, 139, 230, 0.28)',
    wash: '#EAEEFB',
  },
  // Breakouts — danger red (must read clinically as breakouts)
  breakouts: {
    label: 'Breakouts',
    tint: '#E97070',
    fill: 'rgba(233, 112, 112, 0.40)',
    border: 'rgba(208, 70, 70, 0.82)',
    glow: 'rgba(233, 112, 112, 0.28)',
    wash: '#FCEAEA',
  },
  // Redness — must remain red
  redness: {
    label: 'Redness',
    tint: '#EC8179',
    fill: 'rgba(236, 129, 121, 0.40)',
    border: 'rgba(216, 89, 80, 0.78)',
    glow: 'rgba(236, 129, 121, 0.28)',
    wash: '#FBE6E1',
  },
  // Dryness — cyan (water-adjacent cool tone)
  dryness: {
    label: 'Dryness',
    tint: '#5BD0FF',
    fill: 'rgba(91, 208, 255, 0.34)',
    border: 'rgba(24, 154, 218, 0.74)',
    glow: 'rgba(91, 208, 255, 0.24)',
    wash: '#E0F4FF',
  },
  // Oil balance — success green (healthy balance)
  oil_balance: {
    label: 'Oil balance',
    tint: '#5BBE8F',
    fill: 'rgba(91, 190, 143, 0.36)',
    border: 'rgba(32, 166, 122, 0.78)',
    glow: 'rgba(91, 190, 143, 0.26)',
    wash: '#E5F4EC',
  },
  // Dark marks — amber (pigmentation/warning)
  dark_marks: {
    label: 'Dark marks',
    tint: '#D8A24A',
    fill: 'rgba(216, 162, 74, 0.38)',
    border: 'rgba(168, 117, 30, 0.78)',
    glow: 'rgba(216, 162, 74, 0.26)',
    wash: '#FBEFD5',
  },
  // Barrier support — success green (healthy barrier)
  barrier_stress: {
    label: 'Barrier support',
    tint: '#3FBE85',
    fill: 'rgba(63, 190, 133, 0.36)',
    border: 'rgba(24, 138, 101, 0.78)',
    glow: 'rgba(63, 190, 133, 0.24)',
    wash: '#E2F4EB',
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
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  } as ViewStyle,
  cardDeep: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 10,
  } as ViewStyle,
  glow: {
    shadowColor: '#147CFF',
    shadowOpacity: 0.30,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  } as ViewStyle,
  softLift: {
    shadowColor: '#0A1A2F',
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
