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
//
// Cycle 10 (colour & gradient) — the anchors are untouched (Porcelain, Ink,
// Pura Blue), but the accent is no longer allowed to flood. Blue now PUNCTUATES
// (the AM/PM highlight, the active button-fill, the live progress spine, the
// completion ceremony). Secondary chrome — the "Customize"/"Why this?"/"Ask"/
// "Rebuild" links, eyebrows, carets, the spine *track* — moved to ink/neutral so
// the accent re-earns attention each time it appears. The supporting cool
// neutrals (`inkSoft`/`slate`/`mist`) come from the shared graphite ramp so the
// surface reads as one tonal family rather than blue-on-white everywhere.
// ---------------------------------------------------------------------------

export const CC = {
  /** Porcelain — the page. */
  porcelain: '#FCFDFF',
  /** Ink — primary text + the Mark-as-done button. */
  ink: '#080A0F',
  /** Pura Blue — the one accent. PUNCTUATES, never floods. */
  blue: '#147CFF',
  blueDeep: '#075FD1',
  /** Legible blue text on blue tints (ramp blue[900]) — for the rare blue word. */
  blueText: '#063D8F',
  /** Muted gray — secondary text. */
  muted: '#6E6E73',
  /** Cool graphite (neutral[700]) — secondary links/actions pulled off blue. */
  inkSoft: '#3A4150',
  /** Cool slate (neutral[600]) — quiet metadata, carets, eyebrows. */
  slate: '#5D6673',
  /** Faint cool mist (neutral[100]) — neutral chip fills, tinted scrims. */
  mist: '#EEF4FB',
  white: '#FFFFFF',
  /** Hairline at low alpha for the Why-this expansion + dividers (cool ink). */
  hairline: 'rgba(8, 22, 56, 0.08)',
  /** Track for the vertical progress line — quiet cool neutral, not blue. */
  lineTrack: 'rgba(91, 102, 115, 0.16)',
  /** Neutral hairline border for resting cards/pills (cool ink @6%). */
  cardLine: 'rgba(8, 22, 56, 0.06)',
  /** STEP X OF Y pill — Pura Blue on 12% alpha (a true data accent → stays blue). */
  bluePill: 'rgba(20, 124, 255, 0.12)',
  /** Hero segment-track — unfilled rung of the horizontal step meter (cool ink @9%). */
  segmentTrack: 'rgba(8, 22, 56, 0.09)',
  /** The faint "/ 03" denominator beside the big climbing step numeral (cool slate). */
  numeralDenom: 'rgba(93, 102, 115, 0.55)',
  /** Neutral pill fill — secondary chips that should NOT pull blue. */
  neutralPill: 'rgba(91, 102, 115, 0.10)',
  /** Celebration bloom ring — Pura Blue at a soft alpha that radiates out. */
  blueRing: 'rgba(20, 124, 255, 0.16)',
  /** Streak chip fill — Pura Blue @10% (chip text reuses CC.blue). */
  streakBg: 'rgba(20, 124, 255, 0.10)',
  /** Soft success green — the "done" semantic (from the shared success ramp). */
  done: '#20A67A',
  doneDeep: '#188A65',
  /** Foot-of-card scrim that lifts the dark button off the wash (cool ink). */
  footScrim: 'rgba(8, 22, 56, 0.05)',
  /** Sheet top veil — a whisper of cool light over flat porcelain. */
  veilTop: 'rgba(234, 244, 255, 0.6)',
  veilMid: 'rgba(247, 250, 255, 0.32)',
} as const;

// ---------------------------------------------------------------------------
// Pillar atmosphere
// ---------------------------------------------------------------------------

export interface PillarAtmosphere {
  /**
   * Hero wash — a 3-stop diagonal: [saturated top-left tint, mid relief,
   * →white]. The middle stop turns the old flat two-stop fade into a soft
   * mesh-like field so the hero has real colour *depth*, not a single ramp.
   */
  hero: readonly [string, string, string];
  /** Upcoming-preview gradient (softer 3-stop): [tint, mid, →white]. */
  upcoming: readonly [string, string, string];
  /** Visible-but-calm glow behind the product image. */
  halo: string;
  /** Deeper halo edge — paired with `halo` for a radial-feel product bloom. */
  haloDeep: string;
}

/**
 * Per-pillar atmosphere — harmonized in Cycle 10.
 *
 * Each pillar's wash now AGREES with its identity accent (see
 * `pillarIdentity`): cleanse + treat are the Pura-Blue pair (treat sits a
 * half-step cooler/deeper so the two blues stay distinguishable), moisturize
 * is the sage-green family, protect the amber family. This removes the old
 * orphaned peach `treat` field (its icon was already blue) so no wash clashes
 * with the glyph sitting in it. Warmth is retained ONLY where the pillar
 * identity itself is warm (moisturize/protect) — the deliberate Cycle-6 win —
 * but pulled to a quieter, more sophisticated saturation. Every stop is a
 * tasteful porcelain tint; the third stop resolves to white so cards still
 * read as light surfaces. Halos carry a soft→deep pair for a radial bloom.
 */
export const PILLAR_ATMOSPHERE: Record<PillarKey, PillarAtmosphere> = {
  cleanse: {
    hero: ['#EAF2FE', '#F4F8FE', '#FFFFFF'],
    upcoming: ['#F4F8FE', '#FAFCFF', '#FFFFFF'],
    halo: '#D7E7FF',
    haloDeep: '#BBD6FF',
  },
  treat: {
    // The second blue — a touch deeper/cooler than cleanse so the pair reads
    // as two related-but-distinct steps, not a repeat.
    hero: ['#E4EEFC', '#EFF5FD', '#FFFFFF'],
    upcoming: ['#EFF5FD', '#F7FAFE', '#FFFFFF'],
    halo: '#CBDEFF',
    haloDeep: '#AEC9FB',
  },
  moisturize: {
    // Sage family — quieter, more sophisticated than the old flat mint.
    hero: ['#ECF4EE', '#F4F9F5', '#FFFFFF'],
    upcoming: ['#F4F9F5', '#FAFCFB', '#FFFFFF'],
    halo: '#CFE6D5',
    haloDeep: '#B6D7BF',
  },
  protect: {
    // Amber family — warm dawn defense, pulled back from the old buttery tint.
    hero: ['#FBF3E6', '#FCF8F0', '#FFFFFF'],
    upcoming: ['#FCF8F0', '#FEFBF6', '#FFFFFF'],
    halo: '#F6E2BC',
    haloDeep: '#EFD29A',
  },
};

/**
 * Celebration hero wash — a richer 3-stop Pura-Blue ambient (the payoff is one
 * of the few moments blue is *meant* to bloom). Deepens from a soft blue crown
 * through a relief stop to white, so the ceremony card reads as lit, not flat.
 */
export const CELEBRATION_GRADIENT: readonly [string, string, string] = [
  '#E6F1FF',
  '#F2F7FE',
  '#FFFFFF',
];

/**
 * Sheet veil — a soft cool wash drawn at the TOP of the product/customize
 * sheets so the flat porcelain panel gains a little ambient depth behind the
 * packshot. Fades fully to transparent; never tints the body copy region.
 */
export const SHEET_VEIL: readonly [string, string, string] = [
  CC.veilTop,
  CC.veilMid,
  'rgba(252, 253, 255, 0)',
];

/**
 * Cycle 12 (imagery) — the SCANNED FACE as the recurring hero.
 *
 * The face portrait is the surface's signature image: the user's real scan
 * (`Scan.photoUri`) framed as a premium editorial portrait at the very top of
 * the live companion. A bottom scrim (ink → transparent, rising from the base)
 * keeps the greeting + date AA+ legible over any photo; a soft hairline frame
 * and a real lift separate it from the porcelain sky. These constants drive
 * BOTH the portrait and its honest locked placeholder so the two never drift.
 *
 * `FACE_SCRIM` is the bottom-up scrim (read top→bottom by the gradient): a
 * transparent crown, a relief stop, then a deep ink foot the text sits on. It
 * is intentionally darker than the porcelain veils above (this is a photo, not
 * a panel) so white text clears AA on light skin tones / bright captures.
 */
export const FACE_SCRIM: readonly [string, string, string, string] = [
  'rgba(8, 10, 15, 0)',
  'rgba(8, 10, 15, 0.18)',
  'rgba(8, 10, 15, 0.62)',
  'rgba(8, 10, 15, 0.82)',
];

/** A faint cool top-light over the portrait so the capture gains ambient depth. */
export const FACE_TOPLIGHT: readonly [string, string] = [
  'rgba(255, 255, 255, 0.16)',
  'rgba(255, 255, 255, 0)',
];

/** Locked placeholder wash (no real photo yet) — a calm Pura-Blue dawn field. */
export const FACE_PLACEHOLDER_WASH: readonly [string, string, string] = [
  '#EAF2FE',
  '#F3F7FE',
  '#FCFDFF',
];

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
  // Cycle 10 kept the signature temperature swing (this is the Cycle-6 win)
  // but refined the hand-off: the warm crown now resolves through a true
  // neutral porcelain mid before the cool base, so the transition reads as
  // dawn light warming the room rather than two tints meeting at a seam.
  morning: {
    sky: ['#FFEFD2', '#FBFAF6', '#E8F1FF'],
    glow: '#FFCE83',
    glowOpacity: 0.8,
    glowHeight: 0.52,
  },
  // Evening — a cool periwinkle twilight settling into a soft dusk. Pulled a
  // step away from lilac toward a calmer blue-slate so it never reads violet
  // (the locked DNA forbids purple surfaces; the orb keeps its own aura).
  evening: {
    sky: ['#DEE8FF', '#EFF3FE', '#E4E6F4'],
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
  heroRadius: 28,
  // Cycle 11 (BOLD): the focus card is now a true ritual centerpiece, not a
  // card in a list. It stands far taller so the product floats in real space
  // and the climbing step numeral + segmented meter have room to dominate.
  heroHeight: 524,
  heroHeightCompact: 432,
  /** Product image + its halo — grown dramatically so the packshot reads hero-scale. */
  productImage: 196,
  productImageCompact: 150,
  halo: 248,
  haloCompact: 196,
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
  // Cycle 12 (imagery) — the scanned-face hero portrait. A wide editorial
  // band (the capture is portrait-cropped via contentFit="cover") that opens
  // the live companion. `faceRadius` matches the hero card's generous corner
  // so the two big rounded surfaces rhyme; the compact height keeps it a
  // banner, not a full portrait, so the ritual stays above the fold.
  faceBannerHeight: 188,
  faceBannerHeightCompact: 150,
  faceRadius: 26,
  /** Contact-shadow ellipse beneath a product packshot — grounds it on the halo. */
  productContactWidth: 0.62,
  productContactHeight: 16,
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
  /**
   * Cycle 12 — the scanned-face portrait lift. A real, soft, downward
   * shadow (≈e3) so the hero capture separates cleanly from the porcelain
   * sky and reads as a premium framed photograph, not a flat inset.
   */
  facePortrait: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
  },
  /**
   * Cycle 12 — product contact shadow. A diffuse cool-ink pool that the
   * grounding ellipse beneath every packshot carries, so the product reads
   * as resting in the halo's light rather than pasted flat. Soft + wide.
   */
  productContact: {
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
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
  /** Top-right "Customize" link — neutral ink (a quiet utility, not the accent). */
  link: {
    fontFamily: SANS_MED,
    fontSize: 14,
    lineHeight: 18,
    color: CC.inkSoft,
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
  /**
   * Cycle 11 — the hero's crown. The current step rendered as a giant
   * editorial serif numeral that literally climbs as the ritual advances
   * ("01" → "02" → "03"). This is the dramatized-progress signature: progress
   * you read in one glance from across the room. Tabular so the glyph never
   * shifts as it counts up.
   */
  heroStepNumeral: {
    fontFamily: SERIF,
    fontSize: 72,
    lineHeight: 70,
    letterSpacing: -2,
    color: CC.ink,
  },
  /** The "/ 03" denominator trailing the big numeral — quiet, smaller, cool. */
  heroStepDenom: {
    fontFamily: SERIF,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: CC.numeralDenom,
  },
  /** "STEP" micro-kicker stacked above the big numeral. */
  heroStepKicker: {
    fontFamily: SANS_SEMI,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: CC.slate,
  },
  /** Product name (serif) — Cycle 11 grew this to a true editorial hero line. */
  productName: {
    fontFamily: SERIF,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.6,
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
  /** Inline "Why this?" link — neutral ink so the hero's blue button-fill stays
   *  the only accent on the card. */
  whyLink: {
    fontFamily: SANS_MED,
    fontSize: 13,
    lineHeight: 17,
    color: CC.inkSoft,
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
  // -------------------------------------------------------------------------
  // Cycle 12 — text set OVER the scanned-face portrait. White/near-white so it
  // clears AA on the scrim foot; a subtle shadow on the serif title adds the
  // last bit of separation from a bright capture.
  // -------------------------------------------------------------------------
  /** "TODAY'S SKIN" caps eyebrow on the portrait. */
  faceEyebrow: {
    fontFamily: SANS_SEMI,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.92)',
  },
  /** The greeting line over the portrait — editorial serif, white. */
  faceGreeting: {
    fontFamily: SERIF,
    fontSize: 25,
    lineHeight: 29,
    letterSpacing: -0.4,
    color: CC.white,
  },
  /** Date / scan-day metadata over the portrait. */
  faceMeta: {
    fontFamily: SANS_MED,
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.86)',
  },
  /** Locked-placeholder copy (no photo yet) — sits on porcelain, so ink. */
  facePlaceholderTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.3,
    color: CC.ink,
  },
  facePlaceholderBody: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 18,
    color: CC.slate,
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
