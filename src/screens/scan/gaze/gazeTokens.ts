/**
 * THE GAZE — design tokens for the redesigned Face Scan screen.
 *
 * Concept: the scan is the moment Pura looks at the user with care.
 * The companion doesn't float beside the camera — it BECOMES the
 * framing guide: a portrait locket of aurora light, breathing,
 * responding fluidly to the real quality signals.
 *
 * The palette is the companion's own aurora family (theme/tokens.ts
 * `auroraOrb`: violet → blue → cyan) so the guide reads as the same
 * being the user met in onboarding — never a clinical reticle.
 * Every color literal this screen uses lives HERE.
 */

export const gaze = {
  // ---- the living frame -------------------------------------------------
  /** Aurora stroke gradient, top → bottom (violet → blue → cyan). */
  strokeViolet: 'rgba(186, 170, 240, 0.95)',
  strokeBlue: 'rgba(132, 178, 238, 0.95)',
  strokeCyan: 'rgba(150, 214, 232, 0.95)',
  /** Soft halo — two concentric strokes of DECREASING alpha (wide+faint
   *  outer, narrower+stronger inner) so the edge ramps to transparent
   *  instead of stepping. No blur primitive in this RNSVG build. */
  haloOuter: 'rgba(150, 174, 230, 0.10)',
  haloInner: 'rgba(160, 150, 228, 0.26)',
  /** The glow "warms" by brightening toward warm-WHITE, not amber —
   *  amber over the cyan edge mudded the aurora (and fought the warm
   *  fill-light). A low-opacity warm-white that lifts the stroke. */
  warmGlow: 'rgba(255, 240, 224, 0.34)',
  /** Inner wash so the frame reads as holding light, not a cutout. */
  innerGlow0: 'rgba(196, 186, 240, 0.10)',
  innerGlowEdge: 'rgba(196, 186, 240, 0)',

  // ---- scrims & veils ----------------------------------------------------
  /** Outside-the-frame dim — focuses the portrait without a hard mask. */
  surroundDim: 'rgba(5, 8, 14, 0.30)',
  /** Extra dim layered on while allPass holds — the world pauses. */
  surroundHold: 'rgba(5, 8, 14, 0.20)',
  /** Aperture-entry veil + capture-exit veil (matches inkCta depths). */
  veilInk: '#05070B',

  // ---- fill light ----------------------------------------------------------
  /** Warm screen fill thrown at the face when the room is dim. */
  fillWarm: 'rgba(255, 241, 222, 0.92)',
  fillWarmSoft: 'rgba(255, 241, 222, 0)',
  /** Whole-screen brightening layer while fill light is active. */
  fillLift: 'rgba(255, 248, 240, 0.16)',

  // ---- anticipation sweep (the held breath) ---------------------------------
  /** Full-strength aurora for the sweep — the brightest line on screen. */
  sweepViolet: 'rgba(206, 190, 255, 1)',
  sweepWhite: 'rgba(240, 248, 255, 1)',
  sweepCyan: 'rgba(168, 232, 248, 1)',
  /** Wide soft underlay so the moving light reads as glow, not wire. */
  sweepHalo: 'rgba(190, 200, 245, 0.30)',

  // ---- capture bloom --------------------------------------------------------
  bloomCore: 'rgba(244, 240, 255, 0.92)',
  bloomMid: 'rgba(186, 170, 240, 0.45)',
  bloomEdge: 'rgba(140, 202, 224, 0)',

  // ---- text -------------------------------------------------------------------
  guidance: 'rgba(250, 251, 254, 0.94)',
  guidanceShadow: 'rgba(5, 8, 14, 0.55)',
  fillLightNote: 'rgba(255, 228, 196, 0.92)',
  segmentLabel: 'rgba(238, 242, 248, 0.52)',
  segmentLabelPassed: 'rgba(238, 242, 248, 0.78)',
  segmentTrack: 'rgba(244, 246, 250, 0.16)',

  // ---- chrome -------------------------------------------------------------------
  chromeIcon: '#F4F6FA',
  chromeGlass: 'rgba(16, 20, 28, 0.38)',
  chromeGlassBorder: 'rgba(244, 246, 250, 0.10)',
  privacy: 'rgba(238, 242, 248, 0.55)',
} as const;

/** Frame geometry — a portrait locket (squircle), not an oval or arc. */
export const FRAME = {
  /** Width as a fraction of the camera region width, snug ↔ loose. */
  WIDTH_SNUG: 0.64,
  WIDTH_LOOSE: 0.76,
  /** Portrait aspect (height = width × aspect). */
  ASPECT: 1.33,
  /** Height ceiling as a fraction of the camera region height. */
  HEIGHT_MAX_FRAC: 0.72,
  /** Absolute width ceiling (desktop browsers). */
  WIDTH_MAX: 340,
  /** Corner radius as a fraction of frame width — the locket read. */
  RADIUS_FRAC: 0.40,
  /** Vertical center as a fraction of region height — tuned with the
   *  -80px preview shift so the cover-cropped feed's face lands inside
   *  the locket (verified against recorded frames). */
  CENTER_Y_FRAC: 0.52,
  /** Searching-drift amplitude in px at framingScore 0 (→ 0 when framed). */
  DRIFT_AMPLITUDE: 7,
} as const;

/**
 * The locket's resolved geometry for a given camera region — sized by
 * BOTH axes so short regions (small browser windows) never overflow.
 * Shared by GazeFrame (drawing) and ScanOverlay (anchoring the
 * guidance line beneath the frame).
 */
export function frameGeometry(width: number, height: number) {
  const frameW = Math.min(
    width * FRAME.WIDTH_SNUG,
    FRAME.WIDTH_MAX,
    (height * FRAME.HEIGHT_MAX_FRAC) / FRAME.ASPECT
  );
  const frameH = frameW * FRAME.ASPECT;
  const cx = width / 2;
  // Slightly high (eyeline), but never cropped at the top under the
  // loose/breathing scale.
  const cy = Math.max(height * FRAME.CENTER_Y_FRAC, frameH / 2 + 14);
  // The searching state scales the locket up to the LOOSE ratio — the
  // guidance line must clear that extent, not just the snug one.
  const looseRatio = FRAME.WIDTH_LOOSE / FRAME.WIDTH_SNUG;
  return {
    frameW,
    frameH,
    cx,
    cy,
    frameBottom: cy + frameH / 2,
    frameBottomLoose: cy + (frameH / 2) * looseRatio,
  };
}
