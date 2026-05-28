/**
 * Translate a `Scan` (with optional `FaceScanAnalysis`) into the strict
 * `ScanAnalysisResponse` the scan-results UI consumes.
 *
 * Truth-first contract:
 *   • No fallback synthesis. If the AI returned zero findings, the
 *     translator returns zero findings — full stop. The UI is responsible
 *     for routing to the no-findings conclusion screen.
 *   • No fallback insights. Insights are derived from supported findings
 *     only; when there are no supported findings, `insights` is `[]`.
 *   • Routine eligibility is strict. `allowed === true` requires (a) a
 *     usability that is not `retake_required` AND (b) at least one
 *     supported finding that clears the display threshold.
 *   • Service failures route through a SEPARATE shape
 *     (`ScanAnalysisServiceFailure`) — they never produce a permissive
 *     "limited" result that lets the UI render anything.
 *
 * Screens never read `Scan.aiAnalysis` directly — they read the output
 * of this function. The render rule (`present && supportedByScan &&
 * confidence >= MINIMUM_DISPLAY_THRESHOLD`) is applied here once and
 * the UI consumes the result.
 */

import type {
  FaceConcernFinding,
  FaceScanAnalysis,
} from '@/ai/ai-contracts';
import type { Scan } from '@/types';
import type {
  ScanAnalysisResponse,
  ScanInsight,
  ScanQuality,
  ScanQualityIssue,
  ScanSummary,
  ScanUsability,
  SemanticFaceZone,
  VisibleFinding,
} from '@/types/scanResults';
import {
  MINIMUM_DISPLAY_THRESHOLD,
  POSSIBLE_DISPLAY_THRESHOLD,
} from '@/types/scanResults';
import {
  expandRegionToZones,
  mapConcernToVisualType,
  priorityWeight,
  resolveDisplayPriority,
  severityImpliesPresent,
} from './concernCatalog';

declare const __DEV__: boolean | undefined;

// ---------------------------------------------------------------------------
// Usability classifier — the single source of truth for the gate.
// ---------------------------------------------------------------------------

export interface UsabilityInput {
  /** Did the AI return a structured analysis at all? */
  hasAnalysis: boolean;
  /** Did the AI's `face_overlay` block resolve? */
  faceDetected: boolean;
  /** Raw image_quality.confidence (0..1). */
  rawConfidence: number;
  /** Issues array as the AI returned them. */
  issues: ReadonlyArray<string>;
  /** Number of structured findings the AI surfaced (any priority). */
  findingCount: number;
  /** Number of findings with strong support (priority > 0). */
  supportedFindingCount: number;
}

/**
 * Classify a scan into one of three usability tiers.
 *
 * Calibration philosophy (post bug-fix): the bar for `retake_required`
 * is HIGH. We only force a retake when the photo is genuinely unreadable
 * — not because lighting is imperfect, not because the AI is uncertain,
 * not because findings are mild or absent. A normal everyday phone selfie
 * should land in `full_results` or `limited_results`, never in
 * `retake_required`.
 *
 * Service failures (AI unavailable, validation failure) route through the
 * SEPARATE error path (`ScanServiceErrorScreen`), not this classifier.
 * If `hasAnalysis` is false here it means the caller chose to translate
 * an empty scan — we treat it as retake because there is literally
 * nothing to display, but the upstream code path (ScanAnalyzingFaceScreen)
 * never lets that happen for a real service error — it shows the error
 * screen instead.
 */
export function classifyScanUsability(input: UsabilityInput): {
  usability: ScanUsability;
  reasons: string[];
  issues: ScanQualityIssue[];
} {
  const reasons: string[] = [];
  const issues = mapIssues(input.issues);

  if (!input.hasAnalysis) {
    reasons.push('Analysis service did not return a structured result');
    return { usability: 'retake_required', reasons, issues };
  }

  // FACE DETECTION:
  // The AI's `face_overlay` is optional and frequently stripped by the
  // validator when any single landmark is malformed. We must NOT treat
  // a missing/stripped face_overlay as "no face". The analysis itself
  // succeeded — that is evidence enough that a face was visible. Only
  // route to retake when the AI explicitly told us no face was readable:
  //   • AND the AI flagged image-quality confidence as extremely low, OR
  //   • AND the AI flagged `partial_face` AND zero findings came through.
  // A clean face that produced zero findings is NOT a retake — it is
  // either `full_results` with the "no focus area" empty state or
  // `limited_results` depending on confidence.
  if (!input.faceDetected && input.rawConfidence < 0.2) {
    reasons.push('No face detected in the photo');
    return { usability: 'retake_required', reasons, issues };
  }

  // HARD-FAIL reasons — only the genuinely unreadable cases.
  // Thresholds intentionally lower than v19-era values: in practice the
  // AI is told to be conservative on quality, and a `confidence < 0.25`
  // bar tripped on ordinary phone selfies with mild shadow. The new
  // thresholds reserve `retake_required` for the cases where a human
  // looking at the photo would also say "you can't read this".
  const severeBlur =
    input.issues.includes('blurry') && input.rawConfidence < 0.15;
  const majorZonesMissing =
    input.issues.includes('partial_face') && input.rawConfidence < 0.15;
  const extremeExposure =
    (input.issues.includes('low_light') ||
      input.issues.includes('harsh_light')) &&
    input.rawConfidence < 0.12;

  if (severeBlur) {
    reasons.push('Photo is too blurry to read');
    return { usability: 'retake_required', reasons, issues };
  }
  if (majorZonesMissing) {
    reasons.push('Most of the face is outside the frame');
    return { usability: 'retake_required', reasons, issues };
  }
  if (extremeExposure) {
    reasons.push('Lighting makes the photo unreadable');
    return { usability: 'retake_required', reasons, issues };
  }

  // LIMITED reasons — the photo is usable, just not pristine. Surface
  // soft notices but always show real findings.
  // Threshold relaxed from 0.7 → 0.5 so an ordinary phone selfie with
  // good but not studio-perfect confidence sits in `full_results`
  // instead of being penalized into `limited_results`.
  const moderateConfidence = input.rawConfidence < 0.5;
  const moderateBlur = input.issues.includes('blurry');
  const offAngle = input.issues.includes('angled');
  const unevenLighting =
    input.issues.includes('low_light') || input.issues.includes('harsh_light');
  const partialFace = input.issues.includes('partial_face');
  const occluded = input.issues.includes('occluded');

  const limitedSignals = [
    moderateBlur,
    offAngle,
    unevenLighting,
    partialFace,
    occluded,
    moderateConfidence,
  ].filter(Boolean).length;

  if (limitedSignals > 0) {
    if (moderateBlur) reasons.push('Photo is a little soft');
    if (offAngle) reasons.push('Face is slightly off-angle');
    if (unevenLighting) reasons.push('Lighting is uneven');
    if (partialFace) reasons.push('Part of the face is out of frame');
    if (occluded) reasons.push('Part of the face is covered');
    if (reasons.length === 0) {
      reasons.push('Some areas were harder to read');
    }
    return { usability: 'limited_results', reasons, issues };
  }

  // Full results — face clear, lighting clean, confidence strong.
  return { usability: 'full_results', reasons: [], issues };
}

// ---------------------------------------------------------------------------
// Quality.
// ---------------------------------------------------------------------------

const AI_ISSUE_TO_USER: Record<string, ScanQualityIssue> = {
  blurry: 'blur',
  low_light: 'low_light',
  angled: 'angle',
  partial_face: 'partial_face',
  occluded: 'obstruction',
};

function mapIssues(raw: ReadonlyArray<string>): ScanQualityIssue[] {
  const out: ScanQualityIssue[] = [];
  for (const r of raw) {
    const mapped = AI_ISSUE_TO_USER[r];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function buildQuality(
  scan: Scan,
  findingCount: number,
  supportedFindingCount: number
): ScanQuality {
  const aiQuality = scan.aiAnalysis?.image_quality;
  // When the AI returned analysis but no confidence number, default to
  // 0.7 (good enough to surface results) rather than 0.5. The old 0.5
  // default pushed every confidence-missing scan into `limited_results`
  // even when the AI considered it fine.
  const confidence = aiQuality?.confidence ?? (scan.aiAnalysis ? 0.7 : 0.4);
  const issues = aiQuality?.issues ?? [];
  // faceDetected is now lenient: if the AI returned analysis at all,
  // we treat that as evidence a face was visible. `face_overlay` being
  // stripped by the validator (one bad landmark fails the whole overlay)
  // should not cascade into "no face detected". A clean face with zero
  // findings is also legitimate — that's "no focus area", not "no face".
  const faceDetected = !!scan.aiAnalysis || findingCount > 0;

  const { usability, reasons, issues: mappedIssues } = classifyScanUsability({
    hasAnalysis: !!scan.aiAnalysis,
    faceDetected,
    rawConfidence: confidence,
    issues,
    findingCount,
    supportedFindingCount,
  });

  // v33 — diagnostic trace at the single classification point. This is
  // the one place the retake decision is made for the scan result, so
  // it is the single trace point future debug sessions can follow.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Pura Scan QA] classify usability', {
      scanId: scan.id,
      hasAnalysis: !!scan.aiAnalysis,
      hasFaceOverlay: !!scan.aiAnalysis?.face_overlay,
      faceDetected,
      rawConfidence: confidence,
      issues,
      findingCount,
      supportedFindingCount,
      usability,
      reasons,
    });
  }

  const userMessage =
    usability === 'retake_required'
      ? "Let's try another photo so we can map your skin clearly."
      : usability === 'limited_results'
        ? 'Some areas read clearly. Retake in even light for a fuller map.'
        : 'Visible areas analyzed clearly.';

  return {
    usability,
    status: usability,
    confidence,
    issues: mappedIssues,
    userMessage,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Findings.
//
// Truth-first translation:
//   • A finding is `present` only when the AI's severity AND marker
//     priority both clear the bar.
//   • A finding is `supportedByScan` only when the AI returned at least
//     one explicit region for it. We do NOT fall back to default zones.
//   • An under-eye dark-marks finding is reinterpreted as under-eye
//     fatigue ONLY if the AI tagged the under-eye region — never
//     invented when the region is unknown.
// ---------------------------------------------------------------------------

function translateFinding(
  raw: FaceConcernFinding,
  index: number
): VisibleFinding {
  const visualType = mapConcernToVisualType(raw.concern);
  const present =
    severityImpliesPresent(raw.severity) && raw.marker_priority > 0;

  const priority = resolveDisplayPriority({
    severity: raw.severity,
    markerPriority: raw.marker_priority,
  });

  const isUnderEyeDarkness =
    raw.concern === 'dark_marks' && raw.regions.includes('under_eyes');
  const resolvedType = isUnderEyeDarkness ? 'under_eye_fatigue' : visualType;

  const fromRegions =
    raw.regions.length > 0
      ? Array.from(new Set(raw.regions.flatMap(expandRegionToZones)))
      : [];

  // Under-eye darkness is the only special case where the AI's region
  // tag maps to a specific zone pair — but the AI MUST have tagged
  // under-eyes for this to fire. No invention.
  const finalZones: SemanticFaceZone[] = isUnderEyeDarkness
    ? (['under_eye_left', 'under_eye_right'] as SemanticFaceZone[])
    : fromRegions;

  // `supportedByScan` is strict: the AI must have given us an explicit
  // region to paint, AND the finding must be `present`. No defaults.
  const supportedByScan = present && finalZones.length > 0;

  const displayName = displayNameFor(resolvedType);
  const shortFinding = composeShortFinding(raw, resolvedType, finalZones);
  const recommendedDirection = composeDirection(raw, resolvedType);

  return {
    id: stableFindingId(raw, index),
    type: resolvedType,
    displayName,
    present,
    supportedByScan,
    confidence: clamp01(raw.confidence),
    priority,
    zones: finalZones,
    shortFinding,
    recommendedDirection,
  };
}

function stableFindingId(
  raw: FaceConcernFinding,
  index: number
): string {
  const regionTag = raw.regions[0] ?? 'general';
  return `finding_${raw.concern}_${regionTag}_${index}`;
}

function displayNameFor(type: VisibleFinding['type']): string {
  switch (type) {
    case 'texture':
      return 'Texture';
    case 'under_eye_fatigue':
      return 'Under-eyes';
    case 'breakouts':
      return 'Breakouts';
    case 'redness':
      return 'Redness';
    case 'dryness':
      return 'Dryness';
    case 'oil_balance':
      return 'Oil balance';
    case 'dark_marks':
      return 'Dark marks';
    case 'barrier_stress':
      return 'Barrier';
  }
}

const ZONE_PHRASES: Record<
  VisibleFinding['zones'][number],
  string
> = {
  forehead: 'forehead',
  t_zone: 'T-zone',
  nose: 'nose',
  left_cheek: 'left cheek',
  right_cheek: 'right cheek',
  under_eye_left: 'under your left eye',
  under_eye_right: 'under your right eye',
  chin: 'chin',
};

function describeZones(zones: VisibleFinding['zones']): string {
  if (zones.length === 0) return 'this area';
  if (zones.includes('under_eye_left') || zones.includes('under_eye_right')) {
    return 'under your eyes';
  }
  if (zones.includes('left_cheek') && zones.includes('right_cheek')) {
    return 'both cheeks';
  }
  if (zones.includes('forehead') && zones.includes('nose')) {
    return 'the T-zone';
  }
  return ZONE_PHRASES[zones[0]];
}

function composeShortFinding(
  raw: FaceConcernFinding,
  type: VisibleFinding['type'],
  zones: VisibleFinding['zones']
): string {
  if (raw.user_summary && raw.user_summary.length > 0) {
    return capitalize(trimTrailing(raw.user_summary, 140));
  }
  const where = describeZones(zones);
  switch (type) {
    case 'texture':
      return `Uneven texture appears most visible across ${where}.`;
    case 'under_eye_fatigue':
      return `Visible fatigue appears ${where}.`;
    case 'breakouts':
      return `Active-looking spots appear concentrated on ${where}.`;
    case 'redness':
      return `Visible redness appears on ${where}.`;
    case 'dryness':
      return `Dryness appears on ${where}.`;
    case 'oil_balance':
      return `Oil buildup appears across ${where}.`;
    case 'dark_marks':
      return `Some dark marks appear on ${where}.`;
    case 'barrier_stress':
      return `Slight reactivity appears on ${where}.`;
  }
}

function composeDirection(
  raw: FaceConcernFinding,
  type: VisibleFinding['type']
): string {
  if (raw.clinician_style_summary && raw.clinician_style_summary.length > 0) {
    return capitalize(trimTrailing(raw.clinician_style_summary, 120));
  }
  switch (type) {
    case 'texture':
      return 'A gentle smoothing step may help.';
    case 'under_eye_fatigue':
      return 'Gentle hydration is the better lever than aggressive treatment.';
    case 'breakouts':
      return 'Keep stronger treatment targeted rather than spreading it across calm areas.';
    case 'redness':
      return 'Calm, simple care while reactivity settles.';
    case 'dryness':
      return 'Strengthen hydration before adding actives.';
    case 'oil_balance':
      return 'Lightweight, balancing care may help most.';
    case 'dark_marks':
      return 'Consistent SPF and gentle brightening can help.';
    case 'barrier_stress':
      return 'Prioritize gentle, fragrance-free care for a few days.';
  }
}

// ---------------------------------------------------------------------------
// Summary.
// ---------------------------------------------------------------------------

function translateSummary(
  visibleFindings: VisibleFinding[],
  possibleFindings: VisibleFinding[],
  ai?: FaceScanAnalysis
): ScanSummary {
  const count = visibleFindings.length;
  if (count === 0) {
    // Differentiate "truly nothing" from "we noticed something but the
    // photo isn't clear enough to map it." The harsher "Nothing specific
    // stood out." line was eroding user trust on faces with visible mild
    // signals.
    if (possibleFindings.length > 0) {
      return {
        focusAreaCount: 0,
        headline: 'A clearer scan may reveal more.',
        supportingText:
          'We noticed possible visible changes, but this photo is not clear enough to map them confidently.',
      };
    }
    return {
      focusAreaCount: 0,
      headline: 'No visible focus area was identified.',
      supportingText:
        'Pura could not confidently identify a visible signal to highlight from this photo.',
    };
  }
  const headline =
    count === 1
      ? '1 focus area supported'
      : `${count} focus areas supported`;
  const supportingText = ai?.skin_score.why_line
    ? capitalize(trimTrailing(ai.skin_score.why_line, 110))
    : 'Here are the areas Pura saw most clearly.';
  return {
    focusAreaCount: count,
    headline,
    supportingText,
  };
}

// ---------------------------------------------------------------------------
// Insights — derived from supported findings only.
//
// Truth-first: when there are no supported findings, `insights` is `[]`.
// The UI is responsible for choosing not to render the insights slide
// in that state; the translator never manufactures generic advice.
// ---------------------------------------------------------------------------

function translateInsights(
  visibleFindings: VisibleFinding[]
): ScanInsight[] {
  if (visibleFindings.length === 0) return [];

  const insights: ScanInsight[] = [];

  const treatFindings = visibleFindings.filter((f) =>
    ['breakouts', 'texture'].includes(f.type),
  );
  if (treatFindings.length > 0) {
    const primary = treatFindings[0];
    insights.push({
      title: 'Focus treatment',
      text: `Your visible ${primary.displayName.toLowerCase()} appears concentrated in a specific area — keep stronger treatment targeted rather than spreading it across calm skin.`,
      relatedFindingIds: treatFindings.map((f) => f.id),
    });
  }

  const gentleFindings = visibleFindings.filter((f) =>
    ['redness', 'barrier_stress', 'dryness'].includes(f.type),
  );
  if (gentleFindings.length > 0) {
    const names = humanList(
      gentleFindings.map((f) => f.displayName.toLowerCase()),
    );
    insights.push({
      title: 'Keep support simple',
      text: `Prioritize gentle hydration while ${names} settle${
        gentleFindings.length === 1 ? 's' : ''
      }.`,
      relatedFindingIds: gentleFindings.map((f) => f.id),
    });
  }

  const slowFindings = visibleFindings.filter((f) =>
    ['under_eye_fatigue', 'dark_marks', 'oil_balance'].includes(f.type),
  );
  if (slowFindings.length > 0) {
    const primary = slowFindings[0];
    insights.push({
      title:
        primary.type === 'under_eye_fatigue'
          ? 'Support the under-eye area'
          : 'Build consistency',
      text:
        primary.type === 'under_eye_fatigue'
          ? 'Visible fatigue appears beneath your eyes. Prioritize gentle hydration rather than aggressive treatment.'
          : `${capitalize(primary.displayName.toLowerCase())} responds to small, repeatable steps — not aggressive ones.`,
      relatedFindingIds: slowFindings.map((f) => f.id),
    });
  }

  return insights.slice(0, 3);
}

function humanList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/**
 * Build a `ScanAnalysisResponse` from a persisted `Scan`.
 *
 * Strict translation:
 *   • Findings come from `scan.aiAnalysis.findings` only — no
 *     deterministic synthesis from `scan.concerns`.
 *   • Insights only exist when at least one supported finding exists.
 *   • Routine eligibility requires a usability that isn't
 *     `retake_required` AND at least one supported finding.
 */
export function translateScanToAnalysis(scan: Scan): ScanAnalysisResponse {
  const aiFindings = scan.aiAnalysis?.findings ?? [];
  const allFindings = aiFindings.map(translateFinding);

  // Deduplicate by visual type, keeping the strongest entry per type.
  const byType = new Map<string, VisibleFinding>();
  for (const f of allFindings) {
    const existing = byType.get(f.type);
    if (!existing) {
      byType.set(f.type, f);
      continue;
    }
    const newer =
      priorityWeight(f.priority) * 1000 + f.confidence * 100 >
      priorityWeight(existing.priority) * 1000 + existing.confidence * 100
        ? f
        : existing;
    byType.set(f.type, newer);
  }

  const findings = Array.from(byType.values()).sort(
    (a, b) =>
      priorityWeight(b.priority) - priorityWeight(a.priority) ||
      b.confidence - a.confidence
  );

  const visibleFindings = findings.filter(
    (f) =>
      f.present &&
      f.supportedByScan &&
      f.confidence >= MINIMUM_DISPLAY_THRESHOLD
  );

  // Findings in the "possible" band (0.38–0.52) are not displayed as
  // confirmed signals but they DO change the messaging: instead of
  // claiming the scan saw nothing, the UI says "A clearer scan may
  // reveal more." This separates honest uncertainty from a confidently
  // clean face.
  const possibleFindings = findings.filter(
    (f) =>
      f.present &&
      f.supportedByScan &&
      f.confidence >= POSSIBLE_DISPLAY_THRESHOLD &&
      f.confidence < MINIMUM_DISPLAY_THRESHOLD
  );

  const quality = buildQuality(
    scan,
    findings.length,
    visibleFindings.length
  );

  const summary = translateSummary(
    visibleFindings,
    possibleFindings,
    scan.aiAnalysis
  );
  const insights = translateInsights(visibleFindings);

  // Routine eligibility — strict:
  //   • Must have a usability we trust (not retake_required).
  //   • Must have at least one supported, present, above-threshold finding.
  //     Possible-only findings (0.38–0.52) do NOT unlock a routine —
  //     they trigger the softer "clearer scan may reveal more" state.
  // If either is missing, routine generation is blocked. The UI must NOT
  // override this.
  const routineEligibility =
    quality.usability === 'retake_required'
      ? {
          allowed: false,
          reason: 'A clearer scan unlocks a personalized routine.',
        }
      : visibleFindings.length === 0
        ? {
            allowed: false,
            reason:
              possibleFindings.length > 0
                ? 'Take a clearer scan to confirm visible signals before building a routine.'
                : 'No visible focus area was identified from this photo.',
          }
        : { allowed: true };

  return {
    serviceStatus: 'success',
    scanId: scan.id,
    scanQuality: quality,
    findings,
    summary,
    insights,
    routineEligibility,
  };
}

// ---------------------------------------------------------------------------
// Selectors — the single way the UI reads findings/insights/eligibility.
// ---------------------------------------------------------------------------

/**
 * Filter to the findings the UI is allowed to render.
 *
 * Strict rule: present AND supportedByScan AND confidence >= the
 * display threshold. No rescue path, no severity overrides — if the AI
 * was not confident, we do not surface it.
 */
export function selectVisibleFindings(
  response: ScanAnalysisResponse
): VisibleFinding[] {
  return response.findings.filter(
    (f) =>
      f.present &&
      f.supportedByScan &&
      f.confidence >= MINIMUM_DISPLAY_THRESHOLD
  );
}

/**
 * Findings whose confidence falls in the `possible` band (0.38–0.52):
 * something the AI saw but isn't confident enough to map. The UI MUST
 * NOT render these as confirmed signals or overlays — they only change
 * the conclusion-state copy from "no visible focus area" to "a clearer
 * scan may reveal more."
 */
export function selectPossibleFindings(
  response: ScanAnalysisResponse
): VisibleFinding[] {
  return response.findings.filter(
    (f) =>
      f.present &&
      f.supportedByScan &&
      f.confidence >= POSSIBLE_DISPLAY_THRESHOLD &&
      f.confidence < MINIMUM_DISPLAY_THRESHOLD
  );
}

/**
 * Three possible no-findings stances:
 *   • `'has_visible'`  — at least one supported finding exists.
 *   • `'possible_only'` — possible findings exist but none cleared the
 *                         supported threshold.
 *   • `'none'`          — neither supported nor possible findings.
 *
 * Used by the conclusion screen to pick the right empty-state copy.
 *
 * Defensive: retake-required scans never surface "possible" copy — they
 * own their own messaging via `RetakeRequiredScreen`. Without this
 * gate, a caller other than `ScanResultsFaceScreen` could surface the
 * "A clearer scan may reveal more" line on a scan that should be on
 * the hard-retake path.
 */
export function classifyFindingsPresence(
  response: ScanAnalysisResponse
): 'has_visible' | 'possible_only' | 'none' {
  if (response.scanQuality.usability === 'retake_required') return 'none';
  const visible = selectVisibleFindings(response);
  if (visible.length > 0) return 'has_visible';
  const possible = selectPossibleFindings(response);
  if (possible.length > 0) return 'possible_only';
  return 'none';
}

/**
 * Filter insights to those whose related findings are still supported
 * after the visible-findings filter.
 */
export function selectSupportedInsights(
  response: ScanAnalysisResponse,
  visibleFindings: VisibleFinding[]
): ScanInsight[] {
  if (visibleFindings.length === 0) return [];
  const supportedIds = new Set(visibleFindings.map((f) => f.id));
  return response.insights.filter((insight) =>
    insight.relatedFindingIds.some((id) => supportedIds.has(id))
  );
}

/**
 * Single canonical predicate for whether the user is allowed to enter
 * the Routine builder from this scan. The UI must call this — never
 * read `routineEligibility.allowed` directly — so that the gate
 * matches the truth contract end-to-end.
 */
export function canGenerateRoutineFromScan(
  response: ScanAnalysisResponse,
  visibleFindings: VisibleFinding[]
): boolean {
  if (response.scanQuality.usability === 'retake_required') return false;
  if (visibleFindings.length === 0) return false;
  return response.routineEligibility.allowed === true;
}

/**
 * Convenience predicate — `false` when the screen should NOT render
 * the results slideshow at all (retake-required path).
 */
export function isResultsPagerEligible(
  response: ScanAnalysisResponse
): boolean {
  return response.scanQuality.usability !== 'retake_required';
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function trimTrailing(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + '…';
}
