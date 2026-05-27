/**
 * v26 — Routine redesign tokens.
 *
 * Paper / Ink / Terracotta only. No blue, no clinical red, no bright
 * success green. Semantic improvement is communicated through copy,
 * iconography, and hierarchy — never through introducing a new colour
 * system.
 */

import { Easing } from 'react-native-reanimated';

export const V26 = {
  // Canvas — warm cream, slightly off-white. Slightly lighter than v25 to
  // make white primary cards read crisply against it.
  paper: '#FBFAF8',
  // Primary card — true white. Editorial restraint without the cream
  // monotony of v25.
  surface: '#FFFFFF',
  // Scan-linked card surface — warm tint paired with terracotta accents.
  warmScan: '#F8F3F0',

  // Ink scale
  ink: '#171514',
  inkSecondary: '#625C58',
  inkMuted: '#938B86',
  inkFaint: '#A9A19D',

  // Clay (terracotta) — slightly deeper than v25 so it reads as a
  // deliberate accent, not a default surface stain.
  terracotta: '#B96D59',
  terracottaPressed: '#985442',
  terracottaText: '#985442',
  clayTint: '#F5E4DF',
  clayStrong: '#EFD4CC',
  clayMist: '#F8F3F0',

  // Structure
  border: '#E8E1DD',
  borderStrong: '#DDD4CF',

  // Track + guardrail
  trackNeutral: '#E8E1DD',
  guardrailSurface: '#F7ECE8',

  // Positive — restrained sage, used only when an improvement is real.
  positive: '#36735B',
  positiveWash: '#EAF2EE',

  // CTAs — deep ink, near-black. Decisive without harsh pure-black.
  ctaDarkFill: '#191817',
  ctaDarkPressed: '#292624',
  ctaDarkText: '#FFFFFF',

  // Overlays + atmospheric
  overlay: 'rgba(23, 21, 20, 0.38)',
  paperTranslucent: 'rgba(251, 250, 248, 0.94)',
  shadowTint: 'rgba(31, 20, 16, 0.06)',
} as const;

export const V26_TYPE = {
  serif: 'InstrumentSerif-Regular',
  serifSemi: 'InstrumentSerif-SemiBold',
  sans: 'Inter-Regular',
  sansMed: 'Inter-Medium',
  sansSemi: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
} as const;

export const V26_RADIUS = {
  hero: 28,
  card: 28,
  cardSmall: 20,
  /** Legacy alias for back-compat with v26 components built before the
   * rename to `cardSmall`. Removing this would require touching multiple
   * touched-but-not-rewritten step files. */
  small: 20,
  inset: 18,
  pill: 999,
} as const;

export const V26_SPACE = {
  gutter: 20,
  cardPad: 24,
  heroPad: 26,
  section: 28,
  cardGap: 16,
  topAfterHeader: 8,
  tabBarReserve: 96,
  buttonHeight: 54,
  buttonRadius: 27,
  focusedHeader: 56,
} as const;

export const V26_MOTION = {
  // Quick UI feedback — must respect reduced motion.
  press: { duration: 140, easing: Easing.bezier(0.22, 1, 0.36, 1) },
  segment: { duration: 220, easing: Easing.bezier(0.22, 1, 0.36, 1) },
  expand: { duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  hero: { duration: 320, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  complete: { duration: 600, easing: Easing.bezier(0.25, 0.85, 0.25, 1) },
} as const;

export const V26_SHADOW = {
  card: {
    shadowColor: '#2A1F18',
    shadowOpacity: 0.022,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  hero: {
    shadowColor: '#2A1F18',
    shadowOpacity: 0.04,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
} as const;
