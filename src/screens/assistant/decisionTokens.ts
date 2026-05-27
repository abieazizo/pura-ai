/**
 * Local AI Assist screen tokens.
 *
 * The Decision Room reads its color and spacing values from this
 * module. All hex literals live in `src/theme/tokens.ts` per the
 * project's repo-wide rule — this file only re-aliases the
 * `pura26` semantic tokens under names that mirror the v27
 * Decision Room design spec, so the components can stay short.
 */

import { pura26 } from '@/theme';

export const dx = {
  // Surfaces
  paper: pura26.paper,
  surfacePrimary: pura26.surface,
  surfaceSecondary: pura26.warmTint,

  // Text
  ink: pura26.ink,
  inkSecondary: pura26.inkSecondary,
  inkMuted: pura26.inkMuted,
  inkFaint: pura26.inkFaint,
  inkInverse: pura26.paper,

  // Brand / decision
  terracotta: pura26.terracotta,
  terracottaPressed: pura26.terracottaPressed,
  terracottaTint: pura26.terracottaTint,
  terracottaSoft: pura26.terracottaSoft,
  terracottaText: pura26.terracottaText,
  clayHold: pura26.terracottaSoft,

  // Structure
  line: pura26.border,
  hairline: pura26.border,
  borderStrong: pura26.borderStrong,

  // v26.2 — Decision-state signal colors. Used by CompressedDecisionAnchor
  // and any other at-a-glance state indicator so the visual signal
  // matches the actual state instead of always brand terracotta.
  signalRecovery:  pura26.signalRecovery,
  signalReset:     pura26.signalReset,
  signalCheckIn:   pura26.signalCheckIn,
  signalStandard:  pura26.signalStandard,
  signalTreatment: pura26.signalTreatment,
} as const;

import { palette } from '@/theme';

/**
 * Shadow tokens for the Decision Room. `shadowColor` resolves to the
 * project's warm shadow tint (palette.shadowTint) so we never inline a
 * hex literal outside theme/tokens.ts.
 */
export const dShadow = {
  card: {
    shadowColor: palette.shadowTint,
    shadowOpacity: 0.055,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  sticky: {
    shadowColor: palette.shadowTint,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  hero: {
    shadowColor: palette.shadowTint,
    shadowOpacity: 0.045,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
} as const;

export const dRadius = {
  decisionCard: 28,
  evidenceTile: 18,
  primaryButton: 26,
  pill: 999,
  conversationCard: 24,
  composer: 29,
  utilityButton: 20,
} as const;

export const dSpace = {
  pageH: 20,
  pageContent: 353,
  decisionCardPad: 20,
  composerOuterH: 16,
  evidenceGap: 10,
} as const;

export const dEase = {
  // c-bez curves match the spec exactly.
  enter: [0.22, 1, 0.36, 1] as const,
  reveal: [0.16, 1, 0.3, 1] as const,
  press: [0.4, 0, 0.2, 1] as const,
};
