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
  /** Soft halo layers (no blur primitive — layered low-alpha strokes). */
  haloInner: 'rgba(160, 146, 226, 0.30)',
  haloOuter: 'rgba(140, 202, 224, 0.16)',
  /** Warm tint that rises with lightScore — the glow "warming up". */
  warmGlow: 'rgba(255, 214, 170, 0.55)',
  /** Inner wash so the frame reads as holding light, not a cutout. */
  innerGlow0: 'rgba(196, 186, 240, 0.10)',
  innerGlowEdge: 'rgba(196, 186, 240, 0)',

  // ---- scrims & veils ----------------------------------------------------
  /** Outside-the-frame dim — focuses the portrait without a hard mask. */
  surroundDim: 'rgba(5, 8, 14, 0.30)',
  /** Aperture-entry veil + capture-exit veil (matches inkCta depths). */
  veilInk: '#05070B',

  // ---- fill light ----------------------------------------------------------
  /** Warm screen fill thrown at the face when the room is dim. */
  fillWarm: 'rgba(255, 241, 222, 0.92)',
  fillWarmSoft: 'rgba(255, 241, 222, 0)',
  /** Whole-screen brightening layer while fill light is active. */
  fillLift: 'rgba(255, 248, 240, 0.16)',

  // ---- capture ring (anticipation) ----------------------------------------
  ringTrack: 'rgba(244, 246, 250, 0.14)',
  /** Ring sweep inherits the aurora stroke gradient. */

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
  segmentFillA: 'rgba(170, 156, 232, 1)',
  segmentFillB: 'rgba(150, 206, 230, 1)',

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
  ASPECT: 1.30,
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
  /** Capture ring inset outside the frame stroke. */
  RING_GAP: 9,
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
  return { frameW, frameH, cx, cy, frameBottom: cy + frameH / 2 };
}
