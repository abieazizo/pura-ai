/**
 * Pura — scan analysis V2 contract.
 *
 * This contract replaces the old "either supported findings or
 * NoClearFindings" model with a guaranteed minimum-3 findings result.
 * Every scan produces a populated map: when skin reads clean the
 * findings describe subtle observations (texture uniformity, pore
 * visibility in T-zone, faint expression lines, mild hydration cues),
 * not nothing.
 *
 * The contract is enforced at three layers:
 *   1. Server prompt + JSON schema (strict tool-use response_format).
 *   2. Server response validator (`validateScanResultV2`) — rejects
 *      empty findings, invalid enums, missing fields.
 *   3. Client-side retry once on validation failure, then deterministic
 *      minimum-viable fallback. No "nothing stood out" copy is ever
 *      rendered.
 */

export const ZONE_IDS = [
  'forehead',
  'glabella',
  'left_temple',
  'right_temple',
  'left_undereye',
  'right_undereye',
  'left_crowsfeet',
  'right_crowsfeet',
  'nose_bridge',
  'nose_tip',
  'left_nasolabial',
  'right_nasolabial',
  'left_cheek',
  'right_cheek',
  'upper_lip',
  'lower_lip',
  'chin',
  'jawline_left',
  'jawline_right',
  'neck',
] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export const CONCERN_IDS = [
  'fine_lines',
  'wrinkles',
  'dark_circles',
  'puffiness',
  'hyperpigmentation',
  'redness',
  'dryness',
  'oiliness',
  'texture',
  'enlarged_pores',
  'dullness',
  'uneven_tone',
  'blemishes',
  'sun_damage',
  'elasticity',
] as const;
export type ConcernId = (typeof CONCERN_IDS)[number];

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export interface ScanFindingV2 {
  id: string;
  zone: ZoneId;
  concern: ConcernId;
  severity: SeverityLevel;
  /** 3–5 word card title, e.g. "Faint forehead lines". */
  title: string;
  /** One sentence describing what's visible. */
  observation: string;
  /** One actionable sentence. */
  recommendation: string;
  /** 1–3 ingredient hints. */
  ingredient_hints: string[];
  /**
   * v34 — model-supplied confidence (0..1) that this finding is
   * actually visible in the photograph. Used by the new SkinMap to
   * decide overlay opacity; optional because legacy callers may not
   * have populated it.
   */
  confidence?: number;
}

export interface ScoreBreakdownV2 {
  hydration: number;
  texture: number;
  tone: number;
  clarity: number;
  vitality: number;
}

// ---------------------------------------------------------------------------
// v34 — Premium SkinMap, FocusAreas, Insights & Routine seed contracts.
// ---------------------------------------------------------------------------

/** Visual style of a single zone overlay rendered on the user's photo. */
export type OverlayStyle = 'soft_mask' | 'heatmap' | 'outline' | 'pin';

/**
 * A single overlay drawn on top of the captured photo, anchored to a
 * canonical face zone. Coordinates are NOT pixel-perfect — they
 * reference `ZONE_COORDS` so the overlay survives any reasonable
 * front-facing crop. Always tasteful, never gimmicky.
 */
export interface ZoneOverlayV2 {
  /** Canonical face zone. */
  zone: ZoneId;
  /** Concern this overlay represents. Drives the swatch color. */
  concern: ConcernId;
  /** Visual treatment. */
  style: OverlayStyle;
  /** 0..1, layered onto the concern's canonical swatch. */
  opacity: number;
  /** Linked finding id; UI uses this to toggle emphasis on tap. */
  findingId: string;
}

/**
 * One personalized insight surfaced after the Skin Map / Focus Areas.
 * Title is the leading heading; body is one concise calm sentence.
 */
export interface ScanInsightV2 {
  id: string;
  title: string;
  body: string;
  /** Short slug used to pick a small line icon on the card. */
  icon:
    | 'barrier'
    | 'hydration'
    | 'clarity'
    | 'tone'
    | 'consistency'
    | 'protection'
    | 'gentle';
  /** Finding ids that motivated this insight. */
  related_finding_ids: string[];
}

/**
 * Scan-derived seed that the routine builder consumes deterministically.
 * The AI proposes; the deterministic builder disposes — it can ignore
 * any seed value if local safety rules disagree.
 */
export interface RoutineSeedV2 {
  /** Concise skin needs phrases, e.g. "barrier-support", "oil control". */
  skin_needs: string[];
  /** Concerns the routine should consciously avoid stressing tonight. */
  avoid_tonight: string[];
  /** Recommended step types, in canonical AM order. */
  recommended_step_types: Array<'cleanse' | 'treat' | 'moisturize' | 'protect'>;
  /** Treatment intensity for the routine overall. */
  intensity: 'gentle' | 'moderate' | 'active';
  /**
   * Per-step taglines the routine generation screen surfaces under each
   * step ("Targeting under-eye dehydration" / "Avoiding harsh actives —
   * barrier-first cleanse"). Keys match `recommended_step_types`.
   */
  step_taglines: Partial<
    Record<'cleanse' | 'treat' | 'moisturize' | 'protect', string>
  >;
}

/** Scan quality classification produced server-side. */
export interface ScanQualityV2 {
  /** True when the scan is usable in any capacity (full or limited). */
  usable: boolean;
  /** `full` = all findings trusted; `limited` = partial confidence. */
  mode: 'full' | 'limited';
  /** 0..1 — overall image-quality confidence. */
  score: number;
  /** Short user-readable reasons (used by the limited-scan banner). */
  reasons: string[];
}

export interface ScanResultV2 {
  overall_score: number;
  score_breakdown: ScoreBreakdownV2;
  /** ≤ 8-word editorial sentence. */
  headline: string;
  /** 2–3 sentences, warm but specific. */
  summary: string;
  findings: ScanFindingV2[];

  // ---- v34 optional richer payload (legacy responses omit these) ----
  /** Overlay geometry to draw on the user's real photo. */
  overlays?: ZoneOverlayV2[];
  /** Ordered list of finding ids that are top-priority focus areas. */
  top_focus_priority?: string[];
  /** 2–4 elegant insight cards. */
  insights?: ScanInsightV2[];
  /** Scan-derived seed for the routine builder. */
  routine_seed?: RoutineSeedV2;
  /** Scan quality classification. */
  quality?: ScanQualityV2;
}

// ---------------------------------------------------------------------------
// Constants used across the UI.
// ---------------------------------------------------------------------------

export const MIN_FINDINGS = 3;
export const MAX_FINDINGS = 6;

export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  1: 'Mild',
  2: 'Mild',
  3: 'Moderate',
  4: 'Pronounced',
  5: 'Pronounced',
};

export const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  1: '#A8C5D6',
  2: '#7FA8C4',
  3: '#E8B873',
  4: '#D88A5C',
  5: '#C65D48',
};

/**
 * Normalized SVG-space anchor for each zone. Coordinates are in [0..1]
 * relative to a 3:4 viewBox where (0.5, 0.5) is the face center.
 * Real anatomical positions — under-eye actually sits under the eye,
 * jawline points sit on the jawline, etc.
 *
 * The SkinMap component multiplies these by its viewBox dimensions.
 */
export const ZONE_COORDS: Record<ZoneId, { cx: number; cy: number }> = {
  forehead:        { cx: 0.50, cy: 0.18 },
  glabella:        { cx: 0.50, cy: 0.27 },
  left_temple:     { cx: 0.21, cy: 0.25 },
  right_temple:    { cx: 0.79, cy: 0.25 },
  left_undereye:   { cx: 0.34, cy: 0.39 },
  right_undereye:  { cx: 0.66, cy: 0.39 },
  left_crowsfeet:  { cx: 0.21, cy: 0.38 },
  right_crowsfeet: { cx: 0.79, cy: 0.38 },
  nose_bridge:     { cx: 0.50, cy: 0.40 },
  nose_tip:        { cx: 0.50, cy: 0.52 },
  left_nasolabial: { cx: 0.39, cy: 0.59 },
  right_nasolabial:{ cx: 0.61, cy: 0.59 },
  left_cheek:      { cx: 0.26, cy: 0.51 },
  right_cheek:     { cx: 0.74, cy: 0.51 },
  upper_lip:       { cx: 0.50, cy: 0.62 },
  lower_lip:       { cx: 0.50, cy: 0.69 },
  chin:            { cx: 0.50, cy: 0.79 },
  jawline_left:    { cx: 0.24, cy: 0.76 },
  jawline_right:   { cx: 0.76, cy: 0.76 },
  neck:            { cx: 0.50, cy: 0.93 },
};

export const ZONE_LABEL: Record<ZoneId, string> = {
  forehead: 'Forehead',
  glabella: 'Glabella',
  left_temple: 'Left temple',
  right_temple: 'Right temple',
  left_undereye: 'Left under-eye',
  right_undereye: 'Right under-eye',
  left_crowsfeet: "Left crow's feet",
  right_crowsfeet: "Right crow's feet",
  nose_bridge: 'Nose bridge',
  nose_tip: 'Nose tip',
  left_nasolabial: 'Left smile line',
  right_nasolabial: 'Right smile line',
  left_cheek: 'Left cheek',
  right_cheek: 'Right cheek',
  upper_lip: 'Upper lip',
  lower_lip: 'Lower lip',
  chin: 'Chin',
  jawline_left: 'Left jawline',
  jawline_right: 'Right jawline',
  neck: 'Neck',
};

export const CONCERN_LABEL: Record<ConcernId, string> = {
  fine_lines: 'Fine lines',
  wrinkles: 'Wrinkles',
  dark_circles: 'Dark circles',
  puffiness: 'Puffiness',
  hyperpigmentation: 'Hyperpigmentation',
  redness: 'Redness',
  dryness: 'Dryness',
  oiliness: 'Oiliness',
  texture: 'Texture',
  enlarged_pores: 'Enlarged pores',
  dullness: 'Dullness',
  uneven_tone: 'Uneven tone',
  blemishes: 'Blemishes',
  sun_damage: 'Sun damage',
  elasticity: 'Elasticity',
};
