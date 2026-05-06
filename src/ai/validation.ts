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

  return {
    user_profile: {
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
