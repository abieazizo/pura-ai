/**
 * Pura AI — translate a structured `FaceScanAnalysis` into the
 * existing `Scan` shape the rest of the app already reads from.
 *
 * The app's UI is wired to the v8.1 Scan type (zones, concerns,
 * summaryHeadline, summaryBody, overallScore). When the AI gateway
 * returns a `FaceScanAnalysis`, this translator maps the AI fields
 * onto the legacy shape so:
 *   • the dial reads `scan.overallScore` (now AI-derived)
 *   • the result screen reads `scan.concerns` (now AI-derived)
 *   • the result screen overlay reads `scan.zones` (now AI-derived
 *     per-region scores)
 *   • the headline reads `scan.summaryHeadline` (now AI-derived)
 * AND the original analysis is attached as `scan.aiAnalysis` so
 * helpers (`buildSkinScoreWhy`, `buildTonightFocus`,
 * `buildSummaryHeadline`) can prefer the AI's structured language.
 *
 * The mapping is intentionally narrow — the AI engine is the source
 * of truth, the legacy shape is the rendering surface.
 */

import type {
  ConcernType,
  FaceConcernFinding,
  FaceRegion,
  FaceScanAnalysis,
  Severity as AISeverity,
} from './ai-contracts';
import type {
  Concern,
  ConcernCategory,
  ConcernHotspot,
  ConcernTrend,
  Scan,
  Severity as AppSeverity,
  SkinZone,
  SkinZoneKey,
  ZoneStatus,
  ZoneTrend,
} from '@/types';

// ---------------------------------------------------------------------------
// Concern category mapping.
//
// The AI emits 8 concern axes; the app surfaces 4 user-facing
// categories (breakouts / hydration / texture / tone). We collapse
// AI concerns into those 4 buckets, keeping the worst severity per
// bucket. This preserves existing UI semantics while the AI runs.
// ---------------------------------------------------------------------------

const AI_TO_APP_CATEGORY: Record<ConcernType, ConcernCategory> = {
  breakouts: 'breakouts',
  hydration: 'hydration',
  texture: 'texture',
  dark_marks: 'tone',
  redness: 'breakouts', // redness most often reads as inflamed breakouts
  oiliness: 'breakouts', // oiliness drives breakouts in the app's vocabulary
  sensitivity: 'hydration', // sensitivity → barrier/hydration story
  pores: 'texture',
};

const APP_CATEGORIES: ConcernCategory[] = [
  'breakouts',
  'hydration',
  'texture',
  'tone',
];

// ---------------------------------------------------------------------------
// Severity mapping. AI severity has 5 tiers; the app has 4.
// ---------------------------------------------------------------------------

function aiSeverityToApp(s: AISeverity): AppSeverity {
  switch (s) {
    case 'none':
    case 'low':
      return 'calm';
    case 'mild':
      return 'mild';
    case 'moderate':
      return 'moderate';
    case 'high':
      return 'needs-attention';
  }
}

function severityWeight(s: AppSeverity): number {
  switch (s) {
    case 'needs-attention':
      return 3;
    case 'moderate':
      return 2;
    case 'mild':
      return 1;
    case 'calm':
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Region mapping. AI regions are the 9-bucket FaceRegion enum; app
// SkinZones are 4 (forehead / tZone / chin / cheeks). The mapping
// returns the canonical SkinZoneKey for each AI region.
// ---------------------------------------------------------------------------

const AI_REGION_TO_ZONE: Record<FaceRegion, SkinZoneKey> = {
  forehead: 'forehead',
  t_zone: 'tZone',
  left_cheek: 'cheeks',
  right_cheek: 'cheeks',
  nose: 'tZone',
  chin: 'chin',
  jawline: 'chin',
  under_eyes: 'cheeks',
  across_face: 'forehead',
};

const ZONE_LABEL: Record<SkinZoneKey, string> = {
  forehead: 'Forehead',
  tZone: 'Nose and center forehead',
  chin: 'Chin',
  cheeks: 'Cheeks',
  nose: 'Nose',
  jawline: 'Jawline',
};

const ZONE_HOTSPOT_CANON: Record<SkinZoneKey, ConcernHotspot[]> = {
  forehead: [{ x: 0.5, y: 0.32 }],
  tZone: [{ x: 0.5, y: 0.5 }],
  chin: [{ x: 0.5, y: 0.82 }],
  cheeks: [
    { x: 0.28, y: 0.58 },
    { x: 0.72, y: 0.58 },
  ],
  nose: [{ x: 0.5, y: 0.55 }],
  jawline: [{ x: 0.5, y: 0.86 }],
};

function regionPhrase(regions: FaceRegion[]): string {
  if (regions.length === 0) return 'across the face';
  const first = regions[0];
  switch (first) {
    case 'forehead':
      return 'forehead';
    case 't_zone':
      return 'nose and center forehead';
    case 'left_cheek':
      return 'left cheek';
    case 'right_cheek':
      return 'right cheek';
    case 'nose':
      return 'nose';
    case 'chin':
      return 'chin';
    case 'jawline':
      return 'jawline';
    case 'under_eyes':
      return 'under eyes';
    case 'across_face':
      return 'across the face';
  }
}

// ---------------------------------------------------------------------------
// Concern construction.
// ---------------------------------------------------------------------------

/**
 * v12.0 — confidence-aware finding filter. The AI sometimes returns
 * low-confidence findings that look certain in the JSON; the UI was
 * surfacing them as "moderate breakouts on nose" even when the
 * confidence was 0.3. This filter:
 *
 *   • Drops findings below MIN_CONFIDENCE.
 *   • Caps severity at "mild" for findings between MIN_CONFIDENCE and
 *     STRONG_CONFIDENCE (so a low-confidence "moderate" reads as
 *     "mild" in the UI).
 *   • If image_quality is flagged as low, applies an additional
 *     one-tier downgrade across the board.
 *
 * Net effect: the only findings the user sees with severity ≥
 * moderate are findings the model was genuinely confident about AND
 * the photo had enough quality to support.
 */
const MIN_CONFIDENCE = 0.55;
const MIN_CONFIDENCE_LOW_QUALITY = 0.70; // v12.2: stricter when photo is bad
const STRONG_CONFIDENCE = 0.75;

function downgradeSeverity(s: AISeverity): AISeverity {
  switch (s) {
    case 'high':
      return 'moderate';
    case 'moderate':
      return 'mild';
    case 'mild':
      return 'low';
    case 'low':
    case 'none':
      return s;
  }
}

function applyConfidenceClamp(
  finding: FaceConcernFinding,
  imageQualityLow: boolean
): FaceConcernFinding | null {
  // v12.2 — when the photo is low quality, raise the confidence
  // floor so we only surface findings the model is genuinely sure
  // of. This is the strongest defence against false positives on
  // poorly-lit / angled / blurry shots.
  const floor = imageQualityLow ? MIN_CONFIDENCE_LOW_QUALITY : MIN_CONFIDENCE;
  if (finding.confidence < floor) return null;

  let severity = finding.severity;
  // Medium-confidence findings can't claim moderate+. Cap at mild.
  if (finding.confidence < STRONG_CONFIDENCE) {
    if (severity === 'high' || severity === 'moderate') severity = 'mild';
  }
  // Low image quality → one-tier downgrade for everything.
  if (imageQualityLow) {
    severity = downgradeSeverity(severity);
  }
  return { ...finding, severity };
}

function pickWorstFindingPerCategory(
  findings: FaceConcernFinding[],
  imageQualityLow: boolean
): Map<ConcernCategory, FaceConcernFinding> {
  const map = new Map<ConcernCategory, FaceConcernFinding>();
  for (const raw of findings) {
    const f = applyConfidenceClamp(raw, imageQualityLow);
    if (!f) continue;
    if (aiSeverityToApp(f.severity) === 'calm') continue;
    const cat = AI_TO_APP_CATEGORY[f.concern];
    const existing = map.get(cat);
    if (
      !existing ||
      severityWeight(aiSeverityToApp(f.severity)) >
        severityWeight(aiSeverityToApp(existing.severity))
    ) {
      map.set(cat, f);
    }
  }
  return map;
}

function aiTrendToConcernTrend(direction: FaceConcernFinding['direction_vs_previous']): ConcernTrend {
  switch (direction) {
    case 'better':
      return 'improved';
    case 'worse':
      return 'worsened';
    case 'same':
      return 'unchanged';
    case 'new':
      return 'new';
  }
}

function buildConcernsFromAI(analysis: FaceScanAnalysis): Concern[] {
  const imageQualityLow =
    !analysis.image_quality.usable ||
    analysis.image_quality.confidence < 0.6 ||
    analysis.image_quality.issues.length > 0;
  const byCategory = pickWorstFindingPerCategory(
    analysis.findings,
    imageQualityLow
  );

  // Make sure every app category has a row even if the AI returned
  // nothing for it — the result screen guarantees 4 concerns.
  const rows: Concern[] = APP_CATEGORIES.map((category) => {
    const finding = byCategory.get(category);
    if (finding) {
      const severity = aiSeverityToApp(finding.severity);
      const region = regionPhrase(finding.regions);
      const hotspotZone =
        finding.regions.length > 0
          ? AI_REGION_TO_ZONE[finding.regions[0]]
          : 'forehead';
      return {
        category,
        severity,
        rank: 0,
        region,
        hotspots: ZONE_HOTSPOT_CANON[hotspotZone],
        finding: finding.user_summary,
        interpretation: finding.clinician_style_summary,
        nextStep:
          analysis.next_focus.tonight[
            APP_CATEGORIES.indexOf(category) % Math.max(1, analysis.next_focus.tonight.length)
          ] ?? calmNextStepFor(category),
        trend: aiTrendToConcernTrend(finding.direction_vs_previous),
      };
    }
    return {
      category,
      severity: 'calm' as AppSeverity,
      rank: 0,
      region: 'across the face',
      hotspots: ZONE_HOTSPOT_CANON.forehead,
      // v12.2 — copy fix. Previous "Hydration are settled" was a
      // grammar bug (singular noun + plural verb). Per-category
      // calm copy reads cleanly now.
      finding: calmCopyFor(category),
      interpretation: 'No work needed here today.',
      // v23.0 — concrete supporting instruction instead of the vague
      // "Stay the course tonight." line. Per-category copy gives the
      // user something to actually do tonight even when the category
      // reads calm — that is the difference between a tracker app
      // and a coach.
      nextStep: calmNextStepFor(category),
      trend: 'unchanged' as ConcernTrend,
    };
  });

  // Sort by severity desc + assign rank 1..4.
  rows.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * v12.2 — per-category copy for calm rows. Each line uses the right
 * singular/plural verb form and reads as a calm narration rather
 * than a fill-in-the-blank template.
 */
function calmCopyFor(category: ConcernCategory): string {
  switch (category) {
    case 'breakouts':
      return 'No active breakouts visible in this scan.';
    case 'hydration':
      return 'Hydration looks balanced overall.';
    case 'texture':
      return 'Skin texture reads as smooth in this photo.';
    case 'tone':
      return 'Skin tone reads as even in this photo.';
  }
}

/**
 * v23.0 — concrete supporting instruction for calm categories.
 * Replaces the vague "Stay the course tonight." line so every
 * Routine surface gives the user a real, actionable step grounded
 * in the category — not just a pat on the back.
 */
function calmNextStepFor(category: ConcernCategory): string {
  switch (category) {
    case 'breakouts':
      return 'Keep tonight light: gentle cleanser + a lightweight moisturizer. Skip new actives.';
    case 'hydration':
      return 'Lock in tonight’s hydration: apply a humectant on damp skin, then your moisturizer.';
    case 'texture':
      return 'Hold a gentle PM routine tonight. Save exfoliating actives for tomorrow if texture stays smooth.';
    case 'tone':
      return 'Keep wearing SPF in the AM. Tonight, layer a brightening serum (vitamin C or niacinamide) under moisturizer.';
  }
}

// ---------------------------------------------------------------------------
// Zone construction.
//
// The AI's `score_factors` are concern-axis sub-scores (0..100). The
// app's SkinZones are region-keyed. We synthesise zone scores from
// concern axes via fixed mapping rules:
//   forehead = mean(texture, oiliness, breakouts)
//   tZone    = mean(oiliness, pores)
//   cheeks   = mean(hydration, redness, sensitivity)
//   chin     = mean(breakouts, redness)
// This preserves the existing zone-overlay UI without requiring the
// AI to emit per-zone scores it doesn't reason about natively.
// ---------------------------------------------------------------------------

function meanOf(values: number[]): number {
  if (values.length === 0) return 50;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}

function zoneStatusFromScore(score: number): ZoneStatus {
  if (score >= 70) return 'calm';
  if (score >= 50) return 'monitor';
  return 'active';
}

function zoneTrendFromAnalysis(
  zone: SkinZoneKey,
  analysis: FaceScanAnalysis
): ZoneTrend {
  // Trend per zone derived from whether ANY finding in this zone moved.
  const findings = analysis.findings.filter((f) =>
    f.regions.some((r) => AI_REGION_TO_ZONE[r] === zone)
  );
  if (findings.length === 0) return 'stable';
  const better = findings.filter(
    (f) => f.direction_vs_previous === 'better'
  ).length;
  const worse = findings.filter(
    (f) => f.direction_vs_previous === 'worse'
  ).length;
  if (better > worse) return 'improving';
  if (worse > better) return 'worsening';
  return 'stable';
}

function buildZonesFromAI(analysis: FaceScanAnalysis): SkinZone[] {
  const sf = analysis.score_factors;
  const foreheadScore = meanOf([sf.texture, sf.oiliness, sf.breakouts]);
  const tZoneScore = meanOf([sf.oiliness, sf.pores]);
  const cheeksScore = meanOf([sf.hydration, sf.redness, sf.sensitivity]);
  const chinScore = meanOf([sf.breakouts, sf.redness]);

  const forehead: SkinZone = {
    key: 'forehead',
    label: ZONE_LABEL.forehead,
    status: zoneStatusFromScore(foreheadScore),
    trend: zoneTrendFromAnalysis('forehead', analysis),
    score: foreheadScore,
    shortInsight: shortInsightForZone('forehead', analysis),
    glow: [{ x: 0.5, y: 0.18, radius: 0.28, intensity: glowIntensity(foreheadScore) }],
  };
  const tZone: SkinZone = {
    key: 'tZone',
    label: ZONE_LABEL.tZone,
    status: zoneStatusFromScore(tZoneScore),
    trend: zoneTrendFromAnalysis('tZone', analysis),
    score: tZoneScore,
    shortInsight: shortInsightForZone('tZone', analysis),
    glow: [{ x: 0.5, y: 0.52, radius: 0.22, intensity: glowIntensity(tZoneScore) }],
  };
  const cheeks: SkinZone = {
    key: 'cheeks',
    label: ZONE_LABEL.cheeks,
    status: zoneStatusFromScore(cheeksScore),
    trend: zoneTrendFromAnalysis('cheeks', analysis),
    score: cheeksScore,
    shortInsight: shortInsightForZone('cheeks', analysis),
  };
  const chin: SkinZone = {
    key: 'chin',
    label: ZONE_LABEL.chin,
    status: zoneStatusFromScore(chinScore),
    trend: zoneTrendFromAnalysis('chin', analysis),
    score: chinScore,
    shortInsight: shortInsightForZone('chin', analysis),
    glow: [{ x: 0.5, y: 0.82, radius: 0.26, intensity: glowIntensity(chinScore) }],
  };

  return [chin, forehead, tZone, cheeks];
}

function glowIntensity(score: number): number {
  // Lower score = louder glow (because that zone needs attention).
  return Math.max(0.2, Math.min(0.6, (100 - score) / 120));
}

function shortInsightForZone(
  zone: SkinZoneKey,
  analysis: FaceScanAnalysis
): string {
  const matched = analysis.findings.find((f) =>
    f.regions.some((r) => AI_REGION_TO_ZONE[r] === zone)
  );
  if (matched) {
    return matched.user_summary.length > 60
      ? `${matched.user_summary.slice(0, 57)}…`
      : matched.user_summary;
  }
  return 'Settled in this scan.';
}

// ---------------------------------------------------------------------------
// Public translator.
// ---------------------------------------------------------------------------

export interface TranslateAnalysisInput {
  analysis: FaceScanAnalysis;
  photoUri: string;
  dayNumber: number;
  /** Existing scan id to keep stable (otherwise derived from analysis). */
  scanId?: string;
  /**
   * v12.2 — when present, the score is smoothed against this baseline
   * to avoid arbitrary swings between consecutive scans. Pass the
   * previous scan's overallScore here.
   */
  previousScore?: number | null;
}

/**
 * Map an AI analysis onto the existing Scan shape. The original
 * analysis is preserved on `aiAnalysis` so helpers can read its
 * structured fields directly.
 */
export function translateAnalysisToScan(
  input: TranslateAnalysisInput
): Scan {
  const { analysis, photoUri, dayNumber, scanId } = input;
  // v12.0 — pre-normalize next_focus strings so any raw token leaks
  // (e.g. "gentle_exfoliation_chemical_1-2x") never reach the UI.
  // v12.2 — also override the AI's reported skin_score with a more
  // defensible derivation (deriveDefensibleScore) before any
  // downstream consumer reads it. Keeps the AI's inputs but
  // smooths the output against image quality and prior history.
  const previousScore = input.previousScore ?? null;
  const defensibleScore = deriveDefensibleScore(analysis, previousScore);
  const normalizedAnalysis: FaceScanAnalysis = {
    ...analysis,
    skin_score: {
      ...analysis.skin_score,
      value: defensibleScore,
    },
    next_focus: {
      tonight: analysis.next_focus.tonight.map(humanizeRoutineString),
      avoid: analysis.next_focus.avoid.map(humanizeRoutineString),
    },
  };
  const concerns = buildConcernsFromAI(normalizedAnalysis);
  const zones = buildZonesFromAI(normalizedAnalysis);

  // Headline + body fall back to AI explanation / first finding when
  // present. The deterministic helpers `buildSummaryHeadline` /
  // `buildTonightFocus` will also see `aiAnalysis` and prefer its
  // values, but we populate the legacy fields too so consumers that
  // read them directly (older Scan-shape consumers) get sensible text.
  const summaryHeadline =
    normalizedAnalysis.skin_score.explanation ||
    (concerns[0]?.finding ?? 'Your reading is ready.');
  const summaryBody = concerns
    .slice(0, 2)
    .map((c) => c.finding)
    .join(' ');

  return {
    id: scanId ?? normalizedAnalysis.scan_id,
    capturedAt:
      normalizedAnalysis.analyzed_at_iso || new Date().toISOString(),
    dayNumber,
    photoUri,
    overallScore: normalizedAnalysis.skin_score.value,
    zones,
    summaryHeadline,
    summaryBody,
    concerns,
    aiAnalysis: normalizedAnalysis,
  };
}

// ---------------------------------------------------------------------------
// v12.2 — defensible score derivation.
//
// The previous flow used the AI's raw `skin_score.value` directly.
// That can feel arbitrary to users — one scan reports 72, the next
// reports 64 with the same face under slightly different lighting.
//
// `deriveDefensibleScore` blends three sources to produce a score
// that:
//   • reflects the AI's overall judgement (60% weight)
//   • reflects the AI's structured score_factors (40% weight) so
//     no single intuitive call drags the number too far
//   • is pulled toward 75 (the "typical-healthy default") in
//     proportion to (1 - image_quality.confidence) — bad photos
//     get a cautious centring, not a confident extreme value
//   • is smoothed against the previous scan's score so the delta
//     never exceeds MAX_SWING points
//
// All math is deterministic over the AI input + previousScore — no
// randomness, no time-based jitter. The same analysis + same prior
// yields the same final score every time.
// ---------------------------------------------------------------------------

const TYPICAL_HEALTHY_DEFAULT = 75;
const MAX_SWING_PER_SCAN = 15;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function meanScoreFactors(
  analysis: FaceScanAnalysis
): number {
  const sf = analysis.score_factors;
  const values = [
    sf.breakouts,
    sf.hydration,
    sf.texture,
    sf.dark_marks,
    sf.redness,
    sf.oiliness,
    sf.sensitivity,
    sf.pores,
  ];
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function deriveDefensibleScore(
  analysis: FaceScanAnalysis,
  previousScore: number | null
): number {
  const aiScore = clamp(Math.round(analysis.skin_score.value), 0, 100);
  const factorsMean = meanScoreFactors(analysis);
  const blended = Math.round(0.6 * aiScore + 0.4 * factorsMean);

  // Image quality weight: 1.0 = full trust in the blended value;
  // 0.0 = pull entirely toward the typical-healthy default. Clamped
  // to [0.4, 1.0] so a low-quality image still produces SOME signal,
  // it just gets pulled toward 75 by up to 60%.
  const qualityConf = clamp(analysis.image_quality.confidence, 0, 1);
  const trustWeight = clamp(qualityConf, 0.4, 1.0);
  const qualityAdjusted = Math.round(
    trustWeight * blended + (1 - trustWeight) * TYPICAL_HEALTHY_DEFAULT
  );

  // Smooth vs previous scan: if a prior scan exists, cap the delta
  // so a single weak signal can't move the score wildly.
  if (previousScore !== null && previousScore !== undefined) {
    const delta = qualityAdjusted - previousScore;
    if (Math.abs(delta) > MAX_SWING_PER_SCAN) {
      const capped =
        previousScore + Math.sign(delta) * MAX_SWING_PER_SCAN;
      return clamp(capped, 0, 100);
    }
  }

  return clamp(qualityAdjusted, 0, 100);
}

// ---------------------------------------------------------------------------
// v12.0 — routine string humanizer.
//
// The model is now prompted to return human sentences, but we keep
// this normalizer as a defensive layer: if a raw token like
// `gentle_exfoliation_chemical_1-2x` ever leaks through, we map it
// to clean copy before any UI surface ever sees it.
// ---------------------------------------------------------------------------

const TOKEN_MAP: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /gentle[_-]exfoliation[_-]chemical[_-]?1[\s-]?2x/i,
    'Use a gentle chemical exfoliant 1–2 nights per week.',
  ],
  [
    /(light|gentle)[_-]hydrating[_-]serum/i,
    'Apply a light hydrating serum.',
  ],
  [
    /barrier[_-]repair[_-]?(only|moisturizer)?/i,
    'Stick to a barrier-repair moisturizer tonight.',
  ],
  [
    /spot[_-]care[_-]if[_-]new[_-]blemishes/i,
    'Use spot treatment only if new blemishes appear.',
  ],
  [
    /pause[_-]actives|skip[_-]actives|no[_-]actives/i,
    'Skip actives tonight.',
  ],
  [
    /spf[_-]?(daily|am)?/i,
    'Wear SPF in the morning.',
  ],
  [
    /retinol[_-]?(start|low|begin)?/i,
    'Reintroduce retinol slowly — twice a week to start.',
  ],
];

export function humanizeRoutineString(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return trimmed;

  // If the string already reads as a sentence (has spaces and ends
  // with sensible punctuation), pass it through unchanged.
  const looksHuman =
    /\s/.test(trimmed) && !/^[a-z0-9_]+$/i.test(trimmed) && !/_/.test(trimmed);
  if (looksHuman) {
    // Ensure terminal punctuation.
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  }

  // Try the explicit token map first.
  for (const [pattern, humanized] of TOKEN_MAP) {
    if (pattern.test(trimmed)) return humanized;
  }

  // Generic fallback: convert snake_case / kebab-case to a sentence.
  const words = trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (words.length === 0) return trimmed;
  const sentence = words.charAt(0).toUpperCase() + words.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

/**
 * Build the compact "previous summary" string the AI uses on
 * subsequent scans to reason about delta. Centralised here so the
 * format is stable across calls.
 */
export function buildPreviousSummary(scan: Scan): string {
  if (!scan.aiAnalysis) {
    // Legacy/fallback summary built from the existing Scan shape.
    return JSON.stringify({
      overall_score: scan.overallScore,
      headline: scan.summaryHeadline,
      concerns: (scan.concerns ?? []).map((c) => ({
        category: c.category,
        severity: c.severity,
        region: c.region,
      })),
    });
  }
  const a = scan.aiAnalysis;
  return JSON.stringify({
    skin_score: a.skin_score.value,
    band: a.skin_score.band,
    primary_concern: a.primary_concern,
    secondary_concerns: a.secondary_concerns,
    score_factors: a.score_factors,
    findings: a.findings.map((f) => ({
      concern: f.concern,
      severity: f.severity,
      direction_vs_previous: f.direction_vs_previous,
    })),
  });
}
