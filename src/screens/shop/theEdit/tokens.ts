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
} as const;

// ── Type ramp (exact) ────────────────────────────────────────────────────────
const SERIF = 'InstrumentSerif-Regular';
const SANS = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';

export const type = {
  title: { fontFamily: SERIF, fontSize: 34, lineHeight: 34 * 1.05, color: edit.ink },
  titleSmall: { fontFamily: SERIF, fontSize: 22, lineHeight: 22 * 1.05, color: edit.ink },
  section: { fontFamily: SERIF, fontSize: 22, lineHeight: 22 * 1.05, color: edit.ink },
  concernIntro: { fontFamily: SERIF, fontSize: 20, lineHeight: 20 * 1.1, color: edit.ink },
  empty: { fontFamily: SERIF, fontSize: 44, lineHeight: 44 * 1.05, color: edit.ink },
  name: { fontFamily: SANS_SEMI, fontSize: 16, lineHeight: 16 * 1.3, color: edit.ink },
  price: { fontFamily: SANS_SEMI, fontSize: 15, lineHeight: 15 * 1.3, color: edit.ink },
  why: { fontFamily: SANS, fontSize: 14, lineHeight: 14 * 1.4, color: edit.ink },
  sub: { fontFamily: SANS, fontSize: 13, lineHeight: 13 * 1.4, color: edit.muted },
  chip: { fontFamily: SANS_MED, fontSize: 14, lineHeight: 14 * 1.2 },
  eyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 12,
    lineHeight: 12 * 1.2,
    letterSpacing: 0.08 * 12,
    textTransform: 'uppercase' as const,
    color: edit.muted,
  },
  label: { fontFamily: SANS_SEMI, fontSize: 12, lineHeight: 12 * 1.2 },
  disclosure: { fontFamily: SANS, fontSize: 11, lineHeight: 11 * 1.4, color: edit.muted },
} as const;

// ── Spacing (8pt grid) ───────────────────────────────────────────────────────
export const space = {
  gutter: 20,
  cardPad: 16,
  xs: 4,
  s: 8,
  m: 12,
  section: 40,
} as const;

export const radius = { card: 24, tile: 18, chip: 999, pill: 999 } as const;

// ── Motion (exact) ───────────────────────────────────────────────────────────
export const motion = {
  setDownStaggerMs: 70,
  setDownSpring: { damping: 20, stiffness: 180, mass: 1 },
  echo: { min: 0.14, max: 0.2, scaleMin: 1, scaleMax: 1.04, halfMs: 1600 }, // ~3.2s loop
  atmosphere: { scaleMin: 1, scaleMax: 1.06, halfMs: 3000 }, // ~6s loop
  chipFadeOutMs: 140,
  chipFadeInMs: 200,
  chipReflowPx: 8,
  addMs: 160,
  // bounded parallax differentials (a few px — never a gimmick)
  backDrift: 0.3, // back plane factor (eased + clamped in component)
  backDriftMaxPx: 80,
  frontDrift: 0.08, // front (product photo) factor
  frontDriftMaxPx: 10,
} as const;

// ── Elevation ────────────────────────────────────────────────────────────────
/** Two-shadow card stack (contact + ambient). Web boxShadow; native fallback. */
export const cardElevation = Platform.select({
  web: {
    boxShadow:
      '0px 1px 2px rgba(8,10,15,0.04), 0px 10px 28px rgba(8,10,15,0.05)',
  },
  default: {
    shadowColor: '#080A0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 28,
    elevation: 4,
  },
}) as object;

/** The soft contact shadow under a bled product photo (front plane). */
export const productShadow = Platform.select({
  web: { boxShadow: '0px 12px 28px rgba(8,10,15,0.10)' },
  default: {
    shadowColor: '#080A0F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
  },
}) as object;
