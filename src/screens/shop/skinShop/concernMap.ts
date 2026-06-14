/**
 * concernMap — the ONE place the three concern vocabularies are reconciled.
 *
 * The Shop engine derives everything from the canonical scan. A scan finding's
 * concern is a `ConcernType` (ai-contracts, the vocabulary `SkinState.topConcerns`
 * speaks). To recommend against it we need:
 *   • a TINT family       — `MetricKind` (skinRead.ts) → `metricTint()`
 *   • catalog match tags   — `ConcernTag` (commerce, == metric axes) for SKU overlap
 *   • a plain SCAN-LANGUAGE label — the user's own words, never product-benefit framing
 *   • a STRENGTH 0..1      — severity-derived, drives the on-skin glow echo
 *
 * Pure, deterministic, no side effects. metricTint() is the canonical scan glow
 * tint (reused, never reinvented), so the shop's finding-echo matches the scan.
 */

import type { ConcernType, Severity as AiSeverity } from '@/ai/ai-contracts';
import type { MetricKind } from '@/types/skinRead';
import type { ConcernTag } from '@/commerce/types';
import {
  metricTint,
  type MetricTint,
  type ScreenTheme,
} from '@/screens/scan/firstFinding/metricTint';

// ConcernType (canonical SkinState) → the ONE tint family (no rainbow).
const CONCERN_METRIC: Record<ConcernType, MetricKind> = {
  breakouts: 'breakouts',
  oiliness: 'oil',
  pores: 'oil',
  hydration: 'dryness',
  dark_marks: 'dark_marks',
  texture: 'dark_marks', // no dedicated texture tint; resurfacing reads as marks
  redness: 'redness',
  sensitivity: 'redness',
};

// ConcernType → catalog match tags (CommerceSku.concerns), most-specific first.
const CONCERN_TAGS: Record<ConcernType, ConcernTag[]> = {
  breakouts: ['breakouts'],
  oiliness: ['oil'],
  pores: ['oil', 'breakouts'],
  hydration: ['dryness'],
  dark_marks: ['dark_marks'],
  texture: ['dark_marks'],
  redness: ['redness', 'sensitive'],
  sensitivity: ['sensitive', 'redness'],
};

// The user's plain scan words (matches the scan + shopStackModel's humanConcern).
const CONCERN_LABEL: Record<ConcernType, string> = {
  breakouts: 'Breakouts',
  oiliness: 'Shine',
  pores: 'Pores',
  hydration: 'Dryness',
  dark_marks: 'Dark marks',
  texture: 'Texture',
  redness: 'Redness',
  sensitivity: 'Sensitivity',
};

// Severity → glow strength (0..1). Mirrors the scan's prominence semantics.
const SEVERITY_STRENGTH: Record<AiSeverity, number> = {
  none: 0,
  low: 0.2,
  mild: 0.45,
  moderate: 0.7,
  high: 1,
};

// Severity → fit weight. Stronger findings pull their best-fit pick up the rank.
const SEVERITY_WEIGHT: Record<AiSeverity, number> = {
  none: 0,
  low: 1,
  mild: 1,
  moderate: 2,
  high: 3,
};

export function concernMetric(c: ConcernType): MetricKind {
  return CONCERN_METRIC[c];
}

export function concernTags(c: ConcernType): ConcernTag[] {
  return CONCERN_TAGS[c];
}

export function concernLabel(c: ConcernType): string {
  return CONCERN_LABEL[c] ?? 'A finding';
}

export function severityStrength(s: AiSeverity): number {
  return SEVERITY_STRENGTH[s] ?? 0;
}

export function severityWeight(s: AiSeverity): number {
  return SEVERITY_WEIGHT[s] ?? 1;
}

/**
 * Theme-agnostic anchor tint hex for a concern. In the light theme `glow` is
 * the raw anchor color, so this returns the same hex the scan glow is built on.
 */
export function concernTintHex(c: ConcernType): string {
  return metricTint(CONCERN_METRIC[c], 'light').glow;
}

/** Full themed tint, when the UI wants the pill/chip/line set too. */
export function concernTint(c: ConcernType, theme: ScreenTheme): MetricTint {
  return metricTint(CONCERN_METRIC[c], theme);
}
