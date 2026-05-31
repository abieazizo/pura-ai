/**
 * Cinematic analysis constants.
 *
 * Timing is deliberately fixed regardless of how fast the real AI returns.
 * A user who just spent 15s framing their face deserves a 7.2s reveal, not
 * a 700ms blink of a spinner. Repeat users get a compressed timeline but
 * the same beat order.
 *
 * Coordinates are normalized (0-1) within the rendered photo box so the
 * overlay layer is resolution-independent — the SVG consumer multiplies by
 * the current photo width / height at render time.
 */

import type { FindingType, ScanZoneKey } from '@/types';
// `statusColor` is the theme alias for the raw `status` token namespace —
// keeps the call sites readable and avoids shadowing the `status: 'pending'`
// naming in hook state.
import { analysisMarkers, statusColor } from '@/theme';

// ------------------------------------------------------------------
// Beat timing
// ------------------------------------------------------------------

export interface BeatWindow {
  start: number;    // ms from mount
  duration: number; // ms; -1 means "until external condition"
}

export type BeatTiming = {
  ARRIVE: BeatWindow;
  LOCATE: BeatWindow;
  PARTITION: BeatWindow;
  DETECT: BeatWindow;
  SCORE: BeatWindow;
  SETTLE: BeatWindow;
  REVEAL: BeatWindow;
};

export const BEAT_TIMING_FULL: BeatTiming = {
  ARRIVE:    { start: 0,    duration: 800  },
  LOCATE:    { start: 800,  duration: 1200 },
  PARTITION: { start: 2000, duration: 1400 },
  DETECT:    { start: 3400, duration: 1800 },
  SCORE:     { start: 5200, duration: 1200 },
  SETTLE:    { start: 6400, duration: 800  },
  REVEAL:    { start: 7200, duration: -1   },
};

function scaleTimings(t: BeatTiming, factor: number): BeatTiming {
  const scale = (w: BeatWindow): BeatWindow => ({
    start: Math.round(w.start * factor),
    duration: w.duration === -1 ? -1 : Math.round(w.duration * factor),
  });
  return {
    ARRIVE: scale(t.ARRIVE),
    LOCATE: scale(t.LOCATE),
    PARTITION: scale(t.PARTITION),
    DETECT: scale(t.DETECT),
    SCORE: scale(t.SCORE),
    SETTLE: scale(t.SETTLE),
    REVEAL: scale(t.REVEAL),
  };
}

export const BEAT_TIMING_COMPRESSED = scaleTimings(BEAT_TIMING_FULL, 0.66);
export const BEAT_TIMING_MINIMAL    = scaleTimings(BEAT_TIMING_FULL, 0.33);

/**
 * Scan-count-driven pacing. First-scan users see the full 7.2s cinema; by
 * the sixth scan it's compressed to ~2.4s because they already know what's
 * happening.
 */
export function getBeatTiming(scanCount: number): BeatTiming {
  if (scanCount >= 6) return BEAT_TIMING_MINIMAL;
  if (scanCount >= 2) return BEAT_TIMING_COMPRESSED;
  return BEAT_TIMING_FULL;
}

export const MARKER_INTERVAL = 350; // ms between each of the 4 detection markers
// v34 — bumped 70s → 110s. With analyzeFaceScan AND analyzeFaceScanV2
// now racing in parallel (see src/api/scan.ts), the bottleneck is the
// 90s gateway TIMEOUT_MS on analyzeFaceScanV2 — which itself matches
// the Vercel function maxDuration of 90s. 110s = 90s gateway ceiling +
// 20s safety margin for cold-start latency + image upload of a real
// 3-5 MB selfie. Real-world clear-selfie runs land at 40-60s end-to-end;
// the 110s cap is a TRUE outer-bound guard against runaway promises,
// not the typical path.
export const MAX_TOTAL_WAIT = 110_000;
export const PHOTO_MARGIN_H = 24;

// ------------------------------------------------------------------
// Photo stage geometry
// ------------------------------------------------------------------

// v18.4 — premium analyzing photo geometry. Photo grows from 460pt
// → 540pt active height + sits closer to the top edge so the
// captured face dominates the screen as a flagship moment. Photo
// horizontal margin tightens 24 → 16 to make it feel near-bleed
// without crowding. Reveal-state height stays smaller so the
// transition into the result screen still compresses gracefully.
export const PHOTO_ASPECT = 3 / 4;
export const PHOTO_HEIGHT_ACTIVE = 540;
export const PHOTO_HEIGHT_REVEAL = 380;
export const PHOTO_Y_ACTIVE = 80;
export const PHOTO_Y_REVEAL = 72;
export const PHOTO_RADIUS = 32;

// ------------------------------------------------------------------
// Zone rectangles — normalized within the photo box (0-1 on each axis).
// Cheeks is two rects because the mockup paints each cheek separately.
// ------------------------------------------------------------------

export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ZONE_RECTS: Record<ScanZoneKey, NormRect[]> = {
  forehead: [{ x: 0.30, y: 0.30, w: 0.40, h: 0.11 }],
  tZone:    [{ x: 0.43, y: 0.43, w: 0.15, h: 0.28 }],
  chin:     [{ x: 0.34, y: 0.82, w: 0.35, h: 0.11 }],
  cheeks: [
    { x: 0.20, y: 0.57, w: 0.18, h: 0.15 },
    { x: 0.63, y: 0.57, w: 0.18, h: 0.15 },
  ],
};

// Visible labels per zone. Labels float above/beside each zone rect — see
// ZoneOverlay for anchor logic.
export const ZONE_LABELS: Record<ScanZoneKey, string> = {
  forehead: 'FOREHEAD',
  tZone: 'T-ZONE',
  chin: 'CHIN',
  cheeks: 'CHEEKS',
};

// Zone tints keyed to the mockup frames. These map to the existing palette
// where possible and are applied at 22–26% alpha in the overlay.
export type ZoneTintKey = 'clay' | 'moss' | 'sand';
export const ZONE_TINT: Record<ScanZoneKey, ZoneTintKey> = {
  forehead: 'clay',
  tZone: 'moss',
  chin: 'sand',
  cheeks: 'clay',
};

// ------------------------------------------------------------------
// Landmark dots — six small terracotta pips rendered in Beat 2. Matches
// the mockup: L/R eye outers, L/R nostrils, L/R mouth corners.
// ------------------------------------------------------------------

export const LANDMARKS: Array<{ x: number; y: number }> = [
  { x: 0.36, y: 0.44 }, // L eye outer
  { x: 0.62, y: 0.44 }, // R eye outer
  { x: 0.46, y: 0.55 }, // L nostril
  { x: 0.54, y: 0.55 }, // R nostril
  { x: 0.44, y: 0.63 }, // L mouth corner
  { x: 0.56, y: 0.63 }, // R mouth corner
];

// ------------------------------------------------------------------
// Detection markers — four pulsing pips painted in Beat 4. Order is the
// single source of truth for choreography sequencing, so even if the AI
// returns findings in a different order we render them in this order.
// ------------------------------------------------------------------

export interface MarkerPosition {
  x: number;
  y: number;
  type: FindingType;
}

export const MARKER_POSITIONS: MarkerPosition[] = [
  { x: 0.36, y: 0.33, type: 'dryness'   }, // forehead upper-left
  { x: 0.58, y: 0.49, type: 'texture'   }, // T-zone right
  { x: 0.51, y: 0.85, type: 'barrier'   }, // chin center
  { x: 0.28, y: 0.62, type: 'hydration' }, // left cheek
];

// ------------------------------------------------------------------
// Zone score bubble status thresholds. Mirrors the semantic status
// colors in theme tokens; keep the thresholds here so the UI is the
// authoritative source for score → word mapping.
// ------------------------------------------------------------------

export const STATUS_THRESHOLDS = { CALM: 70, MONITOR: 40 } as const;

export type StatusWord = 'CALM' | 'MONITOR' | 'ACTIVE';

export function getStatusWord(score: number): StatusWord {
  if (score >= STATUS_THRESHOLDS.CALM) return 'CALM';
  if (score >= STATUS_THRESHOLDS.MONITOR) return 'MONITOR';
  return 'ACTIVE';
}

export function getStatusColor(score: number): string {
  if (score >= STATUS_THRESHOLDS.CALM) return statusColor.calm;
  if (score >= STATUS_THRESHOLDS.MONITOR) return statusColor.monitor;
  return statusColor.active;
}

export function getMarkerColor(type: FindingType): string {
  return analysisMarkers[type];
}

// ------------------------------------------------------------------
// Face outline path — a stylized oval drawn with two cubic beziers,
// anchored to a unit square and scaled to photo dimensions at render.
// Path coordinates are tuned to hug the "face" region of an upright
// portrait with the subject centered horizontally.
// ------------------------------------------------------------------

/** Returns an SVG path string sized to the provided photo dimensions. */
export function buildFaceOutlinePath(w: number, h: number): string {
  // Oval tuned against the mockup — cheekbones at ~50% height, hairline at
  // ~22%, chin tip at ~92%.
  const cx = 0.5 * w;
  const top = 0.22 * h;
  const bottom = 0.92 * h;
  const left = 0.20 * w;
  const right = 0.80 * w;
  const midY = 0.57 * h;

  // Two cubic beziers make a symmetric oval with a slightly narrower chin.
  return [
    `M ${cx} ${top}`,
    `C ${right} ${top} ${right + w * 0.02} ${midY} ${right - w * 0.04} ${bottom - h * 0.04}`,
    `C ${0.65 * w} ${bottom} ${0.35 * w} ${bottom} ${left + w * 0.04} ${bottom - h * 0.04}`,
    `C ${left - w * 0.02} ${midY} ${left} ${top} ${cx} ${top}`,
    'Z',
  ].join(' ');
}

// ------------------------------------------------------------------
// Illustrative finding padder — if the AI returns fewer than 4 findings
// we pad in this order (dryness, texture, barrier, hydration) with a
// deterministic illustrative position, so Beat 4 always shows exactly
// 4 markers.
// ------------------------------------------------------------------

export const FINDING_ORDER: FindingType[] = [
  'dryness',
  'texture',
  'barrier',
  'hydration',
];

export const DEFAULT_FINDING_LABELS: Record<FindingType, string> = {
  dryness: 'dryness',
  texture: 'texture',
  barrier: 'barrier',
  hydration: 'hydration',
  redness: 'redness',
  clarity: 'clarity',
};

export const FINDING_TYPE_TO_ZONE: Record<FindingType, ScanZoneKey> = {
  dryness: 'forehead',
  texture: 'tZone',
  barrier: 'chin',
  hydration: 'cheeks',
  redness: 'cheeks',
  clarity: 'forehead',
};

// ------------------------------------------------------------------
// Caption copy (v8.2 — 4-beat compression)
//
// Four captions, three words each (plus a short noun). No setup phrases,
// no "we're" or "I'm" — just the work being done. Reads as a rhythm:
// texture → breakouts → hydration → prepare. Beat cadence preserved; the
// screen still holds 7 visual beats (arrive / locate / partition / detect
// / score / settle / reveal) but only four carry text.
// ------------------------------------------------------------------

// v35 Pass-1 \u2014 analyzing captions move from process-narration voice
// ("Mapping your skin zones...") to "Practitioner's Notes" voice
// ("Reading the surface.", "Where the cheekbones turn.") \u2014 see
// ANALYZING_BEATS_PRACTITIONER in src/copy/scanMicroCopy.ts for the
// full direction spec.
//
// LOADING_MESSAGES is intentionally left untouched as the canonical
// consumer-facing rotating loader copy \u2014 it's still used by other
// surfaces (per CLAUDE.md). This file rebinds CAPTION_COPY (the
// CINEMATIC ANALYZING SCREEN's caption strip) to the new voice
// without disturbing the canonical constant.
import { ANALYZING_BEATS_PRACTITIONER } from '@/copy/scanMicroCopy';

export const CAPTION_COPY = ANALYZING_BEATS_PRACTITIONER;

// ------------------------------------------------------------------
// VoiceOver announcements \u2014 mirror the friendly caption copy.
// ------------------------------------------------------------------

export const A11Y_ANNOUNCEMENTS = {
  preflight: 'Analyzing your scan.',
  locate: 'Preparing your results.',
  partition: 'Preparing your results.',
  detect: 'Matching products for your skin.',
  score: 'Almost ready.',
  waiting: 'Still working.',
  reveal: 'Your result is ready.',
} as const;
