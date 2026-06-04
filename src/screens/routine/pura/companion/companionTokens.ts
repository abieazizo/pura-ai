/**
 * Routine Companion — locked visual system.
 *
 * The companion redesign ships against a deliberately small, locked
 * palette and a per-pillar "atmosphere" the rest of the surface keys
 * off. Nothing in `companion/` embeds literal hex; every gradient,
 * halo, and text colour reads from here so the five zones never drift.
 *
 * The atmosphere is the signature: each pillar owns a soft top-left
 * wash (hero), a softer wash (upcoming preview), and a visible-but-calm
 * halo behind its product image. Cleanse=blue, Treat=peach, Moisturize=
 * green, Protect=amber — the only place the surface admits warmth.
 */

import type { TextStyle, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';
import type { PillarKey } from '@/types/routine';

const SERIF = 'InstrumentSerif-Regular';
const SERIF_ITALIC = 'InstrumentSerif-Italic';
const SANS_REG = 'Inter-Regular';
const SANS_MED = 'Inter-Medium';
const SANS_SEMI = 'Inter-SemiBold';

// ---------------------------------------------------------------------------
// Locked palette
// ---------------------------------------------------------------------------

export const CC = {
  /** Porcelain — the page. */
  porcelain: '#FCFDFF',
  /** Ink — primary text + the Mark-as-done button. */
  ink: '#080A0F',
  /** Pura Blue — the one accent. */
  blue: '#147CFF',
  blueDeep: '#075FD1',
  /** Muted gray — secondary text. */
  muted: '#6E6E73',
  white: '#FFFFFF',
  /** Hairline at low alpha for the Why-this expansion + dividers. */
  hairline: 'rgba(20, 124, 255, 0.15)',
  /** Track for the vertical progress line (muted gray @15%). */
  lineTrack: 'rgba(110, 110, 115, 0.15)',
  /** STEP X OF Y pill — Pura Blue on 12% alpha. */
  bluePill: 'rgba(20, 124, 255, 0.12)',
} as const;

// ---------------------------------------------------------------------------
// Pillar atmosphere
// ---------------------------------------------------------------------------

export interface PillarAtmosphere {
  /** Hero gradient: [top-left tint, →white]. */
  hero: readonly [string, string];
  /** Upcoming-preview gradient (softer): [tint, →white]. */
  upcoming: readonly [string, string];
  /** Visible-but-calm glow behind the product image. */
  halo: string;
}

/**
 * Per-pillar atmosphere. Hero top-left tints are the spec values
 * (Cleanse #F0F6FE / Treat #FDF6F0 / Moisturize #F2F7F3 / Protect
 * #FEF8EE), each fading to white. Upcoming tints are the softer
 * variants. Halos are a touch more saturated than the wash so the
 * product reads as floating in coloured light rather than on flat paper.
 */
export const PILLAR_ATMOSPHERE: Record<PillarKey, PillarAtmosphere> = {
  cleanse: {
    hero: ['#F0F6FE', '#FFFFFF'],
    upcoming: ['#F8FAFE', '#FFFFFF'],
    halo: '#CFE3FF',
  },
  treat: {
    hero: ['#FDF6F0', '#FFFFFF'],
    upcoming: ['#FEFAF7', '#FFFFFF'],
    halo: '#F8DEC8',
  },
  moisturize: {
    hero: ['#F2F7F3', '#FFFFFF'],
    upcoming: ['#F9FBFA', '#FFFFFF'],
    halo: '#CFE8D6',
  },
  protect: {
    hero: ['#FEF8EE', '#FFFFFF'],
    upcoming: ['#FFFBF6', '#FFFFFF'],
    halo: '#FBE6BE',
  },
};

/** Celebration hero wash — soft blue, used when the routine is complete. */
export const CELEBRATION_GRADIENT: readonly [string, string] = ['#F4F8FE', '#FFFFFF'];

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export const companionGeo = {
  /** Screen-edge margin for the hero (full width minus this on each side). */
  screenMargin: 16,
  heroRadius: 24,
  heroHeight: 360,
  heroHeightCompact: 320,
  /** Product image + its halo. */
  productImage: 140,
  productImageCompact: 110,
  halo: 160,
  haloCompact: 132,
  upcomingRadius: 16,
  upcomingImage: 52,
  buttonHeight: 56,
  buttonRadius: 28,
  /** Left vertical progress line: 2px, inset 8px from the screen edge. */
  progressLineWidth: 2,
  progressLineInset: 8,
  /** Screen-height threshold below which the compact hero kicks in. */
  compactBelow: 700,
  /** Completed-tail pill. */
  tailPill: 80,
  tailPillHeight: 88,
  tailImage: 40,
} as const;

export const companionShadows = {
  /** Hero card — opacity 0.06, radius 24, offset 0,8 (spec). */
  hero: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  /** Upcoming preview — opacity 0.04. */
  upcoming: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  /** Mark-as-done button. */
  button: {
    shadowColor: '#05070B',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  /** Pura Blue glow at the foot of the progress line at 100%. */
  blueGlow: {
    shadowColor: '#147CFF',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
} as const satisfies Record<string, ViewStyle>;

// ---------------------------------------------------------------------------
// Typography (spec sizes — companion-specific, do not reuse routine tokens)
// ---------------------------------------------------------------------------

export const companionType = {
  /** "Routine" page title. */
  pageTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: CC.ink,
  },
  /** Date under the title. */
  date: {
    fontFamily: SANS_REG,
    fontSize: 12,
    lineHeight: 16,
    color: CC.muted,
  },
  /** Streak-aware greeting line. */
  greeting: {
    fontFamily: SERIF,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: CC.ink,
  },
  /** Top-right "Customize" link. */
  link: {
    fontFamily: SANS_MED,
    fontSize: 14,
    lineHeight: 18,
    color: CC.blue,
  },
  /** AM/PM segmented label. */
  toggle: {
    fontFamily: SANS_MED,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  toggleSelected: {
    fontFamily: SANS_SEMI,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
    color: CC.white,
  },
  /** "STEP 1 OF 3" pill. */
  stepPill: {
    fontFamily: SANS_SEMI,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: CC.blue,
  },
  /** Pillar label inside the hero. */
  pillarLabel: {
    fontFamily: SANS_MED,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: CC.muted,
  },
  /** Product name (serif). */
  productName: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: CC.ink,
  },
  /** Brand caps. */
  brand: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: CC.muted,
  },
  /** Application guidance (italic). */
  guidance: {
    fontFamily: SANS_REG,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
    color: CC.ink,
  },
  /** Inline "Why this?" link. */
  whyLink: {
    fontFamily: SANS_MED,
    fontSize: 13,
    lineHeight: 17,
    color: CC.blue,
  },
  /** Why-this expanded body. */
  whyBody: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 21,
    color: CC.ink,
  },
  /** Mark-as-done button label. */
  button: {
    fontFamily: SANS_SEMI,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: CC.white,
  },
  /** Zone eyebrows ("COMING UP", "DONE TONIGHT"). */
  eyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: CC.muted,
  },
  /** "Tap any step to focus on it" hint (italic). */
  hint: {
    fontFamily: SANS_REG,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 16,
    color: CC.muted,
  },
  /** Upcoming card pillar name. */
  upcomingPillar: {
    fontFamily: SANS_SEMI,
    fontSize: 13,
    lineHeight: 17,
    color: CC.ink,
  },
  upcomingProduct: {
    fontFamily: SANS_REG,
    fontSize: 12,
    lineHeight: 16,
    color: CC.muted,
  },
  /** Completed-tail pill label. */
  tailLabel: {
    fontFamily: SANS_MED,
    fontSize: 11,
    lineHeight: 14,
    color: CC.muted,
  },
  /** Celebration title. */
  celebrationTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: CC.ink,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 20,
    color: CC.muted,
    textAlign: 'center',
  },
} as const satisfies Record<string, TextStyle>;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * Spec curves. Entrances ease-out (settle), exits ease-in (depart).
 * Built once so every animated surface shares the exact same feel.
 */
export const companionMotion = {
  /** cubic-bezier(0.16, 1, 0.3, 1) — entrances, progress-line fill. */
  entrance: Easing.bezier(0.16, 1, 0.3, 1),
  /** cubic-bezier(0.4, 0, 1, 1) — exits. */
  exit: Easing.bezier(0.4, 0, 1, 1),
  /** Soft in-out for the ambient product breath. */
  breath: Easing.inOut(Easing.sin),
  spring: { stiffness: 200, damping: 22, mass: 1 },
  // Durations (ms).
  reveal: 600,
  fill: 350,
  checkmark: 450,
  cardExit: 500,
  progressFill: 800,
  breathMs: 4000,
  heroSwap: 400,
  whyExpand: 250,
} as const;
