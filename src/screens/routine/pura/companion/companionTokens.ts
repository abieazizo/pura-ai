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
 *
 * Cycle 6 (ritual) deepened three things here without touching the
 * locked anchors: the AM/PM day atmosphere is now genuinely temperature-
 * distinct (golden dawn vs periwinkle dusk, not two near-whites); the
 * hero rides a real lift (≈e3) instead of a 0.06 whisper; and a small
 * celebration/streak vocabulary was added so the all-complete moment can
 * become a ceremony rather than a static card.
 */

import type { TextStyle, ViewStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';
import type { PillarKey, RoutineTimeOfDay } from '@/types/routine';

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
  /** Celebration bloom ring — Pura Blue at a soft alpha that radiates out. */
  blueRing: 'rgba(20, 124, 255, 0.16)',
  /** Streak chip fill — Pura Blue @10% (chip text reuses CC.blue). */
  streakBg: 'rgba(20, 124, 255, 0.10)',
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
// Day atmosphere (AM / PM ambient sky)
// ---------------------------------------------------------------------------

/**
 * The whole-page mood behind the companion, keyed off time of day. The pillar
 * atmosphere (above) colours the *hero card*; this colours the *air around it*
 * so AM and PM feel like genuinely different rituals — a warm dawn that lifts
 * you into the day, a cool dusk that settles you down. Stays in the porcelain
 * light family (no dark theme); the difference is temperature + a soft top
 * glow (sun vs moonlight) that breathes.
 *
 * Cycle 6: pushed the temperature contrast above perceptual threshold. Morning
 * now opens on a genuine golden first-light crown and resolves to a clean cool
 * base (the day ahead); evening opens on a cool periwinkle twilight and settles
 * into a dusk lilac (nightfall). `glowHeight` lets the sunrise band spread taller
 * than the tighter pool of moonlight.
 */
export interface DayAtmosphere {
  /** Full-page vertical sky gradient, top → bottom. */
  sky: readonly [string, string, string];
  /** Soft top glow (sun / moonlight) that fades to transparent. */
  glow: string;
  /** Resting glow-layer opacity; the breath modulates around it. */
  glowOpacity: number;
  /** Fraction of screen height the glow band occupies (sun spreads, moon pools). */
  glowHeight: number;
}

export const DAY_ATMOSPHERE: Record<RoutineTimeOfDay, DayAtmosphere> = {
  // Morning — a golden first-light crown lifting into a clean, cool day.
  morning: {
    sky: ['#FFF0D6', '#FCFBF6', '#E9F1FF'],
    glow: '#FFD08A',
    glowOpacity: 0.8,
    glowHeight: 0.52,
  },
  // Evening — a cool periwinkle twilight settling into a soft dusk lilac.
  evening: {
    sky: ['#E1EAFF', '#F2F5FF', '#EAE4F8'],
    glow: '#A6BEFF',
    glowOpacity: 0.62,
    glowHeight: 0.42,
  },
};

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
  /** Per-step node dots on the spine (the "ritual ladder"). */
  progressNode: 7,
  /** Screen-height threshold below which the compact hero kicks in. */
  compactBelow: 700,
  /** Completed-tail pill. */
  tailPill: 80,
  tailPillHeight: 88,
  tailImage: 40,
} as const;

export const companionShadows = {
  /**
   * Hero card — the centerpiece floats at a real ≈e3 lift (Cycle 6 deepened
   * this from the original 0.06 whisper so figure-ground actually reads on
   * porcelain). Still soft and wide, never hard.
   */
  hero: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  /** Upcoming preview — opacity 0.05, a gentle step below the hero. */
  upcoming: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.05,
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
  /** Celebration eyebrow above the title ("MORNING RITUAL"). */
  celebrationEyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: CC.blue,
    textAlign: 'center',
  },
  /** Streak chip label ("4 days in a row"). */
  streakLabel: {
    fontFamily: SANS_SEMI,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: CC.blue,
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
  /** Hero rise on step completion — springy settle with a touch of overshoot. */
  heroRiseSpring: { stiffness: 220, damping: 16, mass: 1 },
  /** Celebration sparkle "pop" — looser spring, a clear overshoot bounce. */
  orbPopSpring: { stiffness: 170, damping: 11, mass: 1 },
  // Durations (ms).
  reveal: 600,
  fill: 350,
  checkmark: 450,
  cardExit: 500,
  progressFill: 800,
  /** One-shot expanding ring when the spine reaches 100%. */
  progressBloomMs: 850,
  breathMs: 4000,
  /** Slow whole-page atmosphere breath (AM/PM sky glow). */
  atmosphereBreathMs: 7000,
  /** AM↔PM atmosphere cross-fade. */
  atmosphereSwap: 520,
  heroSwap: 400,
  whyExpand: 250,
  /** Master clock for the all-complete celebration ceremony (staggered). */
  celebrationReveal: 850,
  /** Celebration bloom rings expand-and-fade over this. */
  celebrationRingMs: 1150,
} as const;
