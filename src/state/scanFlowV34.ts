/**
 * scanFlowV34 — canonical reader + state machine for the v34 scan-to-
 * routine pipeline.
 *
 * The principle: screens read from this module. They never touch the
 * raw AI payload (`ScanResultV2.overlays`, `routine_seed`, etc.) — they
 * read a stable view-model that is safe even when the AI omits a field
 * or returns a slightly-degraded shape. This is the contract layer the
 * brief asked for: "stabilize the data contracts before rebuilding UI."
 *
 * Why a separate module:
 *   • Keeps deterministic mapping (severity → priority, concern →
 *     display name, etc.) in one place.
 *   • Lets every screen render the SAME information consistently.
 *   • Lets failures degrade gracefully — no `undefined` access in UI.
 */

import type { Scan } from '@/types';
import type {
  ConcernId,
  RoutineSeedV2,
  ScanFindingV2,
  ScanInsightV2,
  ScanQualityV2,
  ScanResultV2,
  ZoneId,
  ZoneOverlayV2,
  SeverityLevel,
} from '@/types/scanResultV2';
import {
  CONCERN_LABEL,
  ZONE_LABEL,
} from '@/types/scanResultV2';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type ScanFlowState =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'analyzing'
  | 'analysis_ready'
  | 'limited_results'
  | 'results_skin_map'
  | 'results_focus_areas'
  | 'results_insights'
  | 'building_routine'
  | 'routine_ready'
  | 'routine_view';

export const SCAN_FLOW_ORDER: ScanFlowState[] = [
  'idle',
  'capturing',
  'uploading',
  'analyzing',
  'analysis_ready',
  'limited_results',
  'results_skin_map',
  'results_focus_areas',
  'results_insights',
  'building_routine',
  'routine_ready',
  'routine_view',
];

export function nextScanFlowState(
  current: ScanFlowState,
  limited: boolean,
): ScanFlowState {
  switch (current) {
    case 'idle':
      return 'capturing';
    case 'capturing':
      return 'uploading';
    case 'uploading':
      return 'analyzing';
    case 'analyzing':
      return limited ? 'limited_results' : 'results_skin_map';
    case 'limited_results':
      return 'results_skin_map';
    case 'analysis_ready':
      return 'results_skin_map';
    case 'results_skin_map':
      return 'results_focus_areas';
    case 'results_focus_areas':
      return 'results_insights';
    case 'results_insights':
      return 'building_routine';
    case 'building_routine':
      return 'routine_ready';
    case 'routine_ready':
      return 'routine_view';
    case 'routine_view':
      return 'routine_view';
  }
}

// ---------------------------------------------------------------------------
// View model — what every screen reads.
// ---------------------------------------------------------------------------

export interface ScanFlowOverlay {
  /** Stable identity (zone + concern). */
  key: string;
  zone: ZoneId;
  concern: ConcernId;
  style: ZoneOverlayV2['style'];
  opacity: number;
  findingId: string;
}

export interface ScanFlowFinding {
  id: string;
  zone: ZoneId;
  zoneLabel: string;
  concern: ConcernId;
  concernLabel: string;
  severity: SeverityLevel;
  severityLabel: 'Mild' | 'Moderate' | 'Pronounced';
  priority: 'high' | 'medium' | 'low';
  title: string;
  observation: string;
  recommendation: string;
  ingredientHints: string[];
  confidence: number;
  /** True when this finding is in the AI-supplied top-focus list. */
  isPrimaryFocus: boolean;
}

export interface ScanFlowInsight {
  id: string;
  title: string;
  body: string;
  icon: ScanInsightV2['icon'];
  relatedFindingIds: string[];
}

export interface ScanFlowRoutineSeed {
  skinNeeds: string[];
  avoidTonight: string[];
  recommendedStepTypes: Array<'cleanse' | 'treat' | 'moisturize' | 'protect'>;
  intensity: 'gentle' | 'moderate' | 'active';
  stepTaglines: RoutineSeedV2['step_taglines'];
}

export interface ScanFlowQuality {
  usable: boolean;
  mode: 'full' | 'limited';
  score: number;
  reasons: string[];
  /** Convenience: is the flow allowed to proceed without retake? */
  proceedAllowed: boolean;
  /** Convenience: should the UI show the limited-scan banner? */
  showLimitedBanner: boolean;
}

export interface ScanFlowViewModel {
  scanId: string;
  photoUri: string;
  overallScore: number;
  headline: string;
  summary: string;
  scoreBreakdown: ScanResultV2['score_breakdown'];
  findings: ScanFlowFinding[];
  topFocusAreas: ScanFlowFinding[];
  overlays: ScanFlowOverlay[];
  insights: ScanFlowInsight[];
  routineSeed: ScanFlowRoutineSeed;
  quality: ScanFlowQuality;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function severityLabel(s: SeverityLevel): 'Mild' | 'Moderate' | 'Pronounced' {
  if (s >= 4) return 'Pronounced';
  if (s === 3) return 'Moderate';
  return 'Mild';
}

function severityPriority(s: SeverityLevel): 'high' | 'medium' | 'low' {
  if (s >= 4) return 'high';
  if (s === 3) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Routine seed defaults — used when the AI omits the seed entirely.
// ---------------------------------------------------------------------------

function defaultRoutineSeed(
  findings: ScanFindingV2[],
): ScanFlowRoutineSeed {
  const concerns = new Set(findings.map((f) => f.concern));
  const hasIrritation =
    concerns.has('redness') || concerns.has('dryness') || concerns.has('blemishes');
  const intensity: ScanFlowRoutineSeed['intensity'] = hasIrritation
    ? 'gentle'
    : findings.some((f) => f.severity >= 3)
    ? 'moderate'
    : 'gentle';
  return {
    skinNeeds: ['gentle baseline', 'light hydration'],
    avoidTonight: hasIrritation ? ['harsh actives', 'physical scrubs'] : [],
    recommendedStepTypes: ['cleanse', 'moisturize', 'protect'],
    intensity,
    stepTaglines: {
      cleanse: 'Gentle daily reset to keep your barrier intact.',
      treat: 'Lightweight targeted support where it counts.',
      moisturize: 'Hydration matched to your skin barrier.',
      protect: 'Daily SPF — your long-term ally.',
    },
  };
}

function defaultOverlays(findings: ScanFindingV2[]): ScanFlowOverlay[] {
  // Synthesize overlays from findings when the AI omitted them.
  // Restraint: only the top 3 highest-severity findings get overlays.
  return [...findings]
    .sort(
      (a, b) =>
        b.severity - a.severity ||
        (b.confidence ?? 0.6) - (a.confidence ?? 0.6),
    )
    .slice(0, 3)
    .map<ScanFlowOverlay>((f, i) => ({
      key: `${f.zone}:${f.concern}:${i}`,
      zone: f.zone,
      concern: f.concern,
      style: 'soft_mask',
      opacity: f.severity >= 4 ? 0.3 : f.severity === 3 ? 0.22 : 0.16,
      findingId: f.id,
    }));
}

function defaultInsights(findings: ScanFindingV2[]): ScanFlowInsight[] {
  // Synthesize two calm insights from the findings when AI omitted them.
  const out: ScanFlowInsight[] = [];
  if (findings.some((f) => f.concern === 'dryness' || f.concern === 'fine_lines')) {
    out.push({
      id: 'default-insight-hydration',
      title: 'Light hydration',
      body: 'A lightweight humectant under your moisturizer keeps the skin looking rested.',
      icon: 'hydration',
      relatedFindingIds: [],
    });
  }
  if (findings.some((f) => f.concern === 'redness' || f.concern === 'blemishes')) {
    out.push({
      id: 'default-insight-gentle',
      title: 'Gentle pace',
      body: 'Skip harsh actives tonight — calm and consistent makes the biggest difference here.',
      icon: 'gentle',
      relatedFindingIds: [],
    });
  }
  if (out.length < 2) {
    out.push({
      id: 'default-insight-consistency',
      title: 'Gentle consistency',
      body: 'Small daily steps will hold this baseline better than aggressive treatments.',
      icon: 'consistency',
      relatedFindingIds: [],
    });
  }
  if (out.length < 2) {
    out.push({
      id: 'default-insight-protection',
      title: 'Daily protection',
      body: "A daily SPF protects the tone and clarity your skin already shows.",
      icon: 'protection',
      relatedFindingIds: [],
    });
  }
  return out.slice(0, 3);
}

function defaultQuality(v2: ScanResultV2): ScanFlowQuality {
  return {
    usable: true,
    mode: 'full',
    score: 0.82,
    reasons: [],
    proceedAllowed: true,
    showLimitedBanner: false,
  };
}

// ---------------------------------------------------------------------------
// Public selector — builds the canonical view model from a Scan.
// ---------------------------------------------------------------------------

export function buildScanFlowViewModel(scan: Scan): ScanFlowViewModel | null {
  const v2 = scan.v2Analysis;
  if (!v2) return null;

  const findingMap = new Map<string, ScanFindingV2>();
  for (const f of v2.findings) findingMap.set(f.id, f);

  const focusIds = v2.top_focus_priority ?? [];
  const focusSet = new Set(focusIds);

  const findings: ScanFlowFinding[] = v2.findings.map((f) => ({
    id: f.id,
    zone: f.zone,
    zoneLabel: ZONE_LABEL[f.zone],
    concern: f.concern,
    concernLabel: CONCERN_LABEL[f.concern],
    severity: f.severity,
    severityLabel: severityLabel(f.severity),
    priority: severityPriority(f.severity),
    title: f.title,
    observation: f.observation,
    recommendation: f.recommendation,
    ingredientHints: f.ingredient_hints,
    confidence: f.confidence ?? 0.7,
    isPrimaryFocus: focusSet.has(f.id),
  }));

  // Top focus area order: use the AI's explicit priority list when
  // present; fall back to severity × confidence.
  const topFocusAreas: ScanFlowFinding[] = focusIds.length
    ? focusIds
        .map((id) => findings.find((f) => f.id === id))
        .filter((f): f is ScanFlowFinding => f !== undefined)
        .slice(0, 4)
    : [...findings]
        .sort(
          (a, b) =>
            b.severity - a.severity || b.confidence - a.confidence,
        )
        .slice(0, 3);

  const aiOverlays = v2.overlays ?? [];
  const overlays: ScanFlowOverlay[] = aiOverlays.length
    ? aiOverlays.map<ScanFlowOverlay>((o, i) => ({
        key: `${o.zone}:${o.concern}:${i}`,
        zone: o.zone,
        concern: o.concern,
        style: o.style,
        opacity: o.opacity,
        findingId: o.findingId,
      }))
    : defaultOverlays(v2.findings);

  const aiInsights = v2.insights ?? [];
  const insights: ScanFlowInsight[] = aiInsights.length
    ? aiInsights.map((i) => ({
        id: i.id,
        title: i.title,
        body: i.body,
        icon: i.icon,
        relatedFindingIds: i.related_finding_ids,
      }))
    : defaultInsights(v2.findings);

  const seed = v2.routine_seed
    ? {
        skinNeeds: v2.routine_seed.skin_needs,
        avoidTonight: v2.routine_seed.avoid_tonight,
        recommendedStepTypes: v2.routine_seed.recommended_step_types,
        intensity: v2.routine_seed.intensity,
        stepTaglines: v2.routine_seed.step_taglines,
      }
    : defaultRoutineSeed(v2.findings);

  const q = v2.quality;
  const quality: ScanFlowQuality = q
    ? {
        usable: q.usable,
        mode: q.mode,
        score: q.score,
        reasons: q.reasons,
        proceedAllowed: q.usable,
        showLimitedBanner: q.mode === 'limited',
      }
    : defaultQuality(v2);

  return {
    scanId: scan.id,
    photoUri: scan.photoUri,
    overallScore: v2.overall_score,
    headline: v2.headline,
    summary: v2.summary,
    scoreBreakdown: v2.score_breakdown,
    findings,
    topFocusAreas,
    overlays,
    insights,
    routineSeed: seed,
    quality,
  };
}

// ---------------------------------------------------------------------------
// Routine-build sub-status copy derived from the scan.
//
// Replaces the hardcoded "Selecting step / Finding the best match /
// Checking compatibility" with scan-derived sentences so the routine
// generation screen reflects the real scan.
// ---------------------------------------------------------------------------

export interface RoutineSubStatusCopy {
  selecting: string;
  matching: string;
  checking: string;
}

export function deriveRoutineSubStatus(
  step: 'cleanse' | 'treat' | 'moisturize' | 'protect',
  vm: ScanFlowViewModel,
): RoutineSubStatusCopy {
  const intensity = vm.routineSeed.intensity;
  const avoiding = vm.routineSeed.avoidTonight.length > 0;
  const primary = vm.topFocusAreas[0];
  const concernPhrase = primary
    ? primary.concernLabel.toLowerCase()
    : 'your scan';

  switch (step) {
    case 'cleanse':
      return {
        selecting: avoiding
          ? `Choosing a gentle cleanser — avoiding ${vm.routineSeed.avoidTonight[0]}.`
          : `Choosing a cleanser matched to ${concernPhrase}.`,
        matching:
          intensity === 'gentle'
            ? 'Matching a cream cleanser that supports your barrier.'
            : 'Matching a balanced daily cleanser for your skin.',
        checking: 'Confirming pH balance + ingredient compatibility.',
      };
    case 'treat':
      return {
        selecting: primary
          ? `Targeting ${primary.concernLabel.toLowerCase()} on the ${primary.zoneLabel.toLowerCase()}.`
          : 'Selecting a targeted treatment from your scan.',
        matching:
          intensity === 'gentle'
            ? 'Matching a gentle, well-tolerated active.'
            : intensity === 'active'
            ? 'Matching a high-efficacy treatment for your scan.'
            : 'Matching a treatment calibrated to your scan.',
        checking: avoiding
          ? `Skipping ${vm.routineSeed.avoidTonight[0]} to protect your barrier.`
          : 'Checking for irritation or layering conflicts.',
      };
    case 'moisturize':
      return {
        selecting: vm.routineSeed.skinNeeds.includes('barrier support')
          ? 'Selecting a barrier-supporting moisturizer.'
          : 'Selecting a moisturizer matched to your skin.',
        matching: 'Matching a lightweight ceramide-led formula.',
        checking: 'Confirming a calm, fragrance-free option.',
      };
    case 'protect':
      return {
        selecting: 'Selecting a daily SPF that wears well under makeup.',
        matching: 'Matching a broad-spectrum SPF 30+ for daily use.',
        checking: 'Confirming a finish that suits your skin texture.',
      };
  }
}
