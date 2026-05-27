/**
 * Home recommendation resolver — v23.0.
 *
 * The single canonical helper Home consumes to render its
 * "Picked for your skin" surface. Wraps the live retrieval
 * engine with:
 *
 *   1. A finite timeout (default 7s). Loading is never infinite.
 *   2. A deterministic curated-product fallback so a failed
 *      live retrieval never collapses the page to the
 *      "Live recommendations are offline" headline.
 *   3. A single `HomeRecState` enum the UI switches on, so the
 *      kicker label and the card variant adapt to the state
 *      without inventing copy on the screen side.
 *
 * Honesty rules (kept):
 *   • A curated fallback is labeled as such in the kicker
 *     ("Curated for your skin"). We never claim a curated pick
 *     is a live AI match.
 *   • When live AND curated both fail (truly nothing to show),
 *     the resolver returns `state='empty'` so the compact
 *     unavailable card renders instead of a fake product.
 */

import type {
  ConcernType,
  LiveProductCandidate,
} from '@/ai/ai-contracts';
import type { Scan } from '@/types';
import {
  getRecommendationContextForScan,
  getRecommendationContextFromQuery,
} from '@/api/liveProducts';
import {
  CURATED_PRODUCTS,
  curatedToLiveCandidate,
  type CuratedProduct,
} from '@/data/curatedProducts';
import { getConcerns } from '@/utils/concerns';

export type HomeRecState =
  | 'idle'
  | 'loading'
  | 'live'
  | 'curated'
  | 'empty'
  | 'offline';

export interface HomeRecResolution {
  state: HomeRecState;
  candidate: LiveProductCandidate | null;
  /** Adaptive section kicker — drives the "PICKED FOR YOU" label. */
  kicker: string;
  /** Honest one-line caption shown below the kicker when needed. */
  caption: string | null;
}

const LIVE_TIMEOUT_MS = 7000;

/**
 * Race a promise against a finite timeout so loading is bounded.
 * The timeout resolves with `'timeout'` instead of rejecting so the
 * caller can fall through to the curated branch without throwing.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([
    p,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ]);
}

/**
 * Pick a curated product that fits the scan's primary concern.
 * Returns null only when the curated catalog itself is empty
 * (which should never happen in production — guard anyway).
 */
export function pickCuratedFallback(
  primaryConcern: ConcernType | null,
  preferredSlot: 'morning' | 'evening' | 'saved' = 'evening'
): LiveProductCandidate | null {
  const pool: CuratedProduct[] = CURATED_PRODUCTS.filter((p) => {
    if (!primaryConcern) return true;
    return p.concernTags.includes(primaryConcern);
  });
  // Sort by trustedScore desc + prefer gentle strength for evening.
  const sorted = [...pool].sort((a, b) => {
    const strengthBoost = (p: CuratedProduct) =>
      preferredSlot === 'evening' && p.strength === 'gentle' ? 5 : 0;
    return (
      b.trustedScore + strengthBoost(b) - (a.trustedScore + strengthBoost(a))
    );
  });
  const pick =
    sorted[0] ??
    [...CURATED_PRODUCTS].sort((a, b) => b.trustedScore - a.trustedScore)[0] ??
    null;
  return pick ? curatedToLiveCandidate(pick) : null;
}

function primaryConcernForScan(scan: Scan | undefined): ConcernType | null {
  if (!scan) return null;
  const concerns = getConcerns(scan);
  const top = concerns.find((c) => c.severity !== 'calm') ?? concerns[0];
  if (!top) return null;
  switch (top.category) {
    case 'breakouts':
      return 'breakouts';
    case 'hydration':
      return 'hydration';
    case 'texture':
      return 'texture';
    case 'tone':
      return 'dark_marks';
  }
}

/**
 * Run the home recommendation pipeline. Always finishes within
 * `LIVE_TIMEOUT_MS`. The returned `state` field is the single
 * source of truth Home renders against.
 */
export async function resolveHomeRecommendation(args: {
  scan: Scan | undefined;
  hasAi: boolean;
  fresh?: boolean;
}): Promise<HomeRecResolution> {
  const { scan, hasAi, fresh = false } = args;
  const primary = primaryConcernForScan(scan);

  // Branch A — no scan at all. Curated-only path so Home never
  // surfaces an empty card before the user has scanned.
  if (!scan) {
    const cand = pickCuratedFallback(null, 'evening');
    return cand
      ? {
          state: 'curated',
          candidate: cand,
          kicker: 'CURATED FOR YOUR SKIN',
          caption: 'A gentle starter pick while we wait for your first scan.',
        }
      : {
          state: 'empty',
          candidate: null,
          kicker: 'PICKED FOR YOU',
          caption: 'Take your first scan to unlock matches.',
        };
  }

  const trigger = fresh ? 'retry' : 'initial_load';

  try {
    const livePromise = hasAi
      ? getRecommendationContextForScan(scan, { fresh, trigger })
      : getRecommendationContextFromQuery(
          primary
            ? `best ${primary.replace('_', ' ')} product`
            : 'best gentle daily skincare',
          { fresh, trigger }
        );

    const settled = await withTimeout(livePromise, LIVE_TIMEOUT_MS);

    if (settled === 'timeout') {
      const cand = pickCuratedFallback(primary, 'evening');
      return cand
        ? {
            state: 'curated',
            candidate: cand,
            kicker: 'CURATED FOR YOUR SKIN',
            caption: 'Live matching is slow — showing a strong curated pick.',
          }
        : {
            state: 'offline',
            candidate: null,
            kicker: 'PICKED FOR YOU',
            caption: null,
          };
    }

    const hero = settled?.heroProduct ?? null;
    const availability = settled?.availabilityState ?? 'unavailable';
    if (hero && availability === 'available') {
      return {
        state: 'live',
        candidate: hero,
        kicker: 'PICKED FOR YOUR SKIN',
        caption: null,
      };
    }
    // Live returned no usable hero — drop into curated.
    const cand = pickCuratedFallback(primary, 'evening');
    if (cand) {
      return {
        state: 'curated',
        candidate: cand,
        kicker: 'CURATED FOR YOUR SKIN',
        caption: 'Showing a strong curated pick for your top concern.',
      };
    }
    if (availability === 'unavailable') {
      return {
        state: 'offline',
        candidate: null,
        kicker: 'PICKED FOR YOU',
        caption: null,
      };
    }
    return {
      state: 'empty',
      candidate: null,
      kicker: 'PICKED FOR YOU',
      caption: null,
    };
  } catch {
    const cand = pickCuratedFallback(primary, 'evening');
    return cand
      ? {
          state: 'curated',
          candidate: cand,
          kicker: 'CURATED FOR YOUR SKIN',
          caption: 'Showing a strong curated pick for your top concern.',
        }
      : {
          state: 'offline',
          candidate: null,
          kicker: 'PICKED FOR YOU',
          caption: null,
        };
  }
}
