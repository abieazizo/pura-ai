/**
 * routineAtmosphere — the "Your Routine" experience surface palette + motion.
 *
 * This is the ONE place the routine experience's literal hex lives, so the
 * CLAUDE.md hex guard (`grep '#…' src --exclude-dir=theme`) stays green and the
 * screens read named tokens only. The values are the LOCKED routine spec — not
 * a reskin of `dsAmbient`, which it deliberately does NOT touch:
 *
 *   • `dsAmbient` is the app-wide surface vocabulary — all-porcelain, "night
 *     dims but never goes black", no violet surfaces. Correct for Home/Shop/Me.
 *   • This module is the immersive RITUAL surface — a single, self-contained,
 *     full-bleed experience (like the scan ceremony or onboarding cold-open)
 *     that is allowed its own atmosphere: a warm dawn, a violet dusk, and a
 *     near-black NIGHT HERO where the orb's glow is the only warm light. The
 *     orb's violet aura is already DNA-sanctioned as "a small glowing object,
 *     deliberately separate from the surface vocabulary"; here the whole
 *     evening ritual leans into that one luminous object on deep calm.
 *
 * Period is time-of-day for the daily home, and inherited by the ritual:
 *   dawn (AM) · midday (default) · dusk (early PM) · night (HERO, late/evening).
 */

// Type-only import — this module stays runtime-pure (no Reanimated at load), so
// the data/model layer it feeds can be verified headlessly. The motion CURVES
// live at each call site (inline `Easing.bezier(0.22, 1, 0.36, 1)` for arrivals,
// `Easing.inOut(Easing.sin)` for drifts); only the no-bounce orb spring config
// is shared from here as a plain object.
import type { WithSpringConfig } from 'react-native-reanimated';

export type RoutinePeriod = 'dawn' | 'midday' | 'dusk' | 'night';

export interface PeriodAtmosphere {
  /** Whether this period renders the dark, luminous-orb hero treatment. */
  dark: boolean;
  /** Full-screen vertical sky, top → bottom (expo-linear-gradient colors). */
  sky: readonly [string, string, string];
  /** Soft radial bloom — color + resting opacity + normalized screen anchor. */
  bloom: { color: string; opacity: number; x: number; y: number; radius: number };
  /** Behind-orb radial lift (night only reads it; light periods reuse a wash). */
  orbPool: string;
  /** Static film grain opacity (4–6%). */
  grain: { color: string; opacity: number };
  /** Primary ink / serif voice color for this surface. */
  ink: string;
  /** Muted caption / throughline color. */
  muted: string;
  /** Faint label / eyebrow color. */
  faint: string;
  /** Resting card surface for this period. */
  card: string;
  /** Top-lit hairline on a card. */
  hairline: string;
  /** A whisper-soft fill for quiet chips on this surface. */
  chip: string;
}

// The locked routine palette. Hex literals are permitted here (theme dir).
export const ROUTINE_ATMOSPHERE: Record<RoutinePeriod, PeriodAtmosphere> = {
  // AM — warm porcelain, a soft sunrise bloom top-right. Fresh, unhurried.
  dawn: {
    dark: false,
    sky: ['#FFF6EF', '#FDEBE0', '#F6F0EA'],
    bloom: { color: '#FFE3CE', opacity: 0.22, x: 0.82, y: 0.14, radius: 1.05 },
    orbPool: 'rgba(255, 227, 206, 0.28)',
    grain: { color: '#6B4A36', opacity: 0.05 },
    ink: '#1A1410',
    muted: 'rgba(26, 20, 16, 0.56)',
    faint: 'rgba(26, 20, 16, 0.40)',
    card: '#FFFFFF',
    hairline: 'rgba(26, 20, 16, 0.06)',
    chip: 'rgba(26, 20, 16, 0.05)',
  },
  // Midday / default — minimal, calm porcelain. The quietest surface.
  midday: {
    dark: false,
    sky: ['#FCFDFF', '#F8FAFD', '#F4F7FB'],
    bloom: { color: '#E9F1FF', opacity: 0.10, x: 0.5, y: 0.1, radius: 1.1 },
    orbPool: 'rgba(20, 124, 255, 0.06)',
    grain: { color: '#2A3340', opacity: 0.04 },
    ink: '#080A0F',
    muted: 'rgba(8, 10, 15, 0.55)',
    faint: 'rgba(8, 10, 15, 0.38)',
    card: '#FFFFFF',
    hairline: 'rgba(8, 22, 56, 0.06)',
    chip: 'rgba(8, 22, 56, 0.05)',
  },
  // Early PM — a settling violet-blue dusk. Winding down, not yet dark.
  dusk: {
    dark: false,
    sky: ['#F2EEF6', '#ECE9F3', '#E9E6F0'],
    bloom: { color: '#D9DAF0', opacity: 0.30, x: 0.24, y: 0.12, radius: 1.0 },
    orbPool: 'rgba(217, 218, 240, 0.40)',
    grain: { color: '#3A3550', opacity: 0.05 },
    ink: '#161320',
    muted: 'rgba(22, 19, 32, 0.56)',
    faint: 'rgba(22, 19, 32, 0.40)',
    card: '#FFFFFF',
    hairline: 'rgba(22, 19, 32, 0.07)',
    chip: 'rgba(22, 19, 32, 0.05)',
  },
  // NIGHT — the hero. Near-black, a radial lift behind the orb, a deep-violet
  // aurora bloom. The orb's glow is the only warm light in the room.
  night: {
    dark: true,
    sky: ['#0A0B12', '#0B0C15', '#0A0B12'],
    bloom: { color: '#171A2E', opacity: 0.9, x: 0.5, y: 0.42, radius: 1.35 },
    orbPool: '#12131C',
    grain: { color: '#9AA0C0', opacity: 0.06 },
    ink: 'rgba(255, 255, 255, 0.94)',
    muted: 'rgba(255, 255, 255, 0.60)',
    faint: 'rgba(255, 255, 255, 0.40)',
    card: '#1C1E28',
    hairline: 'rgba(255, 255, 255, 0.08)',
    chip: 'rgba(255, 255, 255, 0.06)',
  },
};

/** Map a 0–23 local hour to a routine period. */
export function periodForHour(hour: number): RoutinePeriod {
  if (hour >= 5 && hour < 11) return 'dawn';
  if (hour >= 11 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/**
 * The period a time-of-day routine should *feel*. Morning is always dawn; the
 * evening leans on the real clock so an 18:00 wind-down reads dusk and a 22:00
 * ritual reads the night hero.
 */
export function periodForRoutine(
  timeOfDay: 'morning' | 'evening',
  hour: number,
): RoutinePeriod {
  if (timeOfDay === 'morning') return 'dawn';
  return hour < 20 && hour >= 17 ? 'dusk' : 'night';
}

// ---------------------------------------------------------------------------
// Motion — the spec's signature physics.
// ---------------------------------------------------------------------------

/**
 * The orb's spring — NO bounce. Low stiffness, high damping, so every glide
 * (down the list, to top-center, home again) settles like a held breath.
 */
export const ORB_RITUAL_SPRING: WithSpringConfig = {
  stiffness: 92,
  damping: 26,
  mass: 1,
  overshootClamping: true,
};

// Durations (ms) — named exactly to the frame spec so the choreography reads.
export const routineTiming = {
  // Mode A — moves → routine morph (~1.6s total).
  morphSettle: 400, //     0→400ms: stack settle, scale 1.0→0.96
  morphUnfoldGap: 160, //  each move unfolds 160ms apart
  morphRow: 360, //        each step row opacity 0→1, y +10→0
  morphRowStagger: 90, //  rows cascade 90ms apart
  morphThroughlineLag: 200, // throughline fades in 200ms after its row lands
  morphCtaFade: 300, //    "Start" CTA fades up LAST

  // Mode B — daily home.
  noticingBeat: 420, //    "noticing you" brighten + greeting fade
  focusRise: 420, //       focus card y +12→0

  // Mode C — guided ritual.
  ritualEnter: 400, //     home cross-dissolves, focus expands, surround → 0
  wordReveal: 55, //       orb line reveals word-by-word at 55ms/word
  cardBreathMs: 4000, //   near-invisible card breath 1.0→1.012→1.0, looping
  checkDraw: 320, //       checkmark draws itself via SVG path
  checkHapticAt: 180, //   single light haptic mid-draw
  stepSettleHold: 200, //  completed step holds before the next cross-fades
  careGlow: 500, //        completion-as-care glow cool→warm
  careHold: 700, //        …then HOLD STILL (the reward is the stillness)
  doneBloomMs: 1200, //    done-landing: orb's slowest bloom 1.0→1.15→1.0
  homeDissolve: 520, //    gentle cross-dissolve back home

  // Atmosphere.
  bloomDriftMs: 27000, //  bloom drifts on a 24–30s sine loop
  bloomTravelPx: 8, //     ≤ 8px travel
} as const;
