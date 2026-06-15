/**
 * routineFlow — the LOCKED palette + timing for the two-act routine redesign.
 *
 * ONE continuous experience in two acts:
 *   ACT 1 — THE OVERVIEW (light Porcelain): "your plan, calm and clear".
 *   ACT 2 — THE RITUAL  (dark theater): "the orb walks you through".
 *
 * This file is the ONE place the flow's literal hex/rgba lives, so the CLAUDE.md
 * hex guard (`grep '#…' src --exclude-dir=theme`) stays green and every flow
 * component reads NAMED tokens only. It deliberately does NOT reuse
 * `routineAtmosphere` (period-tinted: dawn/dusk/night) — the redesign fixes the
 * overview to always-light and the ritual to always-dark, with a signature
 * light→dark descent between them. Where the brief's anchors coincide with the
 * design system they reuse it (Porcelain, Ink, Pura Blue) so the app stays
 * coherent.
 *
 * Runtime-pure (no Reanimated at load): the springs are plain objects (typed via
 * a type-only import) so the data/model layer that feeds the flow can still be
 * verified headlessly. Motion CURVES live in `flow/motion.ts`.
 */

import type { WithSpringConfig } from 'react-native-reanimated';
import { blue, neutral } from './ds';

/** ACT 1 — the light overview surface. Porcelain + a soft cool-blue top radial;
 *  Ink text; Pura-Blue the single Start accent; white two-shadow cards r24.
 *  ZERO warm peach — warmth lives only in the orb's gold emotion. */
export const overviewTone = {
  /** Page background — LOCKED Porcelain (#FCFDFF). */
  bg: neutral[25],
  /** Soft cool-blue bloom at the top of the page (rgba(20,124,255,.05)). */
  topRadial: 'rgba(20, 124, 255, 0.05)',
  /** Primary serif/ink. LOCKED Ink (#080A0F). */
  ink: neutral[900],
  /** Muted caption / product line / duration / context. */
  muted: '#6E6E73',
  /** Faint eyebrow / inactive. */
  faint: 'rgba(8, 10, 15, 0.40)',
  /** The single confident action — Pura Blue (#147CFF). */
  accent: blue[500],
  /** Text on the accent button. */
  onAccent: neutral[0],
  /** Card surface + radius. */
  card: neutral[0],
  cardRadius: 24,
  hairline: 'rgba(8, 22, 56, 0.06)',
  /** A whisper chip fill (duration pills, section rules). */
  chip: 'rgba(8, 22, 56, 0.05)',
  /** The calm done-state tick. */
  tick: blue[500],
  /** Two-shadow card (web boxShadow): an ambient lift + a tight contact shadow,
   *  composited "<contact>, <ambient>". Premium, not a flat drop. */
  cardShadow:
    '0px 2px 6px rgba(8, 22, 56, 0.06), 0px 14px 30px rgba(8, 22, 56, 0.10)',
} as const;

/** ACT 2 — the dark theater. Near-black base with a radial lift behind the orb;
 *  ~4% film grain; dark cards + hairline; white/muted text. The orb's glow is
 *  the only warm light in the room. */
export const ritualTone = {
  /** Theater base (#0A0B12). */
  base: '#0A0B12',
  /** Radial lift behind the orb (→ #16182A). */
  orbLift: '#16182A',
  /** Static film grain (~4%). */
  grain: { color: '#9AA0C0', opacity: 0.04 },
  /** Dark card surface + hairline. */
  card: '#1C1E28',
  hairline: 'rgba(255, 255, 255, 0.08)',
  /** Text. */
  ink: 'rgba(255, 255, 255, 0.94)',
  muted: 'rgba(255, 255, 255, 0.60)',
  faint: 'rgba(255, 255, 255, 0.40)',
  /** The calm Done control surface. */
  done: 'rgba(255, 255, 255, 0.06)',
  /** Quiet progress mark — present, never gamey. */
  progressOn: 'rgba(255, 255, 255, 0.92)',
  progressOff: 'rgba(255, 255, 255, 0.18)',
} as const;

export type OverviewTone = typeof overviewTone;
export type RitualTone = typeof ritualTone;

/** The orb's glow-temperature registers (0 = calm violet-blue, 1 = warm gold). */
export const orbTemp = {
  /** Idle: the cool/violet register. */
  calm: 0.0,
  /** Done: floods warm gold. */
  gold: 1.0,
  /** Skip: a muted, near-cool grey (acknowledged, not celebrated). */
  mute: 0.06,
  /** A faintly-warm "present" baseline while the ritual is open. */
  present: 0.16,
} as const;

/** LOCKED durations (ms). Named exactly to the motion spec so choreography reads. */
export const flowTiming = {
  /** Overview set-down — rows arrive staggered (translateY 16→0 + opacity). */
  setDownStaggerMs: 70,
  /** OVERVIEW→RITUAL descent — light dissolves to dark (orb carries over). */
  descentMs: 600,
  /** Reduced-motion descent — a clean, quick cross-fade (no transform). */
  descentReducedMs: 220,
  /** Step advance — outgoing slides/fades out, next rises in (spring feel). */
  stepAdvanceMs: 400,
  stepOutMs: 180,
  /** Done gold bloom (orb halo bloom on the tap). */
  goldBloomMs: 900,
  /** Skip muted dim. */
  muteMs: 1100,
  /** Completion — the orb's slowest, fully-warm bloom. */
  doneBloomMs: 1200,
  /** Completion-as-care HOLD — the stillness IS the reward. */
  careHoldMs: 700,
  /** A completed step holds before the next cross-fades. */
  settleHoldMs: 200,
  /** Product images sit on a slight front plane (±px parallax on scroll). */
  frontPlanePx: 3,
} as const;

/**
 * The flow springs. `setDown` is the brief's overview arrival (damping 18,
 * stiffness 140); `advance` is the step-stage rise (~400ms settle, no bounce).
 * Typed via a type-only import so this module stays runtime-pure.
 */
export const flowSpring: { setDown: WithSpringConfig; advance: WithSpringConfig } = {
  setDown: { damping: 18, stiffness: 140, mass: 1 },
  advance: { damping: 20, stiffness: 170, mass: 1, overshootClamping: true },
};
