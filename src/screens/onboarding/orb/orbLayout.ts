/**
 * orbLayout — the single source of truth for WHERE and HOW BIG the companion
 * orb sits at each onboarding beat.
 *
 * The orb lives in a persistent overlay (OrbHost) and is the SAME element from
 * the cold-open birth through every question. Both the host (which positions
 * the orb) and the screens (which place their spoken lines just below it) read
 * these constants, so the orb's gaze always connects to its words.
 *
 * Sizing strategy: the orb renders ONCE at ORB_BASE_SIZE and the host scales it
 * with a transform to hit each beat's visual size. Transform-scale is UI-thread
 * and lets the size morph continuously across the shared-element handoffs
 * (animating the SVG `size` prop would recompute geometry every frame). We only
 * ever DOWN-scale from the base (the birth size), so the vector edges stay
 * crisp — never an upscaled, soft raster.
 */

/** The orb is rendered at this diameter; every beat down-scales from here. */
export const ORB_BASE_SIZE = 200;

/**
 * Per-beat visual diameters (px). The orb shrinks as the user's DECISIONS take
 * the foreground — biggest at birth (it is the whole world), smallest at the
 * question (the cards are the focus).
 */
export const ORB_SIZES = {
  birth: 188, // S1 cold open
  speaks: 106, // S2 — a larger luminous PRESENCE (the emotional focus)
  name: 94, // name beat
  question: 88, // S3 — bigger + clearly alive (was a muddy 72)
  /** S3 "takes the floor" lift while reacting to an answer. */
  reactionLift: 98,
} as const;

/** Vertical anchor (center of the orb) as a fraction of usable screen height. */
// Statement beats (speaks / name) sit in the UPPER-CENTER so the orb + its line
// form a balanced cluster instead of clinging to the top over an empty half.
export const ORB_ANCHORS = {
  birth: 0.4,
  speaks: 0.34,
  name: 0.22, // a modest drop — the field + keyboard still need the lower half
  question: 0.15,
} as const;

export type OrbBeat = keyof typeof ORB_ANCHORS;

export interface OrbTarget {
  /** Center X on screen, px. */
  cx: number;
  /** Center Y on screen, px. */
  cy: number;
  /** Visual diameter, px. */
  size: number;
}

/** The S2 arrival spring from the spec — also the default for every glide. */
export const ORB_SPRING = { mass: 1, stiffness: 110, damping: 20 } as const;

/**
 * Build the orb target for a beat given the screen box. `topInset` lets a
 * screen exclude the status-bar / notch so the fraction reads against usable
 * height. `sizeOverride` supports the reaction lift.
 */
export function targetFor(
  beat: OrbBeat,
  screenW: number,
  screenH: number,
  topInset = 0,
  sizeOverride?: number,
): OrbTarget {
  const usableH = screenH - topInset;
  return {
    cx: screenW / 2,
    cy: topInset + usableH * ORB_ANCHORS[beat],
    size: sizeOverride ?? ORB_SIZES[beat],
  };
}

/** Y (px from top) of the orb's bottom edge — screens anchor their first
 *  spoken line a little below this so the orb appears to speak its words. */
export function orbBottom(t: OrbTarget): number {
  return t.cy + t.size / 2;
}
