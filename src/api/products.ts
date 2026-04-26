/**
 * Products API — v10.22.
 *
 * Catalog reads (listProducts / getProduct) stay synchronous on
 * seedProducts. Three new AI-powered functions ride alongside:
 *
 *   • getMatchedProductsForUser — calls aiGateway.matchProductsForUser
 *     against the seeded catalog. Used by Home + Products grid to
 *     reorder picks per user.
 *
 *   • getSearchSuggestions — calls aiGateway.buildSearchSuggestions to
 *     produce contextual placeholder + chips for the AISearchBar.
 *
 *   • resolveBarcode — runs the two-step barcode resolution loop
 *     through aiGateway. Caller supplies a host-side `lookupBarcode`
 *     function (e.g. an open-product API) so the AI never invents
 *     catalog data.
 *
 * Each new function falls back to a documented deterministic
 * behaviour when the AI gateway is unavailable.
 */

import { seedProducts } from '@/data/seed';
import type { Product } from '@/types';
import { aiGateway, tryAi } from '@/ai/aiGateway';
import { aiLog } from '@/ai/aiLog';
import type {
  BarcodeResolution,
  ConcernType,
  ProductMatchResult,
  SearchSuggestionResult,
} from '@/ai/ai-contracts';
import { useAppStore } from '@/store/useAppStore';
import { computeSkinScore } from '@/utils/skinScore';

// ---------------------------------------------------------------------------
// Catalog reads (unchanged from v10.15).
// ---------------------------------------------------------------------------

export async function listProducts(): Promise<Product[]> {
  return seedProducts;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return seedProducts.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// v10.22 — AI matching.
//
// Builds the candidate-products JSON the AI engine needs and routes
// the call through aiGateway. The result is also persisted to
// `store.aiTopMatches` so getBestForYou-style selectors can read it
// without re-issuing the call. Returns null when the gateway is
// unavailable so callers can fall back to the seeded matchScore
// ordering they already use.
// ---------------------------------------------------------------------------

const PRODUCT_CONCERN_HINTS: Record<string, ConcernType[]> = {
  // Maps product seed IDs → likely concern coverage. Rough mapping;
  // fine for ranking, doesn't have to be perfect.
};

function inferConcerns(p: Product): ConcernType[] {
  const explicit = PRODUCT_CONCERN_HINTS[p.id];
  if (explicit) return explicit;
  const haystack = [
    p.name,
    p.description,
    ...(p.keyIngredients ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const out: ConcernType[] = [];
  if (
    haystack.includes('salicylic') ||
    haystack.includes('benzoyl') ||
    haystack.includes('niacinamide') ||
    haystack.includes('zinc')
  ) {
    out.push('breakouts');
  }
  if (
    haystack.includes('hyaluronic') ||
    haystack.includes('glycerin') ||
    haystack.includes('squalane') ||
    haystack.includes('ceramide')
  ) {
    out.push('hydration');
  }
  if (
    haystack.includes('aha') ||
    haystack.includes('bha') ||
    haystack.includes('lactic') ||
    haystack.includes('glycolic') ||
    haystack.includes('retinol')
  ) {
    out.push('texture');
  }
  if (
    haystack.includes('vitamin c') ||
    haystack.includes('arbutin') ||
    haystack.includes('tranexamic') ||
    haystack.includes('kojic') ||
    haystack.includes('azelaic')
  ) {
    out.push('dark_marks');
  }
  if (haystack.includes('centella') || haystack.includes('panthenol')) {
    out.push('redness');
    out.push('sensitivity');
  }
  return out;
}

function buildSkinStateSummary(): string {
  const s = useAppStore.getState();
  const scans = s.scans;
  const latest = scans[scans.length - 1];
  const score = computeSkinScore(scans);
  return JSON.stringify({
    user_profile: {
      skin_type: s.skinType,
      goal: s.goal,
      sensitivity: s.sensitivity,
      sun_exposure: s.sunExposure,
      effort: s.effort,
      price_tier: s.priceTier,
    },
    latest_score: {
      value: score.value,
      tier: score.tier,
      delta_since_last: score.deltaSinceLast,
    },
    latest_ai_analysis: latest?.aiAnalysis ?? null,
  });
}

function buildCandidateProductsJson(candidates: Product[]): string {
  return JSON.stringify(
    candidates.map((p) => ({
      product_id: p.id,
      brand: p.brand,
      name: p.name,
      category: p.category,
      key_ingredients: p.keyIngredients,
      tags: p.tags,
      likely_concerns_supported: inferConcerns(p),
      price_usd: p.price,
      seeded_match_score: p.matchScore,
    }))
  );
}

export async function getMatchedProductsForUser(args: {
  userId?: string;
  basedOnScanId?: string | null;
  candidates?: Product[];
}): Promise<ProductMatchResult | null> {
  if (!aiGateway.isAvailable()) return null;
  const candidates = args.candidates ?? seedProducts;
  if (candidates.length === 0) {
    // Empty candidate set guard — never burn a Claude call. Clear the
    // store-side ranking so the UI knows there's nothing to show.
    aiLog.info(
      'products.getMatchedProductsForUser',
      'empty candidate set; skipping AI call'
    );
    try {
      useAppStore.getState().setAiTopMatches([]);
    } catch {
      /* non-fatal */
    }
    return {
      for_user_id: args.userId ?? 'current_user',
      based_on_scan_id: args.basedOnScanId ?? null,
      top_pick_product_id: null,
      matches: [],
      alternatives: [],
    };
  }
  const result = await tryAi(() =>
    aiGateway.matchProductsForUser({
      userId: args.userId ?? 'current_user',
      basedOnScanId: args.basedOnScanId ?? null,
      skinStateSummary: buildSkinStateSummary(),
      candidateProductsJson: buildCandidateProductsJson(candidates),
    })
  );
  if (result) {
    try {
      useAppStore.getState().setAiTopMatches(result.matches);
    } catch {
      /* non-fatal */
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// v10.22 — AI search suggestions.
//
// Persists the result on `store.aiSearchSuggestions` so AISearchBar
// can read it without re-issuing the call on every keystroke.
// ---------------------------------------------------------------------------

function buildLatestScanSummary(): string | null {
  const s = useAppStore.getState();
  const latest = s.scans[s.scans.length - 1];
  if (!latest) return null;
  if (latest.aiAnalysis) {
    return JSON.stringify({
      score: latest.aiAnalysis.skin_score.value,
      band: latest.aiAnalysis.skin_score.band,
      primary_concern: latest.aiAnalysis.primary_concern,
      secondary_concerns: latest.aiAnalysis.secondary_concerns,
      why: latest.aiAnalysis.skin_score.why_line,
    });
  }
  return JSON.stringify({
    score: latest.overallScore,
    headline: latest.summaryHeadline,
    concerns: (latest.concerns ?? []).slice(0, 3).map((c) => ({
      category: c.category,
      severity: c.severity,
    })),
  });
}

function buildRoutineSummary(): string {
  const s = useAppStore.getState();
  const morning = s.userRoutineMorning
    .map((id) => seedProducts.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p!.brand} ${p!.name}`);
  const evening = s.userRoutineEvening
    .map((id) => seedProducts.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p!.brand} ${p!.name}`);
  return JSON.stringify({ morning, evening, saved_count: s.wishlist.length });
}

export async function getSearchSuggestions(
  pageContext: 'products' | 'assistant'
): Promise<SearchSuggestionResult | null> {
  if (!aiGateway.isAvailable()) return null;
  const result = await tryAi(() =>
    aiGateway.buildSearchSuggestions({
      latestScanSummary: buildLatestScanSummary(),
      routineSummary: buildRoutineSummary(),
      pageContext,
    })
  );
  if (result) {
    try {
      useAppStore.getState().setAiSearchSuggestions(result);
    } catch {
      /* non-fatal */
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// v10.22 — Barcode resolution.
// v10.24 — the client no longer supplies a `lookupBarcode` callback.
// The proxy server owns the catalog lookup (see
// `server/lib/barcodeLookup.ts`); the client only passes the scanned
// barcode value. This both keeps the catalog out of the RN bundle and
// guarantees a single source of truth for what a barcode resolves to.
// ---------------------------------------------------------------------------

export async function resolveBarcode(args: {
  barcodeValue: string;
}): Promise<BarcodeResolution | null> {
  if (!aiGateway.isAvailable()) return null;
  if (args.barcodeValue.trim().length === 0) {
    aiLog.warn(
      'products.resolveBarcode',
      'refusing to resolve empty barcode value'
    );
    return null;
  }
  return await tryAi(() =>
    aiGateway.normalizeBarcodeResolution({
      barcodeValue: args.barcodeValue,
    })
  );
}
