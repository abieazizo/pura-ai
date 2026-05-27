/**
 * AI Skin Context adapter.
 *
 * Normalizes the messy realities of the live store + latest scan into ONE
 * trustworthy object the AI Assist screen, the structured-response engine,
 * and the assistant API can all read from.
 *
 * Hard rules:
 *   - never invent scan data (no fake score, no fake delta, no fake concerns)
 *   - never duplicate the same human label ("active (active)" was a real bug
 *     in the legacy mock — the dedupe pass here kills that class of failure)
 *   - never crash on missing fields — every field has a graceful default
 *   - limit visible labels to a small premium set (≤3 concerns, ≤3 areas)
 */
import type { Scan } from '@/types';
import type { ConcernType } from '@/ai/ai-contracts';
import { useAppStore } from '@/store/useAppStore';

export interface AiSkinContext {
  hasScan: boolean;
  /** 0..100 integer; undefined when no scan. */
  skinScore?: number;
  /** signed integer movement vs previous scan; undefined when not computable. */
  scoreDelta?: number;
  /** Premium human-readable label, e.g. "Today", "Yesterday", "3 days ago". */
  lastScanLabel?: string;
  /** Up to 3 deduped human-readable concern labels. */
  activeConcerns: string[];
  /** Up to 3 deduped human-readable improvement labels. */
  improvedAreas: string[];
  /** Short status summary (used as the hero subtitle). */
  routineStatus?: string;
  /** "Tonight" guidance summary (one line, no period). */
  recommendedFocus?: string;
  /** Whether the user has any morning/evening/saved products. */
  productsAvailable: boolean;
  /** True when ≥2 scans exist (delta comparisons make sense). */
  hasMultipleScans: boolean;
  /** First name only — never invented. */
  displayName?: string;
}

const CONCERN_LABELS: Record<ConcernType, string> = {
  breakouts: 'Breakouts',
  hydration: 'Dryness',
  texture: 'Texture',
  dark_marks: 'Dark marks',
  redness: 'Redness',
  oiliness: 'Oily zones',
  sensitivity: 'Sensitivity',
  pores: 'Pores',
};

const ZONE_LABELS: Record<string, string> = {
  chin: 'Chin',
  forehead: 'Forehead',
  tZone: 'T-zone',
  cheeks: 'Cheeks',
  nose: 'Nose',
  jawline: 'Jawline',
};

/**
 * Pure adapter — pass an explicit scan + extras for tests, or call
 * `buildAiSkinContextFromStore()` to pull live state from the store.
 */
export function buildAiSkinContext(args: {
  latestScan?: Scan;
  previousScan?: Scan;
  displayName?: string;
  hasProducts: boolean;
  totalScans: number;
}): AiSkinContext {
  const { latestScan, previousScan, displayName, hasProducts, totalScans } = args;

  if (!latestScan) {
    return {
      hasScan: false,
      activeConcerns: [],
      improvedAreas: [],
      productsAvailable: hasProducts,
      hasMultipleScans: false,
      displayName: cleanName(displayName),
    };
  }

  const skinScore = clampScore(latestScan.overallScore);
  const scoreDelta = computeDelta(latestScan, previousScan);
  const lastScanLabel = formatScanAge(latestScan.capturedAt);
  const activeConcerns = pickActiveConcerns(latestScan);
  const improvedAreas = pickImprovedAreas(latestScan);
  const routineStatus = buildRoutineStatus(scoreDelta, activeConcerns);
  const recommendedFocus = buildRecommendedFocus(activeConcerns, scoreDelta);

  return {
    hasScan: true,
    skinScore,
    scoreDelta,
    lastScanLabel,
    activeConcerns,
    improvedAreas,
    routineStatus,
    recommendedFocus,
    productsAvailable: hasProducts,
    hasMultipleScans: totalScans >= 2,
    displayName: cleanName(displayName),
  };
}

/**
 * Live-store reader. Reaches into useAppStore.getState() so screens don't
 * need to wire each fragment by hand.
 */
export function buildAiSkinContextFromStore(): AiSkinContext {
  const state = useAppStore.getState();
  const scans = state.scans;
  const latestScan = scans[scans.length - 1];
  const previousScan = scans.length >= 2 ? scans[scans.length - 2] : undefined;
  const hasProducts =
    state.userRoutineMorning.length +
      state.userRoutineEvening.length +
      state.wishlist.length >
    0;
  return buildAiSkinContext({
    latestScan,
    previousScan,
    displayName: state.user?.name ?? state.name,
    hasProducts,
    totalScans: scans.length,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function clampScore(n: number | undefined): number | undefined {
  if (n === undefined || n === null || Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeDelta(latest: Scan, previous?: Scan): number | undefined {
  if (!previous) {
    const aiDelta = latest.aiAnalysis?.skin_score?.delta_vs_previous;
    if (typeof aiDelta === 'number') return aiDelta;
    return undefined;
  }
  const diff = (latest.overallScore ?? 0) - (previous.overallScore ?? 0);
  if (Number.isNaN(diff)) return undefined;
  return Math.round(diff);
}

function formatScanAge(iso?: string): string | undefined {
  if (!iso) return undefined;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return undefined;
  const now = Date.now();
  const dayMs = 86_400_000;
  const diffDays = Math.floor((now - then) / dayMs);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return undefined;
  }
}

/**
 * Pulls active concerns from (in priority order):
 *   1. aiAnalysis findings with severity > none and direction != better
 *   2. concerns array (when present) with severity > calm
 *   3. zones array with status === 'active' / 'monitor'
 *
 * Dedupes by canonical label (case-insensitive, trimmed) so we never get
 * "Active (active)" style duplicates.
 */
function pickActiveConcerns(scan: Scan): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (label: string | undefined) => {
    if (!label) return;
    const trimmed = label.trim();
    if (trimmed.length === 0) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  const ai = scan.aiAnalysis;
  if (ai?.findings?.length) {
    const ordered = [...ai.findings].sort(
      (a, b) => (a.marker_priority ?? 9) - (b.marker_priority ?? 9)
    );
    for (const f of ordered) {
      if (out.length >= 3) break;
      if (f.severity === 'none') continue;
      if (f.direction_vs_previous === 'better') continue;
      const concernLabel = CONCERN_LABELS[f.concern];
      const region = f.regions?.[0];
      if (region && region !== 'across_face') {
        const zone = ZONE_LABELS[region] ?? prettyRegion(region);
        push(`${zone} ${concernLabel.toLowerCase()}`);
      } else {
        push(concernLabel);
      }
    }
  }

  if (out.length < 3 && scan.concerns?.length) {
    for (const c of scan.concerns) {
      if (out.length >= 3) break;
      if (c.severity === 'calm') continue;
      if (c.trend === 'improved') continue;
      const region = c.region?.trim();
      const concernLabel = matchConcernCategoryLabel(c.category);
      if (region && region.toLowerCase() !== 'across the face') {
        push(`${capitalize(region)} ${concernLabel.toLowerCase()}`);
      } else {
        push(concernLabel);
      }
    }
  }

  if (out.length < 3 && scan.zones?.length) {
    for (const z of scan.zones) {
      if (out.length >= 3) break;
      if (z.status === 'calm') continue;
      push(z.label);
    }
  }

  return out;
}

function pickImprovedAreas(scan: Scan): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (label: string | undefined) => {
    if (!label) return;
    const trimmed = label.trim();
    if (trimmed.length === 0) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  const ai = scan.aiAnalysis;
  if (ai?.findings?.length) {
    for (const f of ai.findings) {
      if (out.length >= 3) break;
      if (f.direction_vs_previous !== 'better') continue;
      const region = f.regions?.[0];
      if (region && region !== 'across_face') {
        const zone = ZONE_LABELS[region] ?? prettyRegion(region);
        push(`${zone} calmer`);
      } else {
        push(`${CONCERN_LABELS[f.concern]} calmer`);
      }
    }
  }

  if (out.length < 3 && scan.concerns?.length) {
    for (const c of scan.concerns) {
      if (out.length >= 3) break;
      if (c.trend !== 'improved') continue;
      const region = c.region?.trim();
      const concernLabel = matchConcernCategoryLabel(c.category);
      if (region && region.toLowerCase() !== 'across the face') {
        push(`${capitalize(region)} calmer`);
      } else {
        push(`${concernLabel} calmer`);
      }
    }
  }

  if (out.length < 3 && scan.zones?.length) {
    for (const z of scan.zones) {
      if (out.length >= 3) break;
      if (z.status !== 'calm') continue;
      push(`${z.label} calm`);
    }
  }

  return out;
}

function buildRoutineStatus(
  delta: number | undefined,
  concerns: string[]
): string | undefined {
  if (delta !== undefined && delta >= 3) {
    return 'Trending better';
  }
  if (delta !== undefined && delta <= -3) {
    return 'Some activity to watch';
  }
  if (concerns.length === 0) return 'Holding steady';
  return 'Steady, with a few focus areas';
}

function buildRecommendedFocus(
  concerns: string[],
  delta: number | undefined
): string | undefined {
  if (delta !== undefined && delta >= 3 && concerns.length === 0) {
    return 'Keep your routine steady';
  }
  if (concerns.length > 0) {
    return 'Keep the routine simple and barrier-first';
  }
  return 'Stay consistent — no changes needed';
}

function matchConcernCategoryLabel(cat: string): string {
  switch (cat) {
    case 'breakouts':
      return 'Breakouts';
    case 'hydration':
      return 'Dryness';
    case 'texture':
      return 'Texture';
    case 'tone':
      return 'Dark marks';
    default:
      return capitalize(cat);
  }
}

function prettyRegion(region: string): string {
  return region
    .replace(/_/g, ' ')
    .split(' ')
    .map(capitalize)
    .join(' ');
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanName(n: string | null | undefined): string | undefined {
  const trimmed = (n ?? '').trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.toLowerCase() === 'you') return undefined;
  return trimmed.split(/\s+/)[0];
}
