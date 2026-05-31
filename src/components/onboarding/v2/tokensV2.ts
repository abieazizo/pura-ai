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
  // Onboarding palette — Pura Blue system. Legacy property names
  // retained (terracotta, clay*) but values are now blue.
  paper: '#FCFDFF',
  paperRaised: '#FFFFFF',
  ink: '#080A0F',
  body: '#5D6673',
  muted: '#7C8696',
  border: '#E5EAF1',
  borderStrong: '#D4DCE8',
  terracotta: '#147CFF',
  terracottaPressed: '#075FD1',
  claySelected: '#EAF4FF',
  claySupport: '#F0F6FF',
  claySubtle: '#F7FAFF',
  disabledBg: '#E5EAF1',
  disabledText: '#929BA8',
  overlayDark: 'rgba(8, 10, 15, 0.42)',
} as const;

export const PURA_SHADOW = {
  soft: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.07,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  card: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.04,
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
