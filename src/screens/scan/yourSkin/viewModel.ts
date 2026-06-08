/**
 * viewModel — turns a canonical `SkinRead` into the layout-independent shape the
 * "Your Skin" screen renders FROM (CLAUDE.md law: screens read canonical state,
 * they don't recompose it inline). It splits hero vs. supporting findings, picks
 * the orb's scan tone, and — for "skin as a system" — builds the finding↔move
 * grouping both ways so related findings can share a tint-dot and the
 * consolidation can fly the right chips into the right move.
 *
 * Geometry is deliberately NOT here: the face landmarks (the `faceBox`) are
 * computed ONCE upstream (screen 1) and passed down; the map resolves region
 * polygons from that box at its measured size, once per layout — never per frame,
 * never recomputed.
 */

import type {
  MetricKind,
  RoutineFocusMove,
  SkinRead,
  SkinReadFinding,
} from '@/types/skinRead';
import type { AssistantScanTone } from '@/screens/assistant/AssistantAuroraOrb';

export interface YourSkinViewModel {
  hero: SkinReadFinding | null;
  /** findings[1..n] — the "supporting cast". */
  supporting: SkinReadFinding[];
  /** All concern+positive findings in model order (hero first). */
  all: SkinReadFinding[];
  scanTone: AssistantScanTone;
  moves: RoutineFocusMove[];
  /** finding id → the move id it feeds (first match), or undefined. */
  findingToMove: Record<string, string | undefined>;
  /** move id → the finding ids it consolidates (in findings order). */
  moveToFindings: Record<string, string[]>;
  /** Whether the read is a "great skin" case (hero is a strength, no concerns). */
  greatSkin: boolean;
}

/** The orb tints to the user's most-recent scan via the hero metric. Sensitivity
 *  reads cool + calm; breakouts/oil read warm + attentive; everything else the
 *  balanced companion tone. (Pura Blue is never a concern; it isn't a tone.) */
export function scanToneForMetric(metric: MetricKind | undefined): AssistantScanTone {
  switch (metric) {
    case 'redness':
    case 'dryness':
      return 'reactive';
    case 'breakouts':
    case 'oil':
      return 'active';
    default:
      return 'balanced';
  }
}

export function buildYourSkinViewModel(read: SkinRead): YourSkinViewModel {
  const all = read.findings;
  const hero = all.length > 0 ? all[0] : null;
  const supporting = all.slice(1);
  const moves = read.routineFocus ?? [];

  const findingToMove: Record<string, string | undefined> = {};
  const moveToFindings: Record<string, string[]> = {};
  for (const m of moves) moveToFindings[m.id] = [];
  for (const f of all) {
    const m = moves.find((mv) => mv.addressesIds.includes(f.id));
    findingToMove[f.id] = m?.id;
    if (m) moveToFindings[m.id].push(f.id);
  }

  const greatSkin = !read.hasRealConcerns;

  return {
    hero,
    supporting,
    all,
    scanTone: scanToneForMetric(hero?.metric),
    moves,
    findingToMove,
    moveToFindings,
    greatSkin,
  };
}
