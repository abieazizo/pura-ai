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
import { aiTelemetry } from '@/ai/aiTelemetry';
import type {
  BarcodeResolution,
  ConcernType,
  ProductMatchResult,
  SearchSuggestionResult,
} from '@/ai/ai-contracts';
import { useAppStore } from '@/store/useAppStore';
import { computeSkinScore } from '@/utils/skinScore';
import { buildSafetyProfile } from '@/utils/safetyProfile';

// ---------------------------------------------------------------------------
// Catalog reads (unchanged from v10.15).
// ---------------------------------------------------------------------------

// v18.3 — listProducts is intentionally an emergency-only export.
// It's no longer consumed by any user-facing screen (Home / Plan /
// Products / Routine / ProductDetail / Assistant all use the live
// retrieval engine in `src/api/liveProducts.ts`). Kept compiling
// because `src/api/index.ts` re-exports it; callers in tests or
// future tooling can still read the seed catalog directly.
export async function listProducts(): Promise<Product[]> {
  return seedProducts;
}

/**
 * v18.3 — getProduct(id) now resolves from the live product cache
 * FIRST (any AI-retrieved product surfaced this session), falling
 * back to the seed catalog only when the cache misses. The legacy
 * deterministic-mock assistant code path uses this; everywhere
 * else has migrated to live retrieval directly.
 */
export async function getProduct(id: string): Promise<Product | undefined> {
  try {
    const live = useAppStore.getState().liveProductsById[id];
    if (live) {
      const adaptedCategory =
        live.category === 'spot_treatment'
          ? 'treatment'
          : live.category === 'unknown'
          ? 'serum'
          : live.category;
      return {
        id: live.id,
        brand: live.brand,
        name: live.name,
        category: adaptedCategory as Product['category'],
        imageUri: live.imageUrl ?? '',
        ingredients: live.ingredientsHighlights,
        keyIngredients: live.ingredientsHighlights,
        description: live.shortDescription,
        tint: 'sand',
        rating: 0,
        reviewCount: 0,
        matchScore: live.matchScore,
        tags: [],
        addedDate: live.sourceTimestamp,
        price: live.price ?? 0,
        imageUrl: live.imageUrl ?? undefined,
        buyUrl: live.productUrl ?? undefined,
      };
    }
  } catch {
    /* fall through to seed lookup */
  }
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

// v15.0 — explicit per-product concern coverage. Hand-curated against
// the 24 seed products so the matching engine has real signal, not
// just ingredient-string heuristics. Listed concerns are ordered by
// how directly the product addresses them (primary first).
const PRODUCT_CONCERN_HINTS: Record<string, ConcernType[]> = {
  'cerave-hydrating-cleanser': ['hydration', 'sensitivity'],
  'la-roche-posay-toleriane-cleanser': ['sensitivity', 'redness', 'hydration'],
  'beauty-of-joseon-ginseng-cleanser': ['oiliness', 'pores'],
  'anua-heartleaf-toner': ['redness', 'sensitivity', 'oiliness'],
  'paulas-choice-2-bha': ['breakouts', 'pores', 'texture'],
  'biotherm-skin-oxygen-toner': ['hydration', 'oiliness'],
  'the-ordinary-niacinamide': ['oiliness', 'pores', 'breakouts'],
  'good-molecules-discoloration': ['dark_marks'],
  'the-ordinary-retinal': ['texture', 'dark_marks'],
  'elf-vitamin-c-serum': ['dark_marks', 'texture'],
  'cerave-pm-lotion': ['hydration', 'sensitivity'],
  'illiyoon-ceramide-cream': ['hydration', 'sensitivity'],
  'la-roche-posay-toleriane-dd': ['hydration', 'sensitivity'],
  'beauty-of-joseon-relief-sun': ['sensitivity', 'redness'],
  'bonajour-green-tea-sun': ['oiliness', 'sensitivity'],
  'its-skin-collagen-ampoule': ['hydration'],
  'paulas-choice-azelaic': ['redness', 'dark_marks', 'breakouts'],
  'the-ordinary-lactic-acid': ['texture', 'dark_marks'],
  'beauty-of-joseon-rice-mask': ['hydration', 'sensitivity'],
  'its-skin-power-mask': ['hydration', 'pores'],
  'cosrx-snail-essence': ['hydration', 'sensitivity', 'redness'],
  'kiehls-ultra-facial-cream': ['hydration'],
  'supergoop-unseen': ['hydration'],
  'youth-to-the-people-kale': ['hydration', 'sensitivity'],
};

// v15.0 — per-product short match reasons used by the deterministic
// fallback matcher. One concrete sentence per product that names the
// active mechanism. Falls back to concern-axis generic copy only when
// no entry exists for a product id.
const PRODUCT_REASON_MAP: Record<string, string> = {
  'cerave-hydrating-cleanser':
    'Hydrating, non-stripping cleanser with ceramides and hyaluronic acid for a balanced barrier.',
  'la-roche-posay-toleriane-cleanser':
    'Gentle, low-foam cleanser tested for sensitive skin — keeps the barrier intact.',
  'beauty-of-joseon-ginseng-cleanser':
    'Mild foaming cleanser that controls T-zone shine without over-drying.',
  'anua-heartleaf-toner':
    'Heartleaf-based toner that calms redness and visible reactivity overnight.',
  'paulas-choice-2-bha':
    'Salicylic acid liquid exfoliant — clears clogged pores and active breakouts.',
  'biotherm-skin-oxygen-toner':
    'Light hydrating toner that preps oily skin without leaving residue.',
  'the-ordinary-niacinamide':
    'Niacinamide and zinc to balance oil and visibly reduce congestion.',
  'good-molecules-discoloration':
    'Tranexamic-acid serum that fades stubborn dark marks over weeks of use.',
  'the-ordinary-retinal':
    'Granactive retinoid for texture and dark marks — start two nights a week.',
  'elf-vitamin-c-serum':
    'Affordable vitamin-C blend for everyday tone evening.',
  'cerave-pm-lotion':
    'Niacinamide-rich PM moisturizer — barrier-supporting, fragrance-free.',
  'illiyoon-ceramide-cream':
    'Multi-ceramide cream for very dry or barrier-compromised skin.',
  'la-roche-posay-toleriane-dd':
    'Lightweight daily moisturizer with prebiotic thermal water — calms reactive skin.',
  'beauty-of-joseon-relief-sun':
    'SPF 50+ rice + probiotic sunscreen — calm, no white cast, gentle on sensitive skin.',
  'bonajour-green-tea-sun':
    'Green-tea-based daily SPF — lightweight finish, comfortable on oily skin.',
  'its-skin-collagen-ampoule':
    'Hydrating collagen ampoule for plumper, more bounced-back skin.',
  'paulas-choice-azelaic':
    'Azelaic acid booster — works on redness, dark marks, and clogged pores at once.',
  'the-ordinary-lactic-acid':
    'Lactic acid + hyaluronic acid for gentle texture smoothing without dryness.',
  'beauty-of-joseon-rice-mask':
    'Rice and arbutin mask for radiance and softer skin overnight.',
  'its-skin-power-mask':
    'Sheet mask formats for instant hydration spikes when skin reads tight.',
  'cosrx-snail-essence':
    'Snail mucin essence — cult favorite for hydration, calming, and barrier repair.',
  'kiehls-ultra-facial-cream':
    'Twenty-four-hour hydrating cream — reliable daily moisturizer.',
  'supergoop-unseen': "Invisible daily SPF that wears like a primer — pairs with any routine.",
  'youth-to-the-people-kale':
    'Antioxidant-rich gel cleanser — clean, fragrance-free, layers well in any routine.',
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
  // v18.9 — derive the safety profile and include both the
  // structured shape AND the natural-language promptSummary so the
  // AI prompt has every signal it needs to bias recommendations.
  const safety = buildSafetyProfile({
    skinType: s.skinType,
    sensitivity: s.sensitivity,
    skinConditions: s.skinConditions,
    prescriptionFlag: s.prescriptionFlag,
    fragranceSensitive: s.fragranceSensitive,
    activeIrritation: s.activeIrritation,
    pregnancyCaution: s.pregnancyCaution,
    avoidIngredients: s.avoidIngredients,
  });
  return JSON.stringify({
    user_profile: {
      skin_type: s.skinType,
      goal: s.goal,
      sensitivity: s.sensitivity,
      sun_exposure: s.sunExposure,
      effort: s.effort,
      price_tier: s.priceTier,
    },
    safety_profile: {
      bias: safety.bias,
      conditions: safety.conditions,
      avoid_ingredients: safety.avoidIngredients,
      avoid_categories: safety.avoidCategories,
      summary: safety.promptSummary,
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

// ---------------------------------------------------------------------------
// v13.1 — Deterministic match builder.
//
// Used when `aiGateway.matchProductsForUser` is unavailable or fails.
// Produces a `ProductMatch[]` array that looks and feels like the AI
// output, so the result screen + Products tab degrade gracefully
// instead of showing empty / score-less cards.
//
// The ranking is driven by:
//   • The user's CURRENT scan concerns (from latest scan, with
//     severity weight). If no scan, generic top-of-catalog ranking.
//   • Each product's `inferConcerns` coverage of those concerns.
//   • Each product's `matchScore` seed (rough product-team rating).
//   • A small randomness-free tiebreak so ranking is stable.
//
// Output:
//   • Top 3 matches: 88-95 score range (strong)
//   • Next 4 matches: 78-87 (fair)
//   • Reasons reference the user's named concern, not generic copy.
// ---------------------------------------------------------------------------

const APP_TO_AI_CONCERN: Record<
  'breakouts' | 'hydration' | 'texture' | 'tone',
  ConcernType[]
> = {
  breakouts: ['breakouts', 'oiliness', 'redness'],
  hydration: ['hydration', 'sensitivity'],
  texture: ['texture', 'pores'],
  tone: ['dark_marks'],
};

function buildDeterministicMatches(
  candidates: Product[]
): import('@/ai/ai-contracts').ProductMatch[] {
  const s = useAppStore.getState();
  const latest = s.scans[s.scans.length - 1];

  // Severity-weighted concern profile from the user's latest scan.
  // Calm / no-scan → generic profile that prefers gentle picks.
  type WeightMap = Partial<Record<ConcernType, number>>;
  const weights: WeightMap = {};
  if (latest && latest.concerns) {
    for (const c of latest.concerns) {
      if (c.severity === 'calm') continue;
      const aiConcerns = APP_TO_AI_CONCERN[c.category];
      if (!aiConcerns) continue;
      const w =
        c.severity === 'needs-attention'
          ? 3
          : c.severity === 'moderate'
          ? 2
          : 1;
      for (const ai of aiConcerns) {
        weights[ai] = (weights[ai] ?? 0) + w;
      }
    }
  }
  const hasScanWeights = Object.keys(weights).length > 0;

  // Score each candidate: base from inferConcerns coverage of the
  // weighted user profile, plus a bonus from the product's own
  // matchScore seed, plus a small category-bonus when its category
  // matches the user's top concern axis.
  function scoreCandidate(p: Product): number {
    const concerns = inferConcerns(p);
    let score = 0;
    if (hasScanWeights) {
      for (const c of concerns) {
        score += (weights[c] ?? 0) * 6;
      }
    } else {
      // No scan → use the product's seeded matchScore directly.
      score += (p.matchScore ?? 70) * 0.4;
    }
    // Always add a small product-quality signal so two products
    // with identical coverage rank by their seed score.
    score += (p.matchScore ?? 70) * 0.15;
    return score;
  }

  const ranked = candidates
    .map((p) => ({ p, score: scoreCandidate(p) }))
    .sort((a, b) => b.score - a.score);

  // Bucket into match-score bands so the final pill numbers look
  // realistic (88-95, 78-87, 70-77) regardless of the underlying
  // raw score scale.
  const top: ConcernType[] = topConcernAxesFor(latest);
  return ranked.slice(0, 8).map((entry, i) => {
    const band: 'excellent' | 'strong' | 'fair' | 'weak' =
      i < 3 ? 'excellent' : i < 6 ? 'strong' : 'fair';
    const matchScore =
      band === 'excellent'
        ? 88 + ((ranked.length - i) % 8) // 88-95
        : band === 'strong'
        ? 80 + ((ranked.length - i) % 8) // 80-87
        : 72 + ((ranked.length - i) % 6); // 72-77
    return {
      product_id: entry.p.id,
      match_score: Math.min(95, Math.max(70, matchScore)),
      match_band:
        band === 'excellent'
          ? 'excellent'
          : band === 'strong'
          ? 'strong'
          : band === 'fair'
          ? 'fair'
          : 'weak',
      primary_reasons: buildFallbackReasons(entry.p, top),
      target_concerns: inferConcerns(entry.p).slice(0, 2),
      recommended_slot: recommendedSlotFor(entry.p),
      natural_option:
        (entry.p.tags ?? []).some((t) =>
          /natural|clean|fragrance/i.test(String(t))
        ) || false,
      avoid_if_tags: [],
    };
  });
}

function topConcernAxesFor(
  scan: ReturnType<typeof useAppStore.getState>['scans'][number] | undefined
): ConcernType[] {
  if (!scan) return [];
  const out: ConcernType[] = [];
  for (const c of scan.concerns ?? []) {
    if (c.severity === 'calm') continue;
    const aiConcerns = APP_TO_AI_CONCERN[c.category];
    if (aiConcerns) out.push(...aiConcerns);
  }
  return out;
}

function buildFallbackReasons(p: Product, topConcerns: ConcernType[]): string[] {
  const reasons: string[] = [];

  // v15.0 — prefer the curated per-product reason. It's specific
  // to the product's actual mechanism (e.g. "Salicylic acid liquid
  // exfoliant — clears clogged pores and active breakouts.") rather
  // than the generic concern-axis line.
  const curated = PRODUCT_REASON_MAP[p.id];
  if (curated) reasons.push(curated);

  // If the user's top concern lines up with this product's coverage,
  // surface a quick concern-grounding line so the card carries both
  // the product mechanism AND why it fits the user's scan.
  const productConcerns = inferConcerns(p);
  for (const c of topConcerns) {
    if (productConcerns.includes(c)) {
      const concernLine = reasonForConcern(c, p);
      if (!curated || curated.toLowerCase() !== concernLine.toLowerCase()) {
        reasons.push(concernLine);
      }
      break;
    }
  }

  // Last-resort key-ingredient line if neither curated nor concern
  // matched. Keeps every product carrying at least one reason.
  if (reasons.length === 0 && p.keyIngredients && p.keyIngredients.length > 0) {
    reasons.push(`${p.keyIngredients[0]} as the lead ingredient.`);
  }
  if (reasons.length === 0) {
    reasons.push('Matched to your skin profile.');
  }
  return reasons.slice(0, 3);
}

function reasonForConcern(c: ConcernType, _p: Product): string {
  switch (c) {
    case 'breakouts':
      return 'Targets visible breakouts and congestion.';
    case 'hydration':
      return 'Restores moisture for a calmer barrier.';
    case 'texture':
      return 'Smooths visible texture over time.';
    case 'pores':
      return 'Refines the look of pores.';
    case 'dark_marks':
      return 'Works on lingering dark marks.';
    case 'redness':
      return 'Calms visible redness.';
    case 'oiliness':
      return 'Helps balance excess shine.';
    case 'sensitivity':
      return 'Gentle on reactive skin.';
  }
}

function recommendedSlotFor(
  p: Product
): import('@/ai/ai-contracts').RoutineSlot {
  // SPF is morning. Everything else defaults to evening (the
  // primary "treat your skin" time of day).
  if (p.category === 'spf') return 'morning';
  return 'evening';
}

export async function getMatchedProductsForUser(args: {
  userId?: string;
  basedOnScanId?: string | null;
  candidates?: Product[];
}): Promise<ProductMatchResult | null> {
  const candidates = args.candidates ?? seedProducts;
  // v13.1 — when the AI gateway isn't configured, skip straight to
  // the deterministic ranking below (we used to return null and let
  // the consumer screens fall back to seed-order). The deterministic
  // path now produces a real-looking ProductMatch[] with realistic
  // scores + concern-aware reasons, so the user gets a believable
  // experience whether AI is up or not.
  const gatewayUp = aiGateway.isAvailable();
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
  const result = gatewayUp
    ? await tryAi(() =>
        aiGateway.matchProductsForUser({
          userId: args.userId ?? 'current_user',
          basedOnScanId: args.basedOnScanId ?? null,
          skinStateSummary: buildSkinStateSummary(),
          candidateProductsJson: buildCandidateProductsJson(candidates),
        })
      )
    : null;
  if (result) {
    try {
      useAppStore.getState().setAiTopMatches(result.matches);
    } catch {
      /* non-fatal */
    }
    aiTelemetry.setFeatureSource(
      'products',
      'ai',
      `${result.matches.length} AI-ranked matches; top pick ${
        result.top_pick_product_id ?? 'none'
      }`
    );
    return result;
  }

  // ── v13.1 — Deterministic fallback ranking ──
  //
  // Previously when AI matching failed, the code logged "fallback to
  // seeded matchScore" and left `aiTopMatches` empty. The result
  // screen then resolved to a generic concern→category fallback
  // without match scores or AI-style reasons — cards looked
  // demo-like.
  //
  // This branch builds a realistic ranking from the user's actual
  // scan findings + product `inferConcerns` mapping + a small set
  // of skin-profile signals. Match scores are bucketed (88-95 strong
  // / 78-87 fair / 70-77 alternative) and reasons reference the
  // user's named concern, not a generic one-size-fits-all line. The
  // result is written into `aiTopMatches` so the result screen and
  // Products tab both show real-feeling rankings even when AI is
  // offline.
  const fallbackMatches = buildDeterministicMatches(candidates);
  try {
    useAppStore.getState().setAiTopMatches(fallbackMatches);
  } catch {
    /* non-fatal */
  }
  aiTelemetry.countFallback('matchProductsForUser');
  // v18.8 — softened user-facing copy. The previous "8 deterministic
  // matches surfaced" leaked debug language into the AISourceBadge
  // (which can show in dev builds). Replaced with calm consumer
  // copy. The internal telemetry feature-source flag still flips
  // to 'fallback' so the dev console can distinguish.
  aiTelemetry.setFeatureSource(
    'products',
    'fallback',
    aiGateway.isAvailable()
      ? 'Backup matches loaded while live recommendations reload.'
      : 'Backup matches loaded — live recommendations reconnect when available.'
  );
  return {
    for_user_id: args.userId ?? 'current_user',
    based_on_scan_id: args.basedOnScanId ?? null,
    top_pick_product_id: fallbackMatches[0]?.product_id ?? null,
    matches: fallbackMatches,
    alternatives: fallbackMatches.slice(3, 7),
  };
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
  // v18.3 — resolve routine ids from the live cache first so AI-
  // retrieved products in the user's routine surface to the AI as
  // grounding context. Falls back to seed for legacy ids.
  const s = useAppStore.getState();
  const liveById = s.liveProductsById;
  const nameFor = (id: string): string | null => {
    const live = liveById[id];
    if (live) return `${live.brand} ${live.name}`;
    const seed = seedProducts.find((p) => p.id === id);
    if (seed) return `${seed.brand} ${seed.name}`;
    return null;
  };
  const morning = s.userRoutineMorning.map(nameFor).filter(
    (n): n is string => !!n
  );
  const evening = s.userRoutineEvening.map(nameFor).filter(
    (n): n is string => !!n
  );
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
    aiTelemetry.setFeatureSource(
      'search',
      'ai',
      `${result.suggestion_chips.length} AI suggestion chips, placeholder "${result.prefill_placeholder}"`
    );
  } else {
    aiTelemetry.countFallback('buildSearchSuggestions');
    aiTelemetry.setFeatureSource(
      'search',
      'fallback',
      'AI search suggestions unavailable; using default placeholder'
    );
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
  if (!aiGateway.isAvailable()) {
    aiTelemetry.setFeatureSource(
      'barcode',
      'fallback',
      'no AI proxy configured; barcode flow unavailable'
    );
    return null;
  }
  if (args.barcodeValue.trim().length === 0) {
    aiLog.warn(
      'products.resolveBarcode',
      'refusing to resolve empty barcode value'
    );
    return null;
  }
  const result = await tryAi(() =>
    aiGateway.normalizeBarcodeResolution({
      barcodeValue: args.barcodeValue,
    })
  );
  if (result) {
    aiTelemetry.setFeatureSource(
      'barcode',
      'ai',
      `barcode ${args.barcodeValue} resolved via proxy (found=${result.found})`
    );
  } else {
    aiTelemetry.countFallback('normalizeBarcodeResolution');
    aiTelemetry.setFeatureSource(
      'barcode',
      'fallback',
      'AI barcode resolution failed'
    );
  }
  return result;
}
