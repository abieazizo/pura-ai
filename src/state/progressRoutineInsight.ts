/**
 * Progress / Routine insight adapter.
 *
 * Single source of truth shared by the Progress and Routine sub-tabs.
 * Consumes the existing canonical selectors (`selectSkinState`,
 * `selectUserProfileContext`) plus a few transient store fields
 * (`aiRoutine`, `aiTopMatches`, `liveProductsById`) and returns the
 * shape the new screen components render. The contract is the one
 * specified in the v22 product-intervention prompt:
 *
 *   â€¢ Progress shows diagnosis (score, read, metrics, before/after,
 *     timeline) â€” derived from `insight`
 *   â€¢ Routine shows the same `insight.bestMove` and `insight.statusLabel`
 *     so the two screens cannot tell different stories
 *
 * This file is pure. No React. No async. No store reads outside of the
 * single `useProgressRoutineInsight` hook at the bottom. All raw inputs
 * come in as arguments, all outputs are plain objects. Easy to unit-test,
 * easy to mock, easy to reason about.
 *
 * Confidence-aware: when `imageQuality.confidence < 0.7` the adapter
 * downgrades metric copy and may hide `bestMove`. The UI must trust the
 * adapter's `confidenceCaveat` over its own assumptions.
 */

import type { LiveProductCandidate, ProductMatch } from '@/ai/ai-contracts';
import type { Concern, Scan } from '@/types';
import type { SkinState, UserProfileContext } from '@/types/canonical';
import { selectSkinState, selectUserProfileContext } from '@/state/canonical';
import { CATEGORY_LABEL, getConcerns } from '@/utils/concerns';
import { computeSkinScore, deltaPhrase, tierLabel } from '@/utils/skinScore';
import { useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';

// ============================================================================
// Contract â€” exactly what the screen components consume.
// ============================================================================

/** Human-readable status pill state, never raw enum / dev jargon. */
export type StatusLabel =
  | 'Updated today'
  | 'AI read ready'
  | 'Analyzing'
  | 'Scan needed'
  | 'Low confidence';

export type MetricStatus = 'Improved' | 'Needs support' | 'Stable';

export type ChipTone = 'good' | 'warning' | 'neutral';

export interface InsightChip {
  label: string;
  tone: ChipTone;
}

export interface InsightMetric {
  /** Concern label, plain English. */
  label: string;
  /** Previous score (0..100). Omitted when no previous reading exists. */
  from?: number;
  /** Current score (0..100). Omitted when we cannot verify direction. */
  to?: number;
  status: MetricStatus;
  /** One sentence that NEVER contradicts the fromâ†’to direction. */
  interpretation: string;
}

export interface InsightBestMove {
  /** "Add hydration tonight" â€” imperative, â‰¤ 6 words. */
  title: string;
  /** One sentence rationale grounded in the latest scan. */
  body: string;
  /** Product category to add (drives the CTA destination). */
  category: string | null;
  /** Button label, e.g. "Add to evening routine" / "View matched serums". */
  ctaLabel: string;
  /** When non-null, tapping the primary CTA writes this id into the
   *  user's routine. When null, the CTA opens the Products filter view. */
  resolvedProductId: string | null;
  /** Slot the recommendation belongs in. */
  slot: 'morning' | 'evening' | 'saved';
}

export interface InsightComparison {
  beforeUri?: string;
  afterUri?: string;
  /** â‰¤ 12-word interpretation of the comparison, or the empty-state hint. */
  caption: string;
  /** True only when BOTH photos exist and are non-empty. */
  canShowImages: boolean;
}

export interface InsightTimelineItem {
  dayLabel: string;
  score?: number;
  imageUri?: string;
  /** Status word: "Baseline" / "Stable" / "Improved" / "Needs support" etc. */
  statusLabel: string;
  /** Tone for the status pill, derived from statusLabel. */
  statusTone: 'good' | 'warning' | 'neutral';
  /** 2-5 word per-scan insight. */
  insightLabel: string;
  /** Stable scan id so the section can key + handle tap actions safely. */
  scanId: string;
}

export interface InsightTrendSummary {
  /**
   *   no-data    â€” zero scans recorded
   *   first-scan â€” exactly one scan recorded (line cannot draw yet)
   *   improving  â€” net positive vs day 1
   *   sliding    â€” net negative vs day 1
   *   holding    â€” flat vs day 1 (delta within Â±1)
   */
  direction: 'no-data' | 'first-scan' | 'improving' | 'holding' | 'sliding';
  /** Integer delta vs the day-1 baseline. 0 when there's no baseline. */
  deltaSinceFirst: number;
  /** Whether a chart should render. False for no-data and first-scan. */
  hasChart: boolean;
  /** Series of overall scores, oldest â†’ newest. Drives the chart consumers. */
  points: number[];
  /** Day-1 score, or null when no scan. */
  baselineScore: number | null;
  /** Latest score, or null when no scan. */
  latestScore: number | null;
  /**
   * Ready-to-render interpretation sentence. ALWAYS populated â€” the
   * trend section consumes this directly so no consumer reinvents copy.
   * Examples:
   *   â€¢ "Take your first scan to start tracking your score."
   *   â€¢ "Your trend will appear after one more scan."
   *   â€¢ "Your score has stayed steady, with a small lift after your latest scan."
   *   â€¢ "Up 6 points across 4 scans since day 1."
   */
  summaryLine: string;
}

export interface ProgressRoutineInsight {
  /** True when the user has at least one scan. */
  hasScanned: boolean;
  /** True when there's â‰¥ 2 scans (unlocks comparison + trend). */
  canCompare: boolean;

  /** Skin score 0..100, or null when no scan. */
  score: number | null;
  /** "Poor" / "Fair" / "Good" / "Strong" â€” already capitalised for UI. */
  scoreBand: string;
  /** "+1 since last scan", "Same as last scan", "First scan", or null. */
  deltaLabel: string | null;

  /** "Day 13" or "Begin here" â€” already capitalised for UI. */
  dayLabel: string;
  /** "Latest scan updated today" / "Last scan 4 days ago" / "" */
  freshnessLabel: string;
  /** Production status pill text. */
  statusLabel: StatusLabel;
  /** Optional one-line subline shown under the pill, e.g. when Analyzing. */
  statusSubline: string | null;

  /** One sentence that frames the score: "Texture improved. Redness needs support." */
  heroReason: string;
  /** 1-2 sentence summary for Today's Skin Read. */
  skinReadSummary: string;
  /** Up to 3 evidence chips for Today's Skin Read. */
  chips: InsightChip[];

  /** The single best action for today â€” null when no scan or low confidence. */
  bestMove: InsightBestMove | null;

  /** 3-4 metric cards (vertical list, never grid). */
  metrics: InsightMetric[];

  /** Before/After source-of-truth â€” components must not duplicate this logic. */
  comparison: InsightComparison;

  /** Trend across history. Always non-null so the trend section never has
   *  to invent its own state machine â€” empty / single-scan / multi-scan are
   *  all explicit branches with ready-to-render copy. */
  trendSummary: InsightTrendSummary;

  /** Up to 8 history items, newest last (chronological). */
  timeline: InsightTimelineItem[];

  /** True when we should hide / soften the AI prose. */
  confidenceCaveat: boolean;
  /** Long AI notes for the collapsed disclosure (or null when nothing to add). */
  fullAINotes: string | null;
}

// ============================================================================
// Status pill resolution.
// ============================================================================

/** ISO-time delta in hours. */
function hoursSince(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 36e5;
}

function resolveStatus(
  hasScanned: boolean,
  latestScan: Scan | undefined,
  analyzing: boolean,
  lowConfidence: boolean
): { label: StatusLabel; subline: string | null } {
  if (analyzing) {
    return {
      label: 'Analyzing',
      subline: 'Reviewing your latest scan.',
    };
  }
  if (!hasScanned || !latestScan) {
    return { label: 'Scan needed', subline: null };
  }
  if (lowConfidence) {
    return {
      label: 'Low confidence',
      subline: 'Retake in better light for a sharper read.',
    };
  }
  const age = hoursSince(latestScan.capturedAt);
  if (age !== null && age < 24) {
    return { label: 'Updated today', subline: null };
  }
  return { label: 'AI read ready', subline: null };
}

// ============================================================================
// Day + freshness phrasing.
// ============================================================================

function dayLabelFor(scans: Scan[]): { dayLabel: string; freshnessLabel: string } {
  if (scans.length === 0) {
    return { dayLabel: 'BEGIN HERE', freshnessLabel: 'No scan yet · Start your first skin read' };
  }
  const first = scans[0];
  const latest = scans[scans.length - 1];
  // Pura's own dayNumber lives on the scan; trust it as the canonical value.
  const day = latest.dayNumber || daysBetween(first.capturedAt, latest.capturedAt) + 1;
  const ageH = hoursSince(latest.capturedAt) ?? 0;
  const freshnessLabel =
    ageH < 24
      ? `Day ${day} · Latest scan updated today`
      : ageH < 48
      ? `Day ${day} · Last scan yesterday`
      : ageH < 24 * 7
      ? `Day ${day} · Last scan ${Math.floor(ageH / 24)} days ago`
      : `Day ${day} · Last scan over a week ago`;
  return { dayLabel: `DAY ${day}`, freshnessLabel };
}

function daysBetween(a: string, b: string): number {
  const t1 = Date.parse(a);
  const t2 = Date.parse(b);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.max(0, Math.floor((t2 - t1) / 86_400_000));
}

// ============================================================================
// Hero score + delta phrasing.
// ============================================================================

function bandToHuman(b: SkinState['scoreBand']): string {
  switch (b) {
    case 'great':
      return 'Strong';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'poor':
      return 'Needs work';
  }
}

function buildDeltaLabel(skin: SkinState | null): string | null {
  if (!skin) return null;
  // computeSkinScore-shaped delta phrasing â€” keeps the rest of the app aligned.
  return deltaPhrase(skin.scoreDelta);
}

// ============================================================================
// Hero reason + Today's Skin Read.
// ============================================================================

/** Pick 1 improved + 1 needs-support concern to build a 1-line frame. */
function buildHeroReason(skin: SkinState | null, concerns: Concern[]): string {
  if (!skin) return 'Take your first scan to see your skin read.';

  // Prefer AI-derived direction; fall back to deterministic concerns.
  const improved = skin.topConcerns.find((c) => c.direction === 'better');
  const worsened = skin.topConcerns.find(
    (c) => c.direction === 'worse' || c.direction === 'new'
  );

  if (improved && worsened) {
    return `${labelFor(improved.concern)} improved. ${labelFor(
      worsened.concern
    )} needs support.`;
  }
  if (improved) {
    return `${labelFor(improved.concern)} is your clearest improvement.`;
  }
  if (worsened) {
    return `${labelFor(worsened.concern)} needs support today.`;
  }
  // First-scan / steady fallback â€” use the strongest deterministic concern.
  const nonCalm = concerns.find((c) => c.severity !== 'calm');
  if (nonCalm) {
    return `${CATEGORY_LABEL[nonCalm.category]} is the area to watch.`;
  }
  return 'Skin reads steady across every area today.';
}

function buildSkinReadSummary(skin: SkinState | null): string {
  if (!skin) {
    return 'Your AI skin read will land here after your first scan.';
  }
  // v23.1 — prefer the deterministic synthesis over raw AI prose. The
  // AI's `summaryBody` historically produced grammar defects like "The
  // cheeks is reading slightly low." Synthesising from `topConcerns`
  // guarantees clean grammar grounded in the same data.
  const parts: string[] = [];
  for (const c of skin.topConcerns.slice(0, 2)) {
    const label = labelFor(c.concern);
    if (c.direction === 'better') {
      parts.push(`${label} is improving.`);
    } else if (c.direction === 'worse' || c.direction === 'new') {
      parts.push(`${label} needs support.`);
    } else {
      parts.push(`${label} is holding steady.`);
    }
  }
  if (parts.length > 0) return parts.join(' ');
  // Only when the deterministic path has nothing to say, fall back to
  // the AI body if it's short enough.
  const body = skin.summaryBody?.trim() ?? '';
  if (body.length > 0 && body.length <= 220) return body;
  return 'No major movement detected since your last scan.';
}

function buildChips(skin: SkinState | null): InsightChip[] {
  if (!skin) return [];
  const out: InsightChip[] = [];
  for (const c of skin.topConcerns.slice(0, 3)) {
    const label = labelFor(c.concern);
    if (c.direction === 'better') {
      out.push({ label: `${label} improved`, tone: 'good' });
    } else if (c.direction === 'worse' || c.direction === 'new') {
      out.push({ label: `${label} active`, tone: 'warning' });
    } else {
      out.push({ label: `${label} steady`, tone: 'neutral' });
    }
  }
  return out;
}

function labelFor(c: string): string {
  switch (c) {
    case 'breakouts':
      return 'Breakouts';
    case 'hydration':
      return 'Hydration';
    case 'texture':
      return 'Texture';
    case 'dark_marks':
      return 'Dark marks';
    case 'redness':
      return 'Redness';
    case 'oiliness':
      return 'Oiliness';
    case 'sensitivity':
      return 'Sensitivity';
    case 'pores':
      return 'Pores';
    default:
      return c.charAt(0).toUpperCase() + c.slice(1);
  }
}

// ============================================================================
// Best Move â€” the loop bridge.
// ============================================================================

/**
 * Resolve the single best action for today. This is the function that
 * makes Progress and Routine speak the same language: both sub-tabs
 * render the exact same `bestMove` payload.
 *
 * Priority:
 *   1. `aiRoutine.tonight_focus` (when AI ran the post-scan composite)
 *   2. Top concern's `nextStep` (deterministic, derived from concerns.ts)
 *   3. Skin state's `routineHints[0]`
 *   4. Null â€” when there's no scan or confidence is too low
 *
 * Product resolution:
 *   1. If `aiTopMatches[0]` has a `recommended_slot`, use its product id
 *   2. Else, look for any match whose target_concerns includes the
 *      primary concern
 *   3. Else, leave `resolvedProductId: null` and route the CTA to the
 *      matched-products view filtered by category
 */
function buildBestMove(args: {
  skin: SkinState | null;
  concerns: Concern[];
  aiTopMatches: ProductMatch[];
  liveProductsById: Record<string, LiveProductCandidate>;
  aiRoutineFocus: string | null;
}): InsightBestMove | null {
  const { skin, concerns, aiTopMatches, liveProductsById, aiRoutineFocus } =
    args;
  if (!skin) return null;

  // Low-confidence gate â€” don't suggest action when image quality says so.
  if (skin.overallConfidence === 'low') return null;

  // Pick the title.
  const primaryConcern = skin.topConcerns[0]?.concern ?? null;
  const titleFromConcern = primaryConcern
    ? `Add ${concernActionWord(primaryConcern)} tonight`
    : null;
  const title = titleFromConcern ?? 'Set tonightâ€™s focus';

  // Pick the body. Prefer the AI focus sentence; fall back to top concern.
  // v23.0 — when no non-calm concern exists, fall through to the
  // FIRST concern's nextStep (now per-category concrete copy from
  // `calmNextStepFor`) before the generic "consistent routine" line,
  // so the BestMove card always carries a real instruction.
  let body =
    aiRoutineFocus?.trim() ??
    skin.routineHints[0]?.trim() ??
    concerns.find((c) => c.severity !== 'calm')?.nextStep?.trim() ??
    concerns[0]?.nextStep?.trim() ??
    'Stick to a gentle cleanser + moisturizer tonight, then rescan tomorrow morning.';
  // Keep it tight — the BestMove card has limited vertical space.
  if (body.length > 220) body = body.slice(0, 217).trimEnd() + '…';

  // Resolve the product.
  const category = skin.nextStepCategory ?? null;
  const slot: 'morning' | 'evening' | 'saved' =
    category === 'spf' ? 'morning' : 'evening';

  let resolvedProductId: string | null = null;
  if (aiTopMatches.length > 0) {
    const concernHit = primaryConcern
      ? aiTopMatches.find((m) => m.target_concerns.includes(primaryConcern as any))
      : undefined;
    const pick = concernHit ?? aiTopMatches[0];
    // Only resolve when we can actually render the product downstream
    // (it lives in the live cache OR is a known seed id â€” we don't
    // gate on seed here because RoutineScreen.hydrate falls back to seed).
    if (pick) resolvedProductId = pick.product_id;
  }

  // If no live-cache resolution but live cache has any candidate matching
  // the category, take the first.
  if (!resolvedProductId) {
    const candidate = Object.values(liveProductsById).find(
      (c) => category && c.category === category
    );
    if (candidate) resolvedProductId = candidate.id;
  }

  const ctaLabel = resolvedProductId
    ? `Add to ${slot === 'morning' ? 'morning' : 'evening'} routine`
    : 'View matched picks';

  return {
    title,
    body,
    category,
    ctaLabel,
    resolvedProductId,
    slot,
  };
}

function concernActionWord(c: string): string {
  switch (c) {
    case 'breakouts':
      return 'spot care';
    case 'hydration':
      return 'hydration';
    case 'redness':
    case 'sensitivity':
      return 'calming care';
    case 'texture':
      return 'gentle exfoliation';
    case 'dark_marks':
      return 'brightening';
    case 'oiliness':
      return 'oil control';
    case 'pores':
      return 'pore care';
    default:
      return 'a targeted step';
  }
}

// ============================================================================
// Metrics â€” every row carries fromâ†’to + status + interpretation.
// ============================================================================

/**
 * Builds metrics that never contradict their own numbers. When direction
 * is ambiguous, we OMIT the numbers and ship interpretation only â€” better
 * to say less than to ship "72 â†’ 70 â†’ increased" (the audit defect).
 */
function buildMetrics(
  skin: SkinState | null,
  scans: Scan[]
): InsightMetric[] {
  if (!skin) return [];
  const ai = scans[scans.length - 1]?.aiAnalysis;
  const prevAi = scans[scans.length - 2]?.aiAnalysis;

  // Prefer AI score_factors (0..100, higher = better condition).
  if (ai && prevAi) {
    const axes: Array<keyof typeof ai.score_factors> = [
      'texture',
      'redness',
      'hydration',
      'breakouts',
      'dark_marks',
    ];
    const out: InsightMetric[] = [];
    for (const axis of axes) {
      const to = ai.score_factors[axis];
      const from = prevAi.score_factors[axis];
      const delta = to - from;
      const status: MetricStatus =
        delta >= 3 ? 'Improved' : delta <= -3 ? 'Needs support' : 'Stable';
      out.push({
        label: labelFor(axis),
        from,
        to,
        status,
        interpretation: metricInterpretation(axis, status, delta),
      });
      if (out.length >= 4) break;
    }
    return out;
  }

  // Single-scan AI: show axes but without movement.
  if (ai) {
    const axes: Array<keyof typeof ai.score_factors> = [
      'texture',
      'redness',
      'hydration',
      'breakouts',
    ];
    return axes.map((axis) => ({
      label: labelFor(axis),
      to: ai.score_factors[axis],
      status: 'Stable',
      interpretation:
        ai.score_factors[axis] >= 70
          ? `${labelFor(axis)} reads steady in this scan.`
          : `${labelFor(axis)} is the area to watch from here.`,
    }));
  }

  // Deterministic concern fallback â€” no numbers, status + interpretation only.
  const concerns = getConcerns(scans[scans.length - 1]);
  return concerns.slice(0, 4).map((c) => {
    const status: MetricStatus =
      c.trend === 'improved'
        ? 'Improved'
        : c.trend === 'worsened' || c.trend === 'new'
        ? 'Needs support'
        : 'Stable';
    return {
      label: CATEGORY_LABEL[c.category],
      status,
      interpretation: c.interpretation,
    };
  });
}

function metricInterpretation(
  axis: string,
  status: MetricStatus,
  delta: number
): string {
  const dir =
    status === 'Improved'
      ? `up ${Math.abs(delta)}`
      : status === 'Needs support'
      ? `down ${Math.abs(delta)}`
      : 'unchanged';
  switch (axis) {
    case 'texture':
      return status === 'Improved'
        ? `Skin looks smoother (${dir} since last scan).`
        : status === 'Needs support'
        ? `Texture reads rougher than your last scan.`
        : 'No major change in texture detected.';
    case 'redness':
      return status === 'Improved'
        ? `Redness is calming (${dir}).`
        : status === 'Needs support'
        ? `Redness appears slightly more visible today.`
        : 'Redness is holding steady.';
    case 'hydration':
      return status === 'Improved'
        ? `Hydration is recovering (${dir}).`
        : status === 'Needs support'
        ? `Hydration has slipped â€” consider a humectant tonight.`
        : 'Hydration looks stable.';
    case 'breakouts':
      return status === 'Improved'
        ? `Fewer visible breakouts than last scan.`
        : status === 'Needs support'
        ? `New activity since your last scan.`
        : 'Breakout activity looks stable.';
    case 'dark_marks':
      return status === 'Improved'
        ? `Marks are fading.`
        : status === 'Needs support'
        ? `New marks since your last scan.`
        : 'No major change in dark marks detected.';
    default:
      return 'No major change detected.';
  }
}

// ============================================================================
// Comparison + timeline.
// ============================================================================

function buildComparison(scans: Scan[]): InsightComparison {
  if (scans.length < 2) {
    return {
      canShowImages: false,
      caption: 'Add another scan to unlock your before-and-after view.',
    };
  }
  const first = scans[0];
  const latest = scans[scans.length - 1];
  const beforeUri = first.photoUri?.trim() ? first.photoUri : undefined;
  const afterUri = latest.photoUri?.trim() ? latest.photoUri : undefined;
  const canShowImages = !!beforeUri && !!afterUri;
  if (!canShowImages) {
    return {
      canShowImages: false,
      caption: 'Add another scan with photo capture to unlock before-and-after.',
    };
  }
  return {
    beforeUri,
    afterUri,
    canShowImages: true,
    caption: buildComparisonCaption(first, latest),
  };
}

function buildComparisonCaption(first: Scan, latest: Scan): string {
  const fAi = first.aiAnalysis;
  const lAi = latest.aiAnalysis;
  if (fAi && lAi) {
    const txt = lAi.score_factors.texture - fAi.score_factors.texture;
    const red = lAi.score_factors.redness - fAi.score_factors.redness;
    const txtLine =
      txt >= 3
        ? 'Texture appears smoother'
        : txt <= -3
        ? 'Texture reads rougher'
        : 'Texture is holding';
    const redLine =
      red >= 3
        ? 'redness is calming'
        : red <= -3
        ? 'redness remains slightly active'
        : 'redness is holding';
    return `${txtLine}, while ${redLine}.`;
  }
  return `Day 1 â†’ Day ${latest.dayNumber}.`;
}

function buildTimeline(scans: Scan[]): InsightTimelineItem[] {
  if (scans.length === 0) return [];
  const items: InsightTimelineItem[] = [];
  for (let i = 0; i < scans.length; i++) {
    const s = scans[i];
    const prev = i > 0 ? scans[i - 1] : null;
    const statusLabel = i === 0 ? 'Baseline' : timelineStatusFor(s, prev);
    items.push({
      dayLabel: `Day ${s.dayNumber || i + 1}`,
      score: s.overallScore,
      imageUri: s.photoUri?.trim() ? s.photoUri : undefined,
      statusLabel,
      statusTone: timelineToneFor(statusLabel),
      insightLabel: timelineInsightFor(s, prev),
      scanId: s.id,
    });
  }
  // Newest last (chronological) â€” strip caps at 8 for ergonomic vertical list.
  return items.slice(-8);
}

function timelineStatusFor(s: Scan, prev: Scan | null): string {
  if (!prev) return 'Stable';
  const delta = s.overallScore - prev.overallScore;
  if (delta >= 2) return 'Improved';
  if (delta <= -2) return 'Needs support';
  return 'Stable';
}

function timelineToneFor(label: string): 'good' | 'warning' | 'neutral' {
  if (label === 'Improved') return 'good';
  if (label === 'Needs support') return 'warning';
  return 'neutral';
}

/**
 * Build the canonical trend summary. Always non-null. Includes a
 * ready-to-render `summaryLine` so consumers never reinvent copy.
 */
function buildTrendSummary(scans: Scan[]): InsightTrendSummary {
  if (scans.length === 0) {
    return {
      direction: 'no-data',
      deltaSinceFirst: 0,
      hasChart: false,
      points: [],
      baselineScore: null,
      latestScore: null,
      summaryLine: 'Take your first scan to start tracking your score.',
    };
  }
  if (scans.length === 1) {
    const only = scans[0].overallScore;
    return {
      direction: 'first-scan',
      deltaSinceFirst: 0,
      hasChart: false,
      points: [only],
      baselineScore: only,
      latestScore: only,
      summaryLine: 'Your trend will appear after one more scan.',
    };
  }
  const points = scans.map((s) => s.overallScore);
  const baseline = points[0];
  const latest = points[points.length - 1];
  const delta = latest - baseline;
  // Look at the last-scan move to qualify the "with a small lift" tail.
  const lastDelta =
    points.length >= 2 ? points[points.length - 1] - points[points.length - 2] : 0;
  const direction: InsightTrendSummary['direction'] =
    delta >= 2 ? 'improving' : delta <= -2 ? 'sliding' : 'holding';

  let summaryLine: string;
  if (direction === 'improving') {
    summaryLine = `Up ${delta} points across ${scans.length} scans since day 1.`;
  } else if (direction === 'sliding') {
    summaryLine = `Down ${Math.abs(delta)} points since day 1 â€” worth a closer look tonight.`;
  } else {
    if (lastDelta >= 1) {
      summaryLine =
        'Your score has stayed steady, with a small lift after your latest scan.';
    } else if (lastDelta <= -1) {
      summaryLine =
        'Your score has stayed steady, with a small dip on your latest scan.';
    } else {
      summaryLine = `Holding steady across ${scans.length} scans.`;
    }
  }

  return {
    direction,
    deltaSinceFirst: delta,
    hasChart: true,
    points,
    baselineScore: baseline,
    latestScore: latest,
    summaryLine,
  };
}

function timelineInsightFor(s: Scan, prev: Scan | null): string {
  // Prefer the AI's why-line when present (short).
  const aiWhy = s.aiAnalysis?.skin_score.why_line?.trim();
  if (aiWhy && aiWhy.length <= 48) return aiWhy;

  // Else mention the strongest concern from this scan.
  const concerns = s.concerns ?? [];
  const top = concerns.find((c) => c.severity !== 'calm');
  if (top) return `${CATEGORY_LABEL[top.category]} ${severityWord(top.severity)}`;
  if (!prev) return 'Baseline';
  return 'Steady';
}

function severityWord(s: Concern['severity']): string {
  switch (s) {
    case 'calm':
      return 'calm';
    case 'mild':
      return 'mild';
    case 'moderate':
      return 'active';
    case 'needs-attention':
      return 'needs attention';
  }
}

// ============================================================================
// Full AI notes (collapsed disclosure body).
// ============================================================================

function buildFullAINotes(
  scans: Scan[],
  skin: SkinState | null
): string | null {
  if (!skin) return null;
  const latest = scans[scans.length - 1];
  const ai = latest?.aiAnalysis;
  if (!ai) return null;
  const parts: string[] = [];
  if (ai.skin_score.why_line) parts.push(ai.skin_score.why_line);
  if (ai.skin_score.explanation) parts.push(ai.skin_score.explanation);
  if (ai.next_focus.tonight.length > 0) {
    parts.push('Tonight: ' + ai.next_focus.tonight.slice(0, 3).join(' · '));
  }
  if (ai.next_focus.avoid.length > 0) {
    parts.push('Avoid: ' + ai.next_focus.avoid.slice(0, 3).join(' · '));
  }
  for (const f of ai.findings.slice(0, 3)) {
    parts.push(`${labelFor(f.concern)} â€” ${f.user_summary}`);
  }
  return parts.join('\n\n').trim() || null;
}

// ============================================================================
// Public builder.
// ============================================================================

export interface BuildInsightArgs {
  scans: Scan[];
  aiRoutineFocus: string | null;
  aiTopMatches: ProductMatch[];
  liveProductsById: Record<string, LiveProductCandidate>;
  profile: UserProfileContext;
  analyzing?: boolean;
}

export function buildProgressRoutineInsight(
  args: BuildInsightArgs
): ProgressRoutineInsight {
  const {
    scans,
    aiRoutineFocus,
    aiTopMatches,
    liveProductsById,
    analyzing = false,
  } = args;

  const hasScanned = scans.length > 0;
  const canCompare = scans.length >= 2;
  const latestScan = hasScanned ? scans[scans.length - 1] : undefined;
  const previousScan = canCompare ? scans[scans.length - 2] : undefined;
  const skin = selectSkinState(latestScan, previousScan, scans);
  const concerns = latestScan ? getConcerns(latestScan, previousScan) : [];

  const score = skin?.score ?? null;
  const scoreBand = skin ? bandToHuman(skin.scoreBand) : 'â€”';

  const { dayLabel, freshnessLabel } = dayLabelFor(scans);
  const confidenceCaveat =
    !!skin && skin.overallConfidence === 'low';
  const { label: statusLabel, subline: statusSubline } = resolveStatus(
    hasScanned,
    latestScan,
    analyzing,
    confidenceCaveat
  );

  return {
    hasScanned,
    canCompare,
    score,
    scoreBand,
    deltaLabel: buildDeltaLabel(skin),
    dayLabel,
    freshnessLabel,
    statusLabel,
    statusSubline,
    heroReason: buildHeroReason(skin, concerns),
    skinReadSummary: buildSkinReadSummary(skin),
    chips: buildChips(skin),
    bestMove: buildBestMove({
      skin,
      concerns,
      aiTopMatches,
      liveProductsById,
      aiRoutineFocus,
    }),
    metrics: buildMetrics(skin, scans),
    comparison: buildComparison(scans),
    trendSummary: buildTrendSummary(scans),
    timeline: buildTimeline(scans),
    confidenceCaveat,
    fullAINotes: buildFullAINotes(scans, skin),
  };
}

// ============================================================================
// React hook â€” the single entry point screens use.
// ============================================================================

/**
 * Hook the Progress + Routine sub-tabs call. Memoised against the precise
 * store slices it needs (no broad subscriptions). Adapter logic stays pure
 * (above) â€” this hook only marshals store reads into the builder call.
 */
export function useProgressRoutineInsight(opts: {
  analyzing?: boolean;
} = {}): ProgressRoutineInsight {
  const scans = useAppStore((s) => s.scans);
  const aiRoutine = useAppStore((s) => s.aiRoutine);
  const aiTopMatches = useAppStore((s) => s.aiTopMatches);
  const liveProductsById = useAppStore((s) => s.liveProductsById);
  const user = useAppStore((s) => s.user);

  const profile = useMemo(() => {
    return selectUserProfileContext({
      user,
      scans,
    } as any);
  }, [user, scans]);

  const aiRoutineFocus = aiRoutine?.tonight_focus?.trim() || null;

  return useMemo(() => {
    return buildProgressRoutineInsight({
      scans,
      aiRoutineFocus,
      aiTopMatches,
      liveProductsById,
      profile,
      analyzing: !!opts.analyzing,
    });
  }, [
    scans,
    aiRoutineFocus,
    aiTopMatches,
    liveProductsById,
    profile,
    !!opts.analyzing,
  ]);
}



