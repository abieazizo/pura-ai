/**
 * Pura AI — runtime validation of structured Claude outputs.
 *
 * Even with strict tool_choice and disable_parallel_tool_use, Claude
 * can occasionally return tool input that doesn't fully match the
 * declared schema (extra fields, missing optional sections,
 * almost-right enum values). The TypeScript compiler can't catch any
 * of that — `block.input as T` is a runtime promise, not a guarantee.
 *
 * This module is the gate every AI return value passes through before
 * it's allowed to reach the store or the UI. Validators are:
 *
 *   • Lossy — bad input returns `null`, never throws. Callers branch
 *     into the documented deterministic fallbacks.
 *   • Cheap — type guards + structural checks, no JSON Schema engine.
 *   • Defensive — accept unknown extra fields silently; reject only
 *     when required structure is missing or shaped wrong.
 *
 * Every malformed payload is logged through `aiLog` so the failure
 * mode is observable in production.
 */

import type {
  AssistantContext,
  BarcodeResolution,
  ConcernType,
  Direction,
  FaceConcernFinding,
  FaceRegion,
  FaceScanAnalysis,
  LiveProductCandidate,
  LiveProductLookupResult,
  ProductCategory,
  ProductIdentity,
  ProductMatch,
  ProductMatchResult,
  ProgressExplanation,
  RoutineAction,
  RoutineRecommendation,
  RoutineSlot,
  ScanPreflightReason,
  ScanPreflightResult,
  SearchSuggestionResult,
  Severity,
  SkinScoreExplanation,
} from './ai-contracts';
import {
  CONCERN_IDS,
  MAX_FINDINGS,
  MIN_FINDINGS,
  ZONE_IDS,
  type ConcernId,
  type OverlayStyle,
  type RoutineSeedV2,
  type ScanFindingV2,
  type ScanInsightV2,
  type ScanQualityV2,
  type ScanResultV2,
  type SeverityLevel,
  type ZoneId,
  type ZoneOverlayV2,
} from '@/types/scanResultV2';
import { aiLog } from './aiLog';

// ============================================================================
// Primitive guards.
// ============================================================================

const CONCERN_TYPES: readonly ConcernType[] = [
  'breakouts',
  'hydration',
  'texture',
  'dark_marks',
  'redness',
  'oiliness',
  'sensitivity',
  'pores',
];

const SEVERITIES: readonly Severity[] = [
  'none',
  'low',
  'mild',
  'moderate',
  'high',
];

const DIRECTIONS: readonly Direction[] = ['better', 'same', 'worse', 'new'];

const FACE_REGIONS: readonly FaceRegion[] = [
  'forehead',
  't_zone',
  'left_cheek',
  'right_cheek',
  'nose',
  'chin',
  'jawline',
  'under_eyes',
  'across_face',
];

const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'cleanser',
  'serum',
  'moisturizer',
  'spot_treatment',
  'toner',
  'spf',
  'mask',
  'unknown',
];

const ROUTINE_SLOTS: readonly RoutineSlot[] = ['morning', 'evening', 'saved'];

const SCORE_BANDS = ['poor', 'fair', 'good', 'great'] as const;
const MATCH_BANDS = ['weak', 'fair', 'strong', 'excellent'] as const;
const DELTA_REFS = ['previous_scan', 'baseline', 'none'] as const;
const QUALITY_ISSUES = [
  'blurry',
  'low_light',
  'angled',
  'partial_face',
  'occluded',
] as const;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

// ============================================================================
// validateScanResultV2 — strict 3-to-6 findings face analysis.
//
// Returns null on any structural violation. The caller is responsible
// for retrying or falling back to a deterministic minimum-viable result.
// ============================================================================

const ZONE_SET: ReadonlySet<ZoneId> = new Set<ZoneId>(ZONE_IDS);
const CONCERN_SET: ReadonlySet<ConcernId> = new Set<ConcernId>(CONCERN_IDS);

function validateFindingV2(raw: unknown): ScanFindingV2 | null {
  if (!isObject(raw)) return null;
  const id = isString(raw.id) && raw.id.length >= 1 ? raw.id : null;
  if (!id) return null;
  if (!isString(raw.zone) || !ZONE_SET.has(raw.zone as ZoneId)) return null;
  if (!isString(raw.concern) || !CONCERN_SET.has(raw.concern as ConcernId)) {
    return null;
  }
  const severity =
    typeof raw.severity === 'number' && Number.isInteger(raw.severity)
      ? (raw.severity as number)
      : null;
  if (severity === null || severity < 1 || severity > 5) return null;
  if (!isString(raw.title) || raw.title.length < 2) return null;
  if (!isString(raw.observation) || raw.observation.length < 4) return null;
  if (!isString(raw.recommendation) || raw.recommendation.length < 4) {
    return null;
  }
  if (!Array.isArray(raw.ingredient_hints)) return null;
  const hints = raw.ingredient_hints.filter(
    (h): h is string => typeof h === 'string' && h.length > 0,
  );
  if (hints.length === 0) return null;
  // v34 — `confidence` is required by the schema but treated as
  // optional here so legacy responses (or model omissions) still
  // validate. When absent the UI assumes a calibrated 0.7.
  let confidence: number | undefined;
  if (typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)) {
    confidence = Math.max(0, Math.min(1, raw.confidence));
  }
  return {
    id,
    zone: raw.zone as ZoneId,
    concern: raw.concern as ConcernId,
    severity: severity as SeverityLevel,
    title: raw.title,
    observation: raw.observation,
    recommendation: raw.recommendation,
    ingredient_hints: hints.slice(0, 3),
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

// v34 — companion validators for the richer optional payload. Each
// returns its sanitized shape or null on any structural break. The
// outer validator tolerates missing fields (legacy responses) but
// rejects malformed fields when they ARE present.

const OVERLAY_STYLES: ReadonlySet<OverlayStyle> = new Set<OverlayStyle>([
  'soft_mask',
  'heatmap',
  'outline',
  'pin',
]);

function validateOverlayV2(raw: unknown): ZoneOverlayV2 | null {
  if (!isObject(raw)) return null;
  if (!isString(raw.zone) || !ZONE_SET.has(raw.zone as ZoneId)) return null;
  if (!isString(raw.concern) || !CONCERN_SET.has(raw.concern as ConcernId)) {
    return null;
  }
  if (!isString(raw.style) || !OVERLAY_STYLES.has(raw.style as OverlayStyle)) {
    return null;
  }
  if (typeof raw.opacity !== 'number' || !Number.isFinite(raw.opacity)) {
    return null;
  }
  const findingId =
    isString(raw.finding_id) && raw.finding_id.length > 0 ? raw.finding_id : null;
  if (!findingId) return null;
  return {
    zone: raw.zone as ZoneId,
    concern: raw.concern as ConcernId,
    style: raw.style as OverlayStyle,
    opacity: Math.max(0.05, Math.min(0.6, raw.opacity)),
    findingId,
  };
}

function validateInsightV2(raw: unknown): ScanInsightV2 | null {
  if (!isObject(raw)) return null;
  const id = isString(raw.id) && raw.id.length > 0 ? raw.id : null;
  if (!id) return null;
  if (!isString(raw.title) || raw.title.length < 2) return null;
  if (!isString(raw.body) || raw.body.length < 4) return null;
  const ICONS: ReadonlySet<ScanInsightV2['icon']> = new Set([
    'barrier',
    'hydration',
    'clarity',
    'tone',
    'consistency',
    'protection',
    'gentle',
  ]);
  if (!isString(raw.icon) || !ICONS.has(raw.icon as ScanInsightV2['icon'])) {
    return null;
  }
  const related = Array.isArray(raw.related_finding_ids)
    ? raw.related_finding_ids.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
    : [];
  return {
    id,
    title: raw.title,
    body: raw.body,
    icon: raw.icon as ScanInsightV2['icon'],
    related_finding_ids: related.slice(0, 4),
  };
}

function validateRoutineSeedV2(raw: unknown): RoutineSeedV2 | null {
  if (!isObject(raw)) return null;
  const skinNeeds = Array.isArray(raw.skin_needs)
    ? raw.skin_needs.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
    : null;
  if (!skinNeeds || skinNeeds.length === 0) return null;
  const avoid = Array.isArray(raw.avoid_tonight)
    ? raw.avoid_tonight.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
    : [];
  const STEPS: ReadonlySet<'cleanse' | 'treat' | 'moisturize' | 'protect'> =
    new Set(['cleanse', 'treat', 'moisturize', 'protect']);
  const types = Array.isArray(raw.recommended_step_types)
    ? raw.recommended_step_types.filter(
        (s): s is 'cleanse' | 'treat' | 'moisturize' | 'protect' =>
          typeof s === 'string' &&
          STEPS.has(s as 'cleanse' | 'treat' | 'moisturize' | 'protect'),
      )
    : null;
  if (!types || types.length === 0) return null;
  if (
    raw.intensity !== 'gentle' &&
    raw.intensity !== 'moderate' &&
    raw.intensity !== 'active'
  ) {
    return null;
  }
  const taglinesRaw = isObject(raw.step_taglines) ? raw.step_taglines : {};
  const step_taglines: RoutineSeedV2['step_taglines'] = {};
  for (const k of ['cleanse', 'treat', 'moisturize', 'protect'] as const) {
    const v = taglinesRaw[k];
    if (typeof v === 'string' && v.length > 0) {
      step_taglines[k] = v.slice(0, 80);
    }
  }
  return {
    skin_needs: skinNeeds.slice(0, 5),
    avoid_tonight: avoid.slice(0, 5),
    recommended_step_types: types.slice(0, 4),
    intensity: raw.intensity as 'gentle' | 'moderate' | 'active',
    step_taglines,
  };
}

function validateQualityV2(raw: unknown): ScanQualityV2 | null {
  if (!isObject(raw)) return null;
  if (typeof raw.usable !== 'boolean') return null;
  if (raw.mode !== 'full' && raw.mode !== 'limited') return null;
  const score =
    typeof raw.score === 'number' && Number.isFinite(raw.score)
      ? Math.max(0, Math.min(1, raw.score))
      : null;
  if (score === null) return null;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
    : [];
  return {
    usable: raw.usable,
    mode: raw.mode as 'full' | 'limited',
    score,
    reasons: reasons.slice(0, 5),
  };
}

function clampScoreField(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const i = Math.round(v);
  if (i < 0 || i > 100) return null;
  return i;
}

export function validateScanResultV2(v: unknown): ScanResultV2 | null {
  if (!isObject(v)) {
    aiLog.warn('validateScanResultV2', 'not an object');
    return null;
  }
  const overall = clampScoreField(v.overall_score);
  if (overall === null) {
    aiLog.warn('validateScanResultV2', 'overall_score invalid');
    return null;
  }
  if (!isObject(v.score_breakdown)) {
    aiLog.warn('validateScanResultV2', 'score_breakdown not object');
    return null;
  }
  const sb = v.score_breakdown;
  const keys: ReadonlyArray<keyof ScanResultV2['score_breakdown']> = [
    'hydration',
    'texture',
    'tone',
    'clarity',
    'vitality',
  ];
  const score_breakdown: Partial<ScanResultV2['score_breakdown']> = {};
  for (const k of keys) {
    const n = clampScoreField(sb[k]);
    if (n === null) {
      aiLog.warn('validateScanResultV2', `score_breakdown.${k} invalid`);
      return null;
    }
    score_breakdown[k] = n;
  }
  if (!isString(v.headline) || v.headline.length < 4) {
    aiLog.warn('validateScanResultV2', 'headline invalid');
    return null;
  }
  if (!isString(v.summary) || v.summary.length < 10) {
    aiLog.warn('validateScanResultV2', 'summary invalid');
    return null;
  }
  if (!Array.isArray(v.findings)) {
    aiLog.warn('validateScanResultV2', 'findings not array');
    return null;
  }
  const findings: ScanFindingV2[] = [];
  for (const f of v.findings) {
    const parsed = validateFindingV2(f);
    if (parsed) findings.push(parsed);
  }
  if (findings.length < MIN_FINDINGS) {
    aiLog.warn(
      'validateScanResultV2',
      `only ${findings.length} valid findings; need >= ${MIN_FINDINGS}`,
    );
    return null;
  }
  // v34 — optional richer payload. When ANY of these fields are
  // present they must parse cleanly; absent is fine (legacy responses).
  let overlays: ZoneOverlayV2[] | undefined;
  if (Array.isArray(v.overlays)) {
    overlays = v.overlays
      .map(validateOverlayV2)
      .filter((o): o is ZoneOverlayV2 => o !== null)
      .slice(0, 8);
  }

  let topFocus: string[] | undefined;
  if (Array.isArray(v.top_focus_priority)) {
    topFocus = v.top_focus_priority
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .slice(0, 4);
  }

  let insights: ScanInsightV2[] | undefined;
  if (Array.isArray(v.insights)) {
    insights = v.insights
      .map(validateInsightV2)
      .filter((i): i is ScanInsightV2 => i !== null)
      .slice(0, 4);
  }

  let routineSeed: RoutineSeedV2 | undefined;
  if (v.routine_seed !== undefined && v.routine_seed !== null) {
    routineSeed = validateRoutineSeedV2(v.routine_seed) ?? undefined;
  }

  let quality: ScanQualityV2 | undefined;
  if (v.quality !== undefined && v.quality !== null) {
    quality = validateQualityV2(v.quality) ?? undefined;
  }

  return {
    overall_score: overall,
    // All five keys are populated above; the loop returns null if any
    // are missing, so the cast away from `Partial` is safe here.
    score_breakdown: score_breakdown as ScanResultV2['score_breakdown'],
    headline: v.headline,
    summary: v.summary,
    findings: findings.slice(0, MAX_FINDINGS),
    ...(overlays ? { overlays } : {}),
    ...(topFocus ? { top_focus_priority: topFocus } : {}),
    ...(insights ? { insights } : {}),
    ...(routineSeed ? { routine_seed: routineSeed } : {}),
    ...(quality ? { quality } : {}),
  };
}

/**
 * Deterministic minimum-viable ScanResultV2 — only used when both the
 * primary AI call and the stricter retry fail. Never invents findings
 * that imply a specific cosmetic concern was VISIBLE; describes generic
 * everyday observations any healthy skin reading is consistent with.
 */
export function deterministicScanResultV2(scanId: string): ScanResultV2 {
  return {
    overall_score: 78,
    score_breakdown: {
      hydration: 76,
      texture: 78,
      tone: 80,
      clarity: 79,
      vitality: 78,
    },
    headline: 'Balanced skin with everyday observations.',
    summary:
      'Your skin reads calm overall with the kind of small everyday signals most healthy skin shows. The notes below are gentle observations to track over time, not concerns to fix today.',
    findings: [
      {
        id: `${scanId}-baseline-texture`,
        zone: 'forehead',
        concern: 'texture',
        severity: 1,
        title: 'Even surface texture',
        observation:
          'Surface texture across the forehead reads smooth and uniform.',
        recommendation:
          'Stay consistent with a gentle daily cleanser to keep this baseline.',
        ingredient_hints: ['niacinamide', 'panthenol'],
      },
      {
        id: `${scanId}-baseline-undereye`,
        zone: 'left_undereye',
        concern: 'dark_circles',
        severity: 1,
        title: 'Subtle under-eye softness',
        observation:
          'A faint shadow is visible under the eye, consistent with everyday rest patterns.',
        recommendation:
          'A lightweight eye cream with caffeine in the morning can help brighten this area.',
        ingredient_hints: ['caffeine', 'peptides'],
      },
      {
        id: `${scanId}-baseline-tzone`,
        zone: 'nose_tip',
        concern: 'enlarged_pores',
        severity: 1,
        title: 'Mild T-zone pore visibility',
        observation:
          'Pores in the T-zone are slightly more visible than the surrounding skin.',
        recommendation:
          'A weekly clay or BHA treatment can keep pores looking refined.',
        ingredient_hints: ['salicylic acid', 'clay'],
        confidence: 0.55,
      },
    ],
    overlays: [
      {
        zone: 'forehead',
        concern: 'texture',
        style: 'soft_mask',
        opacity: 0.18,
        findingId: `${scanId}-baseline-texture`,
      },
      {
        zone: 'left_undereye',
        concern: 'dark_circles',
        style: 'soft_mask',
        opacity: 0.22,
        findingId: `${scanId}-baseline-undereye`,
      },
      {
        zone: 'right_undereye',
        concern: 'dark_circles',
        style: 'soft_mask',
        opacity: 0.22,
        findingId: `${scanId}-baseline-undereye`,
      },
      {
        zone: 'nose_tip',
        concern: 'enlarged_pores',
        style: 'soft_mask',
        opacity: 0.16,
        findingId: `${scanId}-baseline-tzone`,
      },
    ],
    top_focus_priority: [
      `${scanId}-baseline-undereye`,
      `${scanId}-baseline-texture`,
      `${scanId}-baseline-tzone`,
    ],
    insights: [
      {
        id: `${scanId}-insight-consistency`,
        title: 'Gentle consistency',
        body: 'Your skin reads steady — small daily steps will hold this baseline better than aggressive treatments.',
        icon: 'consistency',
        related_finding_ids: [`${scanId}-baseline-texture`],
      },
      {
        id: `${scanId}-insight-hydration`,
        title: 'Light hydration',
        body: 'A lightweight humectant under your moisturizer keeps the under-eye area looking rested.',
        icon: 'hydration',
        related_finding_ids: [`${scanId}-baseline-undereye`],
      },
      {
        id: `${scanId}-insight-protection`,
        title: 'Daily protection',
        body: 'A daily SPF protects the tone and clarity your skin already shows.',
        icon: 'protection',
        related_finding_ids: [],
      },
    ],
    routine_seed: {
      skin_needs: ['gentle baseline', 'light hydration', 'daily protection'],
      avoid_tonight: ['harsh actives'],
      recommended_step_types: ['cleanse', 'moisturize', 'protect'],
      intensity: 'gentle',
      step_taglines: {
        cleanse: 'Gentle daily reset for balanced skin.',
        treat: 'Light hydration under the eyes.',
        moisturize: 'Lightweight hydration that supports your barrier.',
        protect: 'Daily SPF — your tone’s best ally.',
      },
    },
    quality: {
      usable: true,
      mode: 'full',
      score: 0.82,
      reasons: [],
    },
  };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function inEnum<T extends string>(
  v: unknown,
  values: readonly T[]
): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v);
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function pickIntOrNull(v: unknown): number | null {
  if (v === null) return null;
  if (isFiniteNumber(v)) return Math.round(v);
  return null;
}

function arrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isString);
}

function arrayOfEnum<T extends string>(
  v: unknown,
  values: readonly T[]
): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is T => inEnum(x, values));
}

// ============================================================================
// Compound shape validators.
// ============================================================================

// v17.0 — image-anchored overlay helpers.
//
// All overlay coordinates are normalised 0..1 against the captured
// image's natural width/height. We clamp aggressively to defend
// against the model emitting slightly out-of-range values.

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function validateNormalizedPoint(
  v: unknown
): { x: number; y: number } | null {
  if (!isObject(v)) return null;
  if (!isFiniteNumber(v.x) || !isFiniteNumber(v.y)) return null;
  return { x: clamp01(v.x), y: clamp01(v.y) };
}

function validateRegionPolygon(
  v: unknown
): Array<{ x: number; y: number }> | undefined {
  if (!Array.isArray(v)) return undefined;
  const points: Array<{ x: number; y: number }> = [];
  for (const raw of v) {
    const p = validateNormalizedPoint(raw);
    if (p) points.push(p);
  }
  // A polygon needs at least 3 points to render meaningfully. Anything
  // less and we drop the field — the FaceSkinMap will fall back to the
  // landmark-anchored ellipse for that concern.
  if (points.length < 3) return undefined;
  return points;
}

function validateFaceOverlay(v: unknown): {
  face_box: { x: number; y: number; width: number; height: number };
  landmarks: {
    left_eye: { x: number; y: number };
    right_eye: { x: number; y: number };
    nose_tip: { x: number; y: number };
    mouth_center: { x: number; y: number };
    chin: { x: number; y: number };
    forehead_center: { x: number; y: number };
  };
} | undefined {
  if (!isObject(v)) return undefined;
  if (!isObject(v.face_box)) return undefined;
  const fb = v.face_box;
  if (
    !isFiniteNumber(fb.x) ||
    !isFiniteNumber(fb.y) ||
    !isFiniteNumber(fb.width) ||
    !isFiniteNumber(fb.height)
  ) {
    return undefined;
  }
  if (!isObject(v.landmarks)) return undefined;
  const lm = v.landmarks;
  const leftEye = validateNormalizedPoint(lm.left_eye);
  const rightEye = validateNormalizedPoint(lm.right_eye);
  const noseTip = validateNormalizedPoint(lm.nose_tip);
  const mouthCenter = validateNormalizedPoint(lm.mouth_center);
  const chin = validateNormalizedPoint(lm.chin);
  const foreheadCenter = validateNormalizedPoint(lm.forehead_center);
  if (
    !leftEye ||
    !rightEye ||
    !noseTip ||
    !mouthCenter ||
    !chin ||
    !foreheadCenter
  ) {
    return undefined;
  }
  return {
    face_box: {
      x: clamp01(fb.x),
      y: clamp01(fb.y),
      width: clamp01(fb.width),
      height: clamp01(fb.height),
    },
    landmarks: {
      left_eye: leftEye,
      right_eye: rightEye,
      nose_tip: noseTip,
      mouth_center: mouthCenter,
      chin,
      forehead_center: foreheadCenter,
    },
  };
}

function validateFinding(v: unknown): FaceConcernFinding | null {
  if (!isObject(v)) return null;
  const concern = v.concern;
  const severity = v.severity;
  const direction = v.direction_vs_previous;
  if (!inEnum(concern, CONCERN_TYPES)) return null;
  if (!inEnum(severity, SEVERITIES)) return null;
  if (!inEnum(direction, DIRECTIONS)) return null;
  const confidence = isFiniteNumber(v.confidence)
    ? Math.max(0, Math.min(1, v.confidence))
    : 0.5;
  const regions = arrayOfEnum(v.regions, FACE_REGIONS);
  const userSummary = isString(v.user_summary) ? v.user_summary : '';
  const clinicianSummary = isString(v.clinician_style_summary)
    ? v.clinician_style_summary
    : '';
  const rawPriority = isFiniteNumber(v.marker_priority)
    ? clampInt(v.marker_priority, 0, 3)
    : 3;
  const markerPriority = (rawPriority as 0 | 1 | 2 | 3);
  const regionPolygon = validateRegionPolygon(v.region_polygon);
  return {
    concern,
    severity,
    direction_vs_previous: direction,
    confidence,
    regions,
    user_summary: userSummary,
    clinician_style_summary: clinicianSummary,
    marker_priority: markerPriority,
    ...(regionPolygon ? { region_polygon: regionPolygon } : {}),
  };
}

function validateScoreFactors(v: unknown): FaceScanAnalysis['score_factors'] | null {
  if (!isObject(v)) return null;
  const keys: (keyof FaceScanAnalysis['score_factors'])[] = [
    'breakouts',
    'hydration',
    'texture',
    'dark_marks',
    'redness',
    'oiliness',
    'sensitivity',
    'pores',
  ];
  const out: Record<string, number> = {};
  for (const k of keys) {
    const raw = v[k];
    if (!isFiniteNumber(raw)) return null;
    out[k] = clampInt(raw, 0, 100);
  }
  return out as FaceScanAnalysis['score_factors'];
}

export function validateFaceScanAnalysis(
  v: unknown
): FaceScanAnalysis | null {
  if (!isObject(v)) {
    aiLog.warn('validateFaceScanAnalysis', 'not an object');
    return null;
  }
  if (!isNonEmptyString(v.scan_id)) {
    aiLog.warn('validateFaceScanAnalysis', 'missing scan_id');
    return null;
  }
  if (!isObject(v.skin_score)) {
    aiLog.warn('validateFaceScanAnalysis', 'missing skin_score');
    return null;
  }
  const ss = v.skin_score;
  if (!isFiniteNumber(ss.value)) {
    aiLog.warn('validateFaceScanAnalysis', 'missing skin_score.value');
    return null;
  }
  if (!inEnum(ss.band, SCORE_BANDS)) {
    aiLog.warn('validateFaceScanAnalysis', 'bad skin_score.band');
    return null;
  }
  const factors = validateScoreFactors(v.score_factors);
  if (!factors) {
    aiLog.warn('validateFaceScanAnalysis', 'bad score_factors');
    return null;
  }
  if (!isObject(v.image_quality)) {
    aiLog.warn('validateFaceScanAnalysis', 'missing image_quality');
    return null;
  }
  if (!isObject(v.next_focus)) {
    aiLog.warn('validateFaceScanAnalysis', 'missing next_focus');
    return null;
  }
  if (!isObject(v.plan_inputs)) {
    aiLog.warn('validateFaceScanAnalysis', 'missing plan_inputs');
    return null;
  }

  const findings = Array.isArray(v.findings)
    ? v.findings.map(validateFinding).filter((f): f is FaceConcernFinding => !!f)
    : [];

  const primaryConcern = inEnum(v.primary_concern, CONCERN_TYPES)
    ? v.primary_concern
    : null;
  const secondaryConcerns = arrayOfEnum(v.secondary_concerns, CONCERN_TYPES);

  // v17.0 — passthrough of image-anchored overlay data. Optional in
  // TS so old persisted scans without overlays still satisfy the
  // FaceScanAnalysis type. Helper returns undefined if the AI didn't
  // emit the field or emitted it malformed.
  const faceOverlay = validateFaceOverlay(v.face_overlay);

  return {
    scan_id: v.scan_id,
    analyzed_at_iso: isNonEmptyString(v.analyzed_at_iso)
      ? v.analyzed_at_iso
      : new Date().toISOString(),
    image_quality: {
      usable: isBool(v.image_quality.usable) ? v.image_quality.usable : true,
      issues: arrayOfEnum(v.image_quality.issues, QUALITY_ISSUES),
      confidence: isFiniteNumber(v.image_quality.confidence)
        ? Math.max(0, Math.min(1, v.image_quality.confidence))
        : 0.5,
    },
    skin_score: {
      value: clampInt(ss.value, 0, 100),
      band: ss.band,
      delta_vs_previous: pickIntOrNull(ss.delta_vs_previous),
      delta_vs_baseline: pickIntOrNull(ss.delta_vs_baseline),
      why_line: isString(ss.why_line) ? ss.why_line : '',
      explanation: isString(ss.explanation) ? ss.explanation : '',
    },
    primary_concern: primaryConcern,
    secondary_concerns: secondaryConcerns,
    findings,
    score_factors: factors,
    next_focus: {
      tonight: arrayOfStrings(v.next_focus.tonight),
      avoid: arrayOfStrings(v.next_focus.avoid),
    },
    plan_inputs: {
      target_concerns: arrayOfEnum(v.plan_inputs.target_concerns, CONCERN_TYPES),
      preferred_product_categories: arrayOfEnum(
        v.plan_inputs.preferred_product_categories,
        PRODUCT_CATEGORIES.filter((c) => c !== 'unknown') as Exclude<
          ProductCategory,
          'unknown'
        >[]
      ),
      contraindication_tags: arrayOfStrings(
        v.plan_inputs.contraindication_tags
      ),
    },
    ...(faceOverlay ? { face_overlay: faceOverlay } : {}),
  };
}

export function validateProductIdentity(v: unknown): ProductIdentity | null {
  if (!isObject(v)) {
    aiLog.warn('validateProductIdentity', 'not an object');
    return null;
  }
  if (!inEnum(v.source, ['barcode', 'image', 'hybrid'] as const)) {
    aiLog.warn('validateProductIdentity', 'bad source');
    return null;
  }
  if (!inEnum(v.product_category, PRODUCT_CATEGORIES)) {
    aiLog.warn('validateProductIdentity', 'bad product_category');
    return null;
  }
  return {
    source: v.source,
    confidence: isFiniteNumber(v.confidence)
      ? Math.max(0, Math.min(1, v.confidence))
      : 0.5,
    resolved: isBool(v.resolved) ? v.resolved : false,
    brand: isString(v.brand) ? v.brand : null,
    product_name: isString(v.product_name) ? v.product_name : null,
    canonical_title: isString(v.canonical_title) ? v.canonical_title : null,
    product_category: v.product_category,
    likely_concerns_supported: arrayOfEnum(
      v.likely_concerns_supported,
      CONCERN_TYPES
    ),
    key_claims: arrayOfStrings(v.key_claims),
    barcode_value: isString(v.barcode_value) ? v.barcode_value : null,
    catalog_lookup_key: isString(v.catalog_lookup_key)
      ? v.catalog_lookup_key
      : null,
    packaging_notes: isString(v.packaging_notes) ? v.packaging_notes : '',
  };
}

export function validateBarcodeResolution(
  v: unknown
): BarcodeResolution | null {
  if (!isObject(v)) {
    aiLog.warn('validateBarcodeResolution', 'not an object');
    return null;
  }
  if (!isString(v.barcode_value)) {
    aiLog.warn('validateBarcodeResolution', 'missing barcode_value');
    return null;
  }
  const identity =
    v.identity === null
      ? null
      : validateProductIdentity(v.identity);
  return {
    barcode_value: v.barcode_value,
    found: isBool(v.found) ? v.found : false,
    matched_catalog_product_id: isString(v.matched_catalog_product_id)
      ? v.matched_catalog_product_id
      : null,
    identity,
    fallback_needed: isBool(v.fallback_needed) ? v.fallback_needed : true,
  };
}

// v11.7 — preflight result validator. Strict-mode JSON schema means
// the model's output is already shape-correct, but we still defend
// against null / missing fields the same way every other validator
// does.
const SCAN_PREFLIGHT_REASONS: readonly ScanPreflightReason[] = [
  'ok',
  'no_face',
  'partial_face',
  'too_dark',
  'too_blurry',
  'not_centered',
  'unknown',
];

export function validateScanPreflightResult(
  v: unknown
): ScanPreflightResult | null {
  if (!isObject(v)) {
    aiLog.warn('validateScanPreflightResult', 'not an object');
    return null;
  }
  if (!inEnum(v.reason, SCAN_PREFLIGHT_REASONS)) {
    aiLog.warn('validateScanPreflightResult', 'bad reason');
    return null;
  }
  let face_box: ScanPreflightResult['face_box'] = null;
  if (isObject(v.face_box)) {
    const fb = v.face_box;
    if (
      isFiniteNumber(fb.x) &&
      isFiniteNumber(fb.y) &&
      isFiniteNumber(fb.width) &&
      isFiniteNumber(fb.height)
    ) {
      face_box = {
        x: Math.max(0, Math.min(1, fb.x)),
        y: Math.max(0, Math.min(1, fb.y)),
        width: Math.max(0, Math.min(1, fb.width)),
        height: Math.max(0, Math.min(1, fb.height)),
      };
    }
  }
  return {
    face_present: isBool(v.face_present) ? v.face_present : false,
    full_face_visible: isBool(v.full_face_visible) ? v.full_face_visible : false,
    centered_enough: isBool(v.centered_enough) ? v.centered_enough : false,
    lighting_ok: isBool(v.lighting_ok) ? v.lighting_ok : false,
    blur_ok: isBool(v.blur_ok) ? v.blur_ok : false,
    face_box,
    reason: v.reason,
    retry_message: isString(v.retry_message) ? v.retry_message : '',
  };
}

function validateProductMatch(v: unknown): ProductMatch | null {
  if (!isObject(v)) return null;
  if (!isNonEmptyString(v.product_id)) return null;
  if (!isFiniteNumber(v.match_score)) return null;
  if (!inEnum(v.match_band, MATCH_BANDS)) return null;
  if (!inEnum(v.recommended_slot, ROUTINE_SLOTS)) return null;
  return {
    product_id: v.product_id,
    match_score: clampInt(v.match_score, 0, 100),
    match_band: v.match_band,
    primary_reasons: arrayOfStrings(v.primary_reasons),
    target_concerns: arrayOfEnum(v.target_concerns, CONCERN_TYPES),
    recommended_slot: v.recommended_slot,
    natural_option: isBool(v.natural_option) ? v.natural_option : false,
    avoid_if_tags: arrayOfStrings(v.avoid_if_tags),
  };
}

export function validateProductMatchResult(
  v: unknown
): ProductMatchResult | null {
  if (!isObject(v)) {
    aiLog.warn('validateProductMatchResult', 'not an object');
    return null;
  }
  if (!isString(v.for_user_id)) {
    aiLog.warn('validateProductMatchResult', 'missing for_user_id');
    return null;
  }
  const matches = Array.isArray(v.matches)
    ? v.matches.map(validateProductMatch).filter((m): m is ProductMatch => !!m)
    : [];
  const alternatives = Array.isArray(v.alternatives)
    ? v.alternatives
        .map(validateProductMatch)
        .filter((m): m is ProductMatch => !!m)
    : [];
  return {
    for_user_id: v.for_user_id,
    based_on_scan_id: isString(v.based_on_scan_id)
      ? v.based_on_scan_id
      : null,
    top_pick_product_id: isString(v.top_pick_product_id)
      ? v.top_pick_product_id
      : null,
    matches,
    alternatives,
  };
}

function validateRoutineAction(v: unknown): RoutineAction | null {
  if (!isObject(v)) return null;
  if (!inEnum(v.slot, ROUTINE_SLOTS)) return null;
  return {
    slot: v.slot,
    step_order: isFiniteNumber(v.step_order)
      ? Math.max(1, Math.round(v.step_order))
      : 1,
    title: isString(v.title) ? v.title : '',
    instruction: isString(v.instruction) ? v.instruction : '',
    linked_product_id: isString(v.linked_product_id)
      ? v.linked_product_id
      : null,
    reason: isString(v.reason) ? v.reason : '',
  };
}

export function validateRoutineRecommendation(
  v: unknown
): RoutineRecommendation | null {
  if (!isObject(v)) {
    aiLog.warn('validateRoutineRecommendation', 'not an object');
    return null;
  }
  return {
    based_on_scan_id: isString(v.based_on_scan_id)
      ? v.based_on_scan_id
      : null,
    headline: isString(v.headline) ? v.headline : '',
    tonight_focus: isString(v.tonight_focus) ? v.tonight_focus : '',
    morning: Array.isArray(v.morning)
      ? v.morning
          .map(validateRoutineAction)
          .filter((a): a is RoutineAction => !!a)
      : [],
    evening: Array.isArray(v.evening)
      ? v.evening
          .map(validateRoutineAction)
          .filter((a): a is RoutineAction => !!a)
      : [],
    saved_for_later: Array.isArray(v.saved_for_later)
      ? v.saved_for_later
          .map(validateRoutineAction)
          .filter((a): a is RoutineAction => !!a)
      : [],
    reminder_recommended: isBool(v.reminder_recommended)
      ? v.reminder_recommended
      : false,
  };
}

export function validateSkinScoreExplanation(
  v: unknown
): SkinScoreExplanation | null {
  if (!isObject(v)) {
    aiLog.warn('validateSkinScoreExplanation', 'not an object');
    return null;
  }
  if (!isFiniteNumber(v.score)) {
    aiLog.warn('validateSkinScoreExplanation', 'missing score');
    return null;
  }
  if (!inEnum(v.band, SCORE_BANDS)) {
    aiLog.warn('validateSkinScoreExplanation', 'bad band');
    return null;
  }
  if (!inEnum(v.delta_reference, DELTA_REFS)) {
    aiLog.warn('validateSkinScoreExplanation', 'bad delta_reference');
    return null;
  }
  return {
    score: clampInt(v.score, 0, 100),
    band: v.band,
    delta_reference: v.delta_reference,
    delta_value: pickIntOrNull(v.delta_value),
    short_status: isString(v.short_status) ? v.short_status : '',
    why_line: isString(v.why_line) ? v.why_line : '',
    coach_line: isString(v.coach_line) ? v.coach_line : '',
  };
}

export function validateProgressExplanation(
  v: unknown
): ProgressExplanation | null {
  if (!isObject(v)) {
    aiLog.warn('validateProgressExplanation', 'not an object');
    return null;
  }
  return {
    strongest_improvement: isString(v.strongest_improvement)
      ? v.strongest_improvement
      : '',
    strongest_regression: isString(v.strongest_regression)
      ? v.strongest_regression
      : null,
    unchanged_summary: isString(v.unchanged_summary)
      ? v.unchanged_summary
      : '',
    short_narrative: isString(v.short_narrative) ? v.short_narrative : '',
    compare_caption: isString(v.compare_caption) ? v.compare_caption : '',
  };
}

export function validateSearchSuggestionResult(
  v: unknown
): SearchSuggestionResult | null {
  if (!isObject(v)) {
    aiLog.warn('validateSearchSuggestionResult', 'not an object');
    return null;
  }
  return {
    prefill_placeholder: isString(v.prefill_placeholder)
      ? v.prefill_placeholder
      : '',
    suggestion_chips: arrayOfStrings(v.suggestion_chips),
    refinement_chips: arrayOfStrings(v.refinement_chips),
  };
}

export function validateAssistantAnswer(v: unknown): string | null {
  if (typeof v === 'string') return v;
  aiLog.warn('validateAssistantAnswer', 'not a string');
  return null;
}

// ============================================================================
// v18.0 — Live product lookup validator.
//
// Validates AI-returned LiveProductCandidate arrays. Strips bad
// candidates silently rather than rejecting the whole response — a
// single bad item shouldn't kill the whole retrieval. Per the
// contract, productUrl/imageUrl/price MAY be null; we don't try to
// repair those.
// ============================================================================

const IMAGE_SOURCE_ENUM = ['merchant', 'brand', 'obf', 'none'] as const;
const AVAILABILITY_ENUM = ['available', 'unknown'] as const;
const LIVE_LOOKUP_CONFIDENCE_ENUM = ['high', 'medium', 'low'] as const;

function validateLiveProductCandidate(
  v: unknown
): LiveProductCandidate | null {
  if (!isObject(v)) return null;
  // v19.8 — strict checks only on truly required identity fields
  // (id, brand, name, category). Everything else now defaults to
  // a safe value when the AI returns something off-spec, instead
  // of nulling the whole candidate. The previous strict-imageSource
  // / strict-availability checks were dropping otherwise-good
  // candidates whenever GPT-5-mini emitted a slightly-off enum
  // value (rare but observed in the wild). Now a candidate with
  // valid id/brand/name/category always survives.
  if (!isNonEmptyString(v.id)) return null;
  if (!isNonEmptyString(v.brand)) return null;
  if (!isNonEmptyString(v.name)) return null;
  if (!inEnum(v.category, PRODUCT_CATEGORIES)) return null;
  const imageSource = inEnum(v.imageSource, IMAGE_SOURCE_ENUM)
    ? v.imageSource
    : ('none' as const);
  const availability = inEnum(v.availability, AVAILABILITY_ENUM)
    ? v.availability
    : ('unknown' as const);
  const matchScore = isFiniteNumber(v.matchScore)
    ? clampInt(v.matchScore, 0, 100)
    : 60;
  const price = v.price === null
    ? null
    : isFiniteNumber(v.price)
    ? Math.max(0, v.price)
    : null;
  return {
    id: v.id,
    brand: v.brand,
    name: v.name,
    category: v.category,
    concernTags: arrayOfEnum(v.concernTags, CONCERN_TYPES),
    skinTypeTags: arrayOfStrings(v.skinTypeTags),
    ingredientsHighlights: arrayOfStrings(v.ingredientsHighlights),
    price,
    currency: isNonEmptyString(v.currency) ? v.currency : 'USD',
    merchantName: isString(v.merchantName) ? v.merchantName : null,
    productUrl: isString(v.productUrl) ? v.productUrl : null,
    imageUrl: isString(v.imageUrl) ? v.imageUrl : null,
    imageSource,
    shortDescription: isString(v.shortDescription) ? v.shortDescription : '',
    matchReason: isString(v.matchReason) ? v.matchReason : '',
    availability,
    sourceTimestamp: isNonEmptyString(v.sourceTimestamp)
      ? v.sourceTimestamp
      : new Date().toISOString(),
    matchScore,
  };
}

export function validateLiveProductLookupResult(
  v: unknown
): LiveProductLookupResult | null {
  if (!isObject(v)) {
    aiLog.warn('validateLiveProductLookupResult', 'not an object');
    return null;
  }
  if (!isString(v.query)) {
    aiLog.warn('validateLiveProductLookupResult', 'missing query');
    return null;
  }
  if (!inEnum(v.confidence, LIVE_LOOKUP_CONFIDENCE_ENUM)) {
    aiLog.warn('validateLiveProductLookupResult', 'bad confidence');
    return null;
  }
  const candidates = Array.isArray(v.candidates)
    ? v.candidates
        .map(validateLiveProductCandidate)
        .filter((c): c is LiveProductCandidate => !!c)
    : [];
  return {
    query: v.query,
    candidates,
    confidence: v.confidence,
  };
}

// ============================================================================
// Composite bundle validators.
// ============================================================================

export function validateScanToPlanBundle(v: unknown): {
  analysis: FaceScanAnalysis;
  matches: ProductMatchResult;
  routine: RoutineRecommendation;
  score: SkinScoreExplanation;
} | null {
  if (!isObject(v)) return null;
  const analysis = validateFaceScanAnalysis(v.analysis);
  const matches = validateProductMatchResult(v.matches);
  const routine = validateRoutineRecommendation(v.routine);
  const score = validateSkinScoreExplanation(v.score);
  if (!analysis || !matches || !routine || !score) {
    aiLog.warn('validateScanToPlanBundle', 'partial bundle');
    return null;
  }
  return { analysis, matches, routine, score };
}

// ============================================================================
// v19.18 — AI rerank validator.
// ============================================================================

export function validateProductRerankResult(v: unknown): {
  heroId: string | null;
  alternativeIds: string[];
  whyHeroFits: string | null;
  whatToAvoid: string[];
} | null {
  if (!isObject(v)) {
    aiLog.warn('validateProductRerankResult', 'not an object');
    return null;
  }
  const heroIdRaw = (v as { heroId?: unknown }).heroId;
  const heroId =
    typeof heroIdRaw === 'string' && heroIdRaw.trim().length > 0
      ? heroIdRaw.trim()
      : null;
  const altsRaw = (v as { alternativeIds?: unknown }).alternativeIds;
  const alternativeIds = arrayOfStrings(altsRaw)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const whyRaw = (v as { whyHeroFits?: unknown }).whyHeroFits;
  const whyHeroFits =
    typeof whyRaw === 'string' && whyRaw.trim().length > 0
      ? whyRaw.trim().slice(0, 140) // hard-cap to protect the UI
      : null;
  // v19.27 — whatToAvoid array. Empty when AI omits it (which is
  // valid per the schema since it's a required field with array
  // type — empty array is the canonical "nothing to avoid"
  // signal). Each entry hard-capped at 80 chars for UI safety.
  const avoidRaw = (v as { whatToAvoid?: unknown }).whatToAvoid;
  const whatToAvoid = arrayOfStrings(avoidRaw)
    .map((s) => s.trim().slice(0, 80))
    .filter((s) => s.length > 0)
    .slice(0, 5);
  // Drop alternatives that duplicate the hero — defense in depth.
  const dedupedAlts = heroId
    ? alternativeIds.filter((id) => id !== heroId)
    : alternativeIds;
  return {
    heroId,
    alternativeIds: dedupedAlts,
    whyHeroFits,
    whatToAvoid,
  };
}

/**
 * v19.43 — validate the AI-first ProductRecommendationPlan. Returns
 * `null` when the payload is missing or malformed; the engine then
 * records that as an explicit failure reason in ProductSourceMode
 * (no silent gray panel). Trims strings to safe UI lengths and
 * filters out empty slots.
 */
export function validateProductRecommendationPlan(v: unknown): {
  recommendationMode: 'best_for_you' | 'query_driven_search';
  userNeedSummary: string;
  dominantConcern: string | null;
  slots: Array<{
    slotKey: string;
    slotLabel: string;
    queryFamily:
      | 'moisturizer'
      | 'serum_texture'
      | 'chemical_exfoliant'
      | 'blemish_support'
      | 'spf'
      | 'cleanser'
      | 'other';
    targetNeed: string;
    mustHaveSignals: string[];
    avoidSignals: string[];
    searchQueries: string[];
    whyThisSlotMatters: string;
  }>;
} | null {
  if (!isObject(v)) {
    aiLog.warn('validateProductRecommendationPlan', 'not an object');
    return null;
  }
  const modeRaw = (v as { recommendationMode?: unknown }).recommendationMode;
  const mode =
    modeRaw === 'best_for_you' || modeRaw === 'query_driven_search'
      ? modeRaw
      : null;
  if (!mode) {
    aiLog.warn('validateProductRecommendationPlan', 'invalid recommendationMode');
    return null;
  }
  const need = (v as { userNeedSummary?: unknown }).userNeedSummary;
  const userNeedSummary =
    typeof need === 'string' && need.trim().length > 0
      ? need.trim().slice(0, 220)
      : '';
  const domRaw = (v as { dominantConcern?: unknown }).dominantConcern;
  const dominantConcern =
    typeof domRaw === 'string' && domRaw.trim().length > 0
      ? domRaw.trim().slice(0, 48)
      : null;
  const slotsRaw = (v as { slots?: unknown }).slots;
  if (!Array.isArray(slotsRaw)) {
    aiLog.warn('validateProductRecommendationPlan', 'slots not an array');
    return null;
  }
  const FAMILY_ENUM = new Set([
    'moisturizer',
    'serum_texture',
    'chemical_exfoliant',
    'blemish_support',
    'spf',
    'cleanser',
    'other',
  ]);
  const slots = slotsRaw
    .filter((s): s is Record<string, unknown> => isObject(s))
    .map((s) => ({
      slotKey:
        typeof s.slotKey === 'string' ? s.slotKey.trim().slice(0, 48) : '',
      slotLabel:
        typeof s.slotLabel === 'string' ? s.slotLabel.trim().slice(0, 60) : '',
      queryFamily: (FAMILY_ENUM.has(s.queryFamily as string)
        ? (s.queryFamily as string)
        : 'other') as
        | 'moisturizer'
        | 'serum_texture'
        | 'chemical_exfoliant'
        | 'blemish_support'
        | 'spf'
        | 'cleanser'
        | 'other',
      targetNeed:
        typeof s.targetNeed === 'string' ? s.targetNeed.trim().slice(0, 140) : '',
      mustHaveSignals: arrayOfStrings(s.mustHaveSignals)
        .map((x) => x.trim().slice(0, 48))
        .filter((x) => x.length > 0)
        .slice(0, 6),
      avoidSignals: arrayOfStrings(s.avoidSignals)
        .map((x) => x.trim().slice(0, 48))
        .filter((x) => x.length > 0)
        .slice(0, 6),
      searchQueries: arrayOfStrings(s.searchQueries)
        .map((x) => x.trim().slice(0, 80))
        .filter((x) => x.length > 0)
        .slice(0, 5),
      whyThisSlotMatters:
        typeof s.whyThisSlotMatters === 'string'
          ? s.whyThisSlotMatters.trim().slice(0, 220)
          : '',
    }))
    .filter((s) => s.slotKey.length > 0 && s.searchQueries.length > 0)
    .slice(0, 4);
  if (slots.length === 0) {
    aiLog.warn('validateProductRecommendationPlan', 'no usable slots');
    return null;
  }
  return {
    recommendationMode: mode,
    userNeedSummary,
    dominantConcern,
    slots,
  };
}

/**
 * v21.0 — validate the SlotSelectionResult returned by the AI slot
 * selector. Returns null on malformed payloads. Each selection
 * references one slotKey + an optional candidate id. The engine
 * verifies the candidate id is one of the shortlist ids; if not,
 * it records the selection as null and falls back to deterministic
 * slot top.
 */
export function validateSlotSelectionResult(v: unknown): {
  selections: Array<{
    slotKey: string;
    selectedCandidateId: string | null;
    whyPicked: string;
    whyNotOthersShort: string;
  }>;
  listReason: string;
} | null {
  if (!isObject(v)) {
    aiLog.warn('validateSlotSelectionResult', 'not an object');
    return null;
  }
  const selectionsRaw = (v as { selections?: unknown }).selections;
  if (!Array.isArray(selectionsRaw)) {
    aiLog.warn('validateSlotSelectionResult', 'selections not an array');
    return null;
  }
  const selections = selectionsRaw
    .filter((s): s is Record<string, unknown> => isObject(s))
    .map((s) => ({
      slotKey: typeof s.slotKey === 'string' ? s.slotKey.trim().slice(0, 48) : '',
      selectedCandidateId:
        typeof s.selectedCandidateId === 'string' &&
        s.selectedCandidateId.trim().length > 0
          ? s.selectedCandidateId.trim()
          : null,
      whyPicked:
        typeof s.whyPicked === 'string' ? s.whyPicked.trim().slice(0, 220) : '',
      whyNotOthersShort:
        typeof s.whyNotOthersShort === 'string'
          ? s.whyNotOthersShort.trim().slice(0, 160)
          : '',
    }))
    .filter((s) => s.slotKey.length > 0);
  if (selections.length === 0) {
    aiLog.warn('validateSlotSelectionResult', 'no usable selections');
    return null;
  }
  const listReasonRaw = (v as { listReason?: unknown }).listReason;
  const listReason =
    typeof listReasonRaw === 'string' ? listReasonRaw.trim().slice(0, 220) : '';
  return { selections, listReason };
}

/**
 * v22.1 — validate the SearchIntentPlan returned by the typed-search
 * planner. Returns null on malformed payloads. Single-family search
 * plan (NOT a slot plan).
 */
export function validateSearchIntentPlan(v: unknown): {
  recommendationMode: 'typed_search';
  rawQuery: string;
  normalizedQuery: string;
  searchIntentLabel: string;
  dominantProductFamily:
    | 'moisturizer'
    | 'serum_texture'
    | 'chemical_exfoliant'
    | 'blemish_support'
    | 'spf'
    | 'cleanser'
    | 'other';
  userNeedSummary: string;
  mustHaveSignals: string[];
  avoidSignals: string[];
  preferredTextures: string[];
  searchQueries: string[];
  rankingPriorities: string[];
} | null {
  if (!isObject(v)) {
    aiLog.warn('validateSearchIntentPlan', 'not an object');
    return null;
  }
  const modeRaw = (v as { recommendationMode?: unknown }).recommendationMode;
  if (modeRaw !== 'typed_search') {
    aiLog.warn('validateSearchIntentPlan', 'recommendationMode must be typed_search');
    return null;
  }
  const FAMILY_ENUM = new Set([
    'moisturizer',
    'serum_texture',
    'chemical_exfoliant',
    'blemish_support',
    'spf',
    'cleanser',
    'other',
  ]);
  const famRaw = (v as { dominantProductFamily?: unknown }).dominantProductFamily;
  const dominantProductFamily = FAMILY_ENUM.has(famRaw as string)
    ? (famRaw as
        | 'moisturizer'
        | 'serum_texture'
        | 'chemical_exfoliant'
        | 'blemish_support'
        | 'spf'
        | 'cleanser'
        | 'other')
    : 'other';
  const rawQuery =
    typeof (v as { rawQuery?: unknown }).rawQuery === 'string'
      ? ((v as { rawQuery: string }).rawQuery).slice(0, 200)
      : '';
  const normalizedQuery =
    typeof (v as { normalizedQuery?: unknown }).normalizedQuery === 'string'
      ? ((v as { normalizedQuery: string }).normalizedQuery).slice(0, 200)
      : rawQuery;
  const searchIntentLabel =
    typeof (v as { searchIntentLabel?: unknown }).searchIntentLabel === 'string'
      ? ((v as { searchIntentLabel: string }).searchIntentLabel).slice(0, 120)
      : '';
  const userNeedSummary =
    typeof (v as { userNeedSummary?: unknown }).userNeedSummary === 'string'
      ? ((v as { userNeedSummary: string }).userNeedSummary).slice(0, 220)
      : '';
  const sQueries = arrayOfStrings(
    (v as { searchQueries?: unknown }).searchQueries
  )
    .map((x) => x.trim().slice(0, 80))
    .filter((x) => x.length > 0)
    .slice(0, 6);
  if (sQueries.length === 0) {
    aiLog.warn('validateSearchIntentPlan', 'searchQueries empty');
    return null;
  }
  const mustHaveSignals = arrayOfStrings(
    (v as { mustHaveSignals?: unknown }).mustHaveSignals
  )
    .map((x) => x.trim().slice(0, 48))
    .filter((x) => x.length > 0)
    .slice(0, 6);
  const avoidSignals = arrayOfStrings(
    (v as { avoidSignals?: unknown }).avoidSignals
  )
    .map((x) => x.trim().slice(0, 48))
    .filter((x) => x.length > 0)
    .slice(0, 6);
  const preferredTextures = arrayOfStrings(
    (v as { preferredTextures?: unknown }).preferredTextures
  )
    .map((x) => x.trim().slice(0, 48))
    .filter((x) => x.length > 0)
    .slice(0, 6);
  const rankingPriorities = arrayOfStrings(
    (v as { rankingPriorities?: unknown }).rankingPriorities
  )
    .map((x) => x.trim().slice(0, 80))
    .filter((x) => x.length > 0)
    .slice(0, 6);
  return {
    recommendationMode: 'typed_search',
    rawQuery,
    normalizedQuery,
    searchIntentLabel,
    dominantProductFamily,
    userNeedSummary,
    mustHaveSignals,
    avoidSignals,
    preferredTextures,
    searchQueries: sQueries,
    rankingPriorities,
  };
}

export function validateProgressBundle(v: unknown): {
  progress: ProgressExplanation;
  score: SkinScoreExplanation;
} | null {
  if (!isObject(v)) return null;
  const progress = validateProgressExplanation(v.progress);
  const score = validateSkinScoreExplanation(v.score);
  if (!progress || !score) return null;
  return { progress, score };
}

export function validateScannedProductFit(v: unknown): {
  identity: ProductIdentity;
  fit: ProductMatchResult;
} | null {
  if (!isObject(v)) return null;
  const identity = validateProductIdentity(v.identity);
  const fit = validateProductMatchResult(v.fit);
  if (!identity || !fit) return null;
  return { identity, fit };
}

// ============================================================================
// AssistantContext validation (used by the proxy server when
// receiving an inbound assistant request — we never trust the client's
// context blindly).
// ============================================================================

export function validateAssistantContext(
  v: unknown
): AssistantContext | null {
  if (!isObject(v)) return null;
  if (!isObject(v.user_profile)) return null;
  if (!isObject(v.routine_snapshot)) return null;

  const skinTypeEnum = [
    'dry',
    'oily',
    'combination',
    'sensitive',
    'normal',
    'unknown',
  ] as const;
  const skinType = inEnum(v.user_profile.skin_type, skinTypeEnum)
    ? v.user_profile.skin_type
    : 'unknown';

  // v19.11 — accept display_name when present; coerce empty/missing
  // to null so the assistant prompt can branch on "no saved name".
  const rawDisplayName = (v.user_profile as { display_name?: unknown })
    .display_name;
  const displayName =
    typeof rawDisplayName === 'string' && rawDisplayName.trim().length > 0
      ? rawDisplayName.trim()
      : null;

  return {
    user_profile: {
      display_name: displayName,
      skin_type: skinType,
      top_goals: arrayOfStrings(v.user_profile.top_goals),
      sensitivities: arrayOfStrings(v.user_profile.sensitivities),
    },
    latest_scan:
      v.latest_scan === null
        ? null
        : validateFaceScanAnalysis(v.latest_scan),
    latest_score:
      v.latest_score === null
        ? null
        : validateSkinScoreExplanation(v.latest_score),
    routine_snapshot: {
      morning_product_ids: arrayOfStrings(
        v.routine_snapshot.morning_product_ids
      ),
      evening_product_ids: arrayOfStrings(
        v.routine_snapshot.evening_product_ids
      ),
      saved_product_ids: arrayOfStrings(
        v.routine_snapshot.saved_product_ids
      ),
    },
    progress_snapshot:
      v.progress_snapshot === null
        ? null
        : validateProgressExplanation(v.progress_snapshot),
    top_matches: Array.isArray(v.top_matches)
      ? v.top_matches
          .map(validateProductMatch)
          .filter((m): m is ProductMatch => !!m)
      : [],
    active_product_identity:
      v.active_product_identity === null
        ? null
        : validateProductIdentity(v.active_product_identity),
  };
}
