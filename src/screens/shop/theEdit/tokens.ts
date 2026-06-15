/**
 * THE EDIT — design tokens (EXACT to the build sheet).
 *
 * "The shop is the back half of the scan — Pura's curation of YOUR skin's
 * products." Editorial, intimate, calm, dimensional. Porcelain canvas lit by a
 * cool-blue radial; ZERO warm peach (warmth lives only in the orb + the
 * finding-echo glows). All literals for THE EDIT live here so the screen +
 * cards read one source.
 */

import { Platform } from 'react-native';

export const edit = {
  // ── Color ────────────────────────────────────────────────────────────────
  porcelain: '#FCFDFF',
  ink: '#080A0F',
  muted: '#6E6E73',
  mutedStrong: '#5A5A5E', // affiliate disclosure — slightly stronger than `muted` for legibility
  blue: '#147CFF',
  white: '#FFFFFF',
  hairline: 'rgba(8,10,15,0.08)',
  hairlineStrong: 'rgba(8,10,15,0.12)',
  // atmosphere
  lightCore: 'rgba(20,124,255,0.05)', // top cool-blue radial
  vignette: 'rgba(8,10,15,0.03)', // bottom
  // tints
  blueTint: 'rgba(20,124,255,0.10)',
  blueTintText: '#0E63CC',
  greyTint: 'rgba(110,110,115,0.12)',
  // success — RESERVED strictly for echo.direction==='better' ('one step better' /
  // 'less needed now'). The ONLY new palette entry beyond mutedStrong. Never general-purpose.
  successTint: 'rgba(52,168,83,0.12)',
  successTintText: '#1E7B34',
} as const;

// ── Type ramp (exact) ────────────────────────────────────────────────────────
const SERIF = 'InstrumentSerif-Regular';
const SANS = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';

export const type = {
  // Display serif carries negative tracking; it interpolates toward `titleSmall`
  // as the masthead shrinks (EditHeader owns the interpolation).
  title: { fontFamily: SERIF, fontSize: 34, lineHeight: 34 * 1.05, letterSpacing: -0.68, color: edit.ink }, // -0.02em @ 34px
  titleSmall: { fontFamily: SERIF, fontSize: 22, lineHeight: 22 * 1.05, letterSpacing: -0.44, color: edit.ink }, // scrolled-state tracking reference
  section: { fontFamily: SERIF, fontSize: 22, lineHeight: 22 * 1.05, color: edit.ink },
  // THE single concern-intro size — the finding-voice that LEADS each section.
  // 22 == `section` (resolves the 20/21/24 conflict); +0.04em open tracking; tinted in EchoGlow/TheEditScreen.
  concernIntro: { fontFamily: SERIF, fontSize: 22, lineHeight: 22 * 1.12, letterSpacing: 0.04 * 20, color: edit.ink }, // letterSpacing 0.8
  empty: { fontFamily: SERIF, fontSize: 44, lineHeight: 44 * 1.05, color: edit.ink },
  name: { fontFamily: SANS_SEMI, fontSize: 16, lineHeight: 16 * 1.3, color: edit.ink },
  price: { fontFamily: SANS_SEMI, fontSize: 15, lineHeight: 15 * 1.3, color: edit.ink },
  // Prices lock to a grid on web (tabular-nums) so digits never jitter as values
  // change; native is identical to `price`. Cards import this for EVERY price.
  priceTabular: {
    fontFamily: SANS_SEMI,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: edit.ink,
    ...(Platform.OS === 'web' ? ({ fontVariantNumeric: 'tabular-nums' } as any) : {}),
  },
  why: { fontFamily: SANS, fontSize: 14, lineHeight: 14 * 1.4, color: edit.ink },
  sub: { fontFamily: SANS, fontSize: 13, lineHeight: 13 * 1.4, color: edit.muted },
  chip: { fontFamily: SANS_MED, fontSize: 14, lineHeight: 14 * 1.2 },
  eyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 12, // one eyebrow size — the 13px bump is rejected
    lineHeight: 12 * 1.2,
    letterSpacing: 0.12 * 12, // 1.44 — generous editorial tracking
    textTransform: 'uppercase' as const,
    color: edit.muted,
  },
  label: { fontFamily: SANS_SEMI, fontSize: 12, lineHeight: 12 * 1.2 },
  disclosure: { fontFamily: SANS, fontSize: 11, lineHeight: 11 * 1.4, color: edit.muted },
  // Footer trust line ("works even if you buy nothing") — heavier than the affiliate disclosure.
  promise: { fontFamily: SANS_SEMI, fontSize: 13, lineHeight: 13 * 1.4, color: edit.ink },
} as const;

/**
 * Standalone alias of `type.priceTabular` so cards can `import { priceTabular }`
 * directly. Same object — one definition, two import paths (`type.priceTabular`
 * and `priceTabular`). Web tabular-nums, native unchanged.
 */
export const priceTabular = type.priceTabular;

// ── Spacing (8pt grid) ───────────────────────────────────────────────────────
export const space = {
  gutter: 20,
  cardPad: 16,
  xs: 4,
  s: 8,
  m: 12,
  section: 40, // the ONE canonical section step — the 32/48 churn is rejected
  featureFrameGap: 12, // top gap above the full-width featured hero card
} as const;

export const radius = { card: 24, tile: 18, chip: 999, pill: 999 } as const;

// ── Motion (exact) ───────────────────────────────────────────────────────────
export const motion = {
  setDownStaggerMs: 70, // shipped set-down cadence — preserved (the 95ms proposal is rejected)
  setDownSpring: { damping: 20, stiffness: 180, mass: 1 },
  // The ONE finding-echo breath curve. EchoGlow scales strength against this base
  // (per pick.echo.strength) — no extra tokens for strength tiers.
  echo: { min: 0.12, max: 0.22, scaleMin: 1, scaleMax: 1.06, halfMs: 1600 }, // ~3.2s loop
  // Shared reveal-bloom recipe: a one-shot warm-up of the echo as the first pick of
  // a concern section enters view. Consumed by ConcernPickCard via a shared value.
  echoBloomTo: 0.16,
  echoBloomInMs: 400,
  echoBloomHoldMs: 600,
  echoBloomOutMs: 2000,
  atmosphere: { scaleMin: 1, scaleMax: 1.06, halfMs: 3000 }, // ~6s loop
  chipFadeOutMs: 140,
  chipFadeInMs: 200,
  chipReflowPx: 8,
  addMs: 160,
  // Bounded parallax differentials — three planes at distinct rates, never a gimmick.
  // back 0.3 (SINKING — the lift-inversion proposal is rejected) > mid 0.06 > front 0.08,
  // each clamped by its own MaxPx (front clamped tighter than mid).
  backDrift: 0.3, // back plane factor (eased + clamped in AtmosphericLight)
  backDriftMaxPx: 80,
  midDrift: 0.06, // mid plane (concern sections wrapper) — the ONE mid differential
  midDriftMaxPx: 16,
  frontDrift: 0.08, // front (bled product photo) factor
  frontDriftMaxPx: 10,
} as const;

// ── Elevation ────────────────────────────────────────────────────────────────
// THE ONE SHADOW RECIPE. Exactly TWO elevation tokens exist: `cardElevation`
// (cards) and `productShadow` (bled product photos AND the full-width featured
// hero — it reuses productShadow rather than a third tier). No component may
// define an inline boxShadow / shadow*, no third tier, no per-state
// intensification. Depth comes from shadow + atmosphere + echo — never a gloss bar.
// (`productShadowIntense` and a separate `featuredShadow` are deliberately rejected.)

/** Two-shadow card stack (contact + ambient). Web boxShadow; native fallback. */
export const cardElevation = Platform.select({
  web: {
    boxShadow:
      '0px 1px 2px rgba(8,10,15,0.05), 0px 8px 24px rgba(8,10,15,0.06)',
  },
  default: {
    shadowColor: '#080A0F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
}) as object;

/**
 * The grounded shadow under a bled product photo (front plane) and the
 * full-width featured hero. Deeper contact + a wider ambient drop than a card.
 */
export const productShadow = Platform.select({
  web: { boxShadow: '0px 1px 3px rgba(8,10,15,0.08), 0px 14px 32px rgba(8,10,15,0.12)' },
  default: {
    shadowColor: '#080A0F',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 6,
  },
}) as object;
