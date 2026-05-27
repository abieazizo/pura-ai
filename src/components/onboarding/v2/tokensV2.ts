/**
 * v25 — onboarding-only token aliases.
 *
 * The repo already ships warm Paper / Ink / Terracotta palette tokens
 * in `theme/tokens.ts`. v25 introduces a small set of onboarding-only
 * aliases so future palette tweaks can move just these names without
 * touching every screen, and so screen code stays readable
 * ("PURA_PAPER" beats reaching into `palette.bg` everywhere).
 *
 * Values mirror the spec exactly. The few deltas relative to existing
 * `palette` are intentional — e.g. the spec's `--pura-clay-selected`
 * (#F3E4DE) is a touch softer than the repo's `palette.clayPaper`
 * (#F3DED8). Both shipping together is fine: the v25 screens use the
 * v25 aliases, the rest of the app keeps `palette.clayPaper`.
 */

export const PURA = {
  paper: '#FAF7F4',
  paperRaised: '#FCFAF7',
  ink: '#1A1A1A',
  body: '#5C5550',
  muted: '#847971',
  border: '#E5DDD6',
  borderStrong: '#D8CEC6',
  terracotta: '#C65D48',
  terracottaPressed: '#AC4E3C',
  claySelected: '#F3E4DE',
  claySupport: '#F6ECE7',
  claySubtle: '#F8F0EC',
  disabledBg: '#E5DFDA',
  disabledText: '#9B918A',
  overlayDark: 'rgba(26, 26, 26, 0.42)',
} as const;

export const PURA_SHADOW = {
  soft: {
    shadowColor: '#2A1F18',
    shadowOpacity: 0.055,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  card: {
    shadowColor: '#2A1F18',
    shadowOpacity: 0.035,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export const PURA_RADIUS = {
  card: 18,
  panel: 20,
  reveal: 24,
  pill: 999,
} as const;

export const PURA_FONT = {
  serif: 'InstrumentSerif-Regular',
  serifSemi: 'InstrumentSerif-SemiBold',
  serifItalic: 'InstrumentSerif-Italic',
  sans: 'Inter-Regular',
  sansMed: 'Inter-Medium',
  sansSemi: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
} as const;
