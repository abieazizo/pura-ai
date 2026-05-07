/**
 * v18.0 — Live product retrieval orchestrator.
 *
 * The user-facing replacement for the seed-catalog-as-primary-
 * inventory pattern. The 24-product seed catalog is now reduced to
 * an emergency fallback used only when:
 *   1. The proxy is unreachable, AND
 *   2. The live cache is empty for this query.
 *
 * Public surface:
 *   • lookupLiveProducts(query, opts?)       — free-text search
 *   • lookupForScan(scan, opts?)             — scan-driven retrieval
 *   • lookupForConcern(category, opts?)      — concern-only path
 *   • clearLiveProductCache()                — dev / debugging
 *
 * All return `LiveProductCandidate[]` ordered by `matchScore` desc.
 *
 * Cache strategy:
 *   • In-memory map keyed by a stable cache key derived from the
 *     query + scan-id + category. TTL = 30 minutes. Invalidated on
 *     a new scan (the scan id is part of the key, so the next scan
 *     misses the old cache naturally).
 *   • Cached entries are returned synchronously when warm; cold
 *     queries fire the AI call. The cache lives in module scope so
 *     screen remounts don't refetch.
 *
 * URL safety:
 *   • If the AI returned `productUrl` we trust it ONLY when the host
 *     matches a known retailer / brand domain whitelist. Unknown or
 *     malformed URLs are dropped to null and replaced at render time
 *     with a search-on-merchant CTA.
 */

import type { Scan } from '@/types';
import type {
  ConcernType,
  LiveProductCandidate,
  LiveProductLookupResult,
} from '@/ai/ai-contracts';
import { aiGateway } from '@/ai/aiGateway';
import { aiLog } from '@/ai/aiLog';
import { aiTelemetry } from '@/ai/aiTelemetry';
import { useAppStore } from '@/store/useAppStore';

/**
 * v18.1 — every successful retrieval writes the candidate set into
 * the shared store cache so ProductDetail / Home / browse-by-goal /
 * the assistant all resolve by id from a single source of truth.
 */
function cacheCandidates(candidates: LiveProductCandidate[]) {
  if (candidates.length === 0) return;
  try {
    useAppStore.getState().cacheLiveProducts(candidates);
  } catch {
    /* never break the retrieval path on a cache write */
  }
}

// ---------------------------------------------------------------------------
// Cache.
// ---------------------------------------------------------------------------

interface CacheEntry {
  at: number;
  candidates: LiveProductCandidate[];
  confidence: LiveProductLookupResult['confidence'];
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const cache = new Map<string, CacheEntry>();

function cacheKey(args: {
  query: string;
  scanId?: string | null;
  category?: string | null;
  /**
   * v19.12 — count is part of the key. Without this, the v19.11
   * hero-first pattern collided silently: the hero call (count=1)
   * wrote `[hero]` to cache, the alternatives call (count=4) read
   * the same key, got `[hero]` back, dedup'd against the hero id
   * → empty array → alternatives never loaded. Including count
   * gives hero and alternatives separate cache entries.
   */
  count?: number;
}): string {
  return [
    'lp',
    args.query.toLowerCase().trim().replace(/\s+/g, '_'),
    args.scanId ?? '_',
    args.category ?? '_',
    `n${args.count ?? 0}`,
  ].join('|');
}

function readCache(key: string): LiveProductCandidate[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.candidates;
}

function writeCache(
  key: string,
  candidates: LiveProductCandidate[],
  confidence: LiveProductLookupResult['confidence']
) {
  cache.set(key, { at: Date.now(), candidates, confidence });
}

export function clearLiveProductCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// v18.6 — URL safety + commerce enrichment moved to the shared
// module `src/lib/commerceEnrichment.ts`. Both the proxy server
// handler and the client orchestrator import the same helpers, so
// a direct curl POST to /lookupLiveProducts now sees enriched
// candidates (the v18.5 bug was that enrichment lived only here).
// ---------------------------------------------------------------------------

import {
  sanitizeAndEnrich,
  sephoraSearchUrl,
} from '@/lib/commerceEnrichment';
import { buildSafetyProfile } from '@/utils/safetyProfile';

/**
 * Build a Sephora search URL keyed by brand + name. Re-exported for
 * the card-render layer's click-time fallback.
 */
export function buildSearchUrl(candidate: LiveProductCandidate): string {
  return sephoraSearchUrl(candidate.brand, candidate.name);
}

/**
 * v19.13 — defensive dedup. The AI's lean schema doesn't enforce
 * id uniqueness across candidates, and brand/name collisions in
 * its corpus do happen on rare occasions. We dedup by:
 *   1. Exact id match (canonical case).
 *   2. Brand+name slug fallback (catches the case where the AI
 *      returns the same product under two slightly different ids).
 * Preserves order — the first occurrence wins, which is what the
 * matchScore sort already guarantees.
 */
function dedupCandidates(
  candidates: LiveProductCandidate[]
): LiveProductCandidate[] {
  const seenIds = new Set<string>();
  const seenBrandName = new Set<string>();
  const out: LiveProductCandidate[] = [];
  for (const c of candidates) {
    const id = (c.id ?? '').trim().toLowerCase();
    const brandName = `${(c.brand ?? '').trim().toLowerCase()}::${(
      c.name ?? ''
    )
      .trim()
      .toLowerCase()}`;
    if (id.length > 0 && seenIds.has(id)) continue;
    if (brandName !== '::' && seenBrandName.has(brandName)) continue;
    if (id.length > 0) seenIds.add(id);
    if (brandName !== '::') seenBrandName.add(brandName);
    out.push(c);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public retrieval API.
// ---------------------------------------------------------------------------

export interface LookupOpts {
  /** Optional explicit scan id used for cache scoping. */
  scanId?: string | null;
  /** Override the default candidate count (default 4 in v19.9; was 8). */
  count?: number;
  /** When true, bypass the cache. Default false. */
  fresh?: boolean;
}

/**
 * Free-text live retrieval. Used by ProductsScreen search and the
 * AI Assistant when the user asks an explicit product question.
 */
export async function lookupLiveProducts(
  query: string,
  opts: LookupOpts = {}
): Promise<LiveProductCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const requestedCount = opts.count ?? 4;
  const key = cacheKey({
    query: trimmed,
    scanId: opts.scanId ?? null,
    count: requestedCount,
  });
  const t0 = Date.now();
  if (!opts.fresh) {
    const hit = readCache(key);
    if (hit) {
      aiLog.info('liveProducts', 'cache hit', {
        query: trimmed,
        n: hit.length,
      });
      cacheCandidates(hit);
      return hit;
    }
  }
  if (!aiGateway.isAvailable()) {
    aiLog.warn('liveProducts', 'gateway unavailable, returning empty', {
      query: trimmed,
    });
    aiTelemetry.countFallback('lookupLiveProducts');
    return [];
  }
  // v18.9 — append the user's safety profile to the search query
  // so the model biases ranking toward gentle / barrier-supportive
  // options when the user has flagged a condition. Pure ingredient
  // / brand queries ("niacinamide", "salicylic acid") still
  // surface the canonical answer; the safety bias just nudges
  // ranking, not exclusion.
  let composedQuery = trimmed;
  try {
    const s = useAppStore.getState();
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
    if (safety.hasSignal) {
      composedQuery = `${trimmed}. SAFETY: ${safety.promptSummary}`;
    }
  } catch {
    /* keep base query */
  }
  try {
    const result = await aiGateway.lookupLiveProducts({
      query: composedQuery,
      // v19.9 — default 8 → 4. The result screen only needs ONE
      // hero + ≤3 alternatives; halving the candidate count halves
      // output tokens directly and brings the call inside a 25s
      // budget. Free-text callers can still override.
      count: requestedCount,
    });
    const sanitized = dedupCandidates(
      sanitizeAndEnrich(result.candidates).sort(
        (a, b) => b.matchScore - a.matchScore
      )
    );
    writeCache(key, sanitized, result.confidence);
    cacheCandidates(sanitized);
    aiLog.info('liveProducts', 'AI live retrieval ok', {
      query: trimmed,
      n: sanitized.length,
      requestedCount,
      durationMs: Date.now() - t0,
      confidence: result.confidence,
    });
    aiTelemetry.setFeatureSource(
      'products',
      'ai',
      `live retrieval ${sanitized.length} picks (${result.confidence})`
    );
    return sanitized;
  } catch (e) {
    aiLog.warn('liveProducts', 'AI live retrieval failed', {
      query: trimmed,
      requestedCount,
      durationMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    });
    aiTelemetry.countFallback('lookupLiveProducts');
    return [];
  }
}

/**
 * Scan-driven retrieval. The HIGHEST-priority path: this is what
 * ScanResultsFaceScreen calls to populate hero + alternatives after
 * a fresh scan completes. Builds an AI-shaped query from the scan's
 * primary concern + region + severity + skin context so the model
 * understands what to recommend without us having to pre-rank.
 */
export async function lookupForScan(
  scan: Scan,
  opts: LookupOpts = {}
): Promise<LiveProductCandidate[]> {
  const ai = scan.aiAnalysis;
  if (!ai) {
    // v19.4 — defensive free-text fallback. Previous version
    // returned [] which left every consumer screen stuck on its
    // empty state when the scan didn't carry an AI analysis.
    // Now we synthesise a query from the legacy `concerns` array
    // (which every scan has) and call the free-text lookup.
    const concerns = scan.concerns ?? [];
    const top = concerns.find((c) => c.severity !== 'calm') ?? concerns[0];
    const fallbackQuery = top
      ? `best products for ${top.severity} ${
          top.category === 'tone' ? 'dark marks' : top.category
        } on the ${top.region.replace(/across the face/i, 'face')}`
      : 'best gentle daily skincare products for balanced skin';
    aiLog.warn(
      'liveProducts',
      'scan has no aiAnalysis; using free-text fallback',
      { scanId: scan.id, query: fallbackQuery }
    );
    return lookupLiveProducts(fallbackQuery, {
      // v19.9 — 6 → 4 to match the new fast-path target.
      count: opts.count ?? 4,
      fresh: opts.fresh,
    });
  }
  const primary = ai.primary_concern ?? 'overall_skin';
  const region = ai.findings[0]?.regions[0] ?? 'across_face';
  const severity = ai.findings[0]?.severity ?? 'mild';
  const sensitivities = ai.plan_inputs.contraindication_tags;
  // v18.9 — pull the safety profile and bias the live retrieval
  // toward gentler / barrier-supportive products when flagged.
  let safetyOverride: ReturnType<typeof buildSafetyProfile> | null = null;
  try {
    const s = useAppStore.getState();
    safetyOverride = buildSafetyProfile({
      skinType: s.skinType,
      sensitivity: s.sensitivity,
      skinConditions: s.skinConditions,
      prescriptionFlag: s.prescriptionFlag,
      fragranceSensitive: s.fragranceSensitive,
      activeIrritation: s.activeIrritation,
      pregnancyCaution: s.pregnancyCaution,
      avoidIngredients: s.avoidIngredients,
    });
  } catch {
    /* keep null */
  }
  const query = [
    `Recommend products for ${primary.replace('_', ' ')}`,
    region !== 'across_face' ? `on the ${region.replace('_', ' ')}` : null,
    severity !== 'mild' && severity !== 'low'
      ? `(severity: ${severity})`
      : null,
    sensitivities.length > 0
      ? `avoid: ${sensitivities.slice(0, 3).join(', ')}`
      : null,
    safetyOverride && safetyOverride.hasSignal
      ? `SAFETY: ${safetyOverride.promptSummary}`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  const requestedCount = opts.count ?? 4;
  const key = cacheKey({
    query,
    scanId: opts.scanId ?? scan.id,
    category: primary,
    count: requestedCount,
  });
  const t0 = Date.now();
  if (!opts.fresh) {
    const hit = readCache(key);
    if (hit) {
      aiLog.info('liveProducts', 'scan cache hit', {
        scanId: scan.id,
        n: hit.length,
        requestedCount,
      });
      cacheCandidates(hit);
      return hit;
    }
  }
  if (!aiGateway.isAvailable()) {
    aiTelemetry.countFallback('lookupLiveProducts');
    return [];
  }
  try {
    const result = await aiGateway.lookupLiveProducts({
      query,
      // v19.9 — default 8 → 4. Same reasoning as the free-text path:
      // result screen needs hero + ≤3 alternatives, the fast budget
      // (25s client / 2048 tokens server) doesn't accommodate 8 with
      // the lean schema's reasoning headroom.
      count: requestedCount,
      scanContext: {
        primary_concern: ai.primary_concern,
        secondary_concerns: ai.secondary_concerns,
        severity_band: ai.skin_score.band,
        regions: ai.findings.flatMap((f) => f.regions).slice(0, 6),
        skin_type: 'unknown',
        sensitivities,
      },
    });
    const sanitized = dedupCandidates(
      sanitizeAndEnrich(result.candidates).sort(
        (a, b) => b.matchScore - a.matchScore
      )
    );
    writeCache(key, sanitized, result.confidence);
    cacheCandidates(sanitized);
    aiLog.info('liveProducts', 'scan live retrieval ok', {
      scanId: scan.id,
      n: sanitized.length,
      requestedCount,
      durationMs: Date.now() - t0,
      confidence: result.confidence,
    });
    aiTelemetry.setFeatureSource(
      'products',
      'ai',
      `scan-driven live retrieval ${sanitized.length} picks (${result.confidence})`
    );
    return sanitized;
  } catch (e) {
    aiLog.warn('liveProducts', 'scan live retrieval failed', {
      scanId: scan.id,
      requestedCount,
      durationMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    });
    aiTelemetry.countFallback('lookupLiveProducts');
    return [];
  }
}

/**
 * Concern-only retrieval (no scan context). Used by ProductsScreen
 * goal feeds when the user is browsing a category page like
 * "redness relief" without a scan grounding it.
 */
export async function lookupForConcern(
  concern: ConcernType,
  opts: LookupOpts = {}
): Promise<LiveProductCandidate[]> {
  const phrase: Record<ConcernType, string> = {
    breakouts: 'best products for breakouts and clogged pores',
    redness: 'best products for redness and inflammation',
    hydration: 'best hydrating products for dry skin',
    texture: 'best products for skin texture and smoothness',
    dark_marks: 'best products for dark marks and pigmentation',
    oiliness: 'best products for oily skin',
    sensitivity: 'best gentle products for sensitive skin',
    pores: 'best products for visible pores',
  };
  return lookupLiveProducts(phrase[concern], opts);
}

// ---------------------------------------------------------------------------
// v19.15 — Canonical recommendation pipeline.
//
// `getRecommendationContext()` is the new public entry point that
// replaces direct consumer calls to `lookupForScan` /
// `lookupLiveProducts` for any surface that wants the FINAL
// hero+alternatives split, the deterministic local rerank, and
// truthful availability state in one object.
//
// Pipeline:
//   1. Deterministic candidate retrieval — calls the existing
//      cache-aware `lookupForScan` / `lookupLiveProducts` (which
//      already hit gpt-4o-mini, dedup, and sanitize+enrich).
//   2. Compose canonical UserProfileContext from the store.
//   3. Compose canonical SkinState from the scan when present.
//   4. Run the deterministic local scorer on every candidate
//      (concern alignment, skin-type fit, budget, safety penalty).
//   5. Pick hero by local score, alternatives = next 4 (excl hero).
//   6. Wrap in RecommendationContext with truthful availability
//      + deterministic whyHeroFits + whatToAvoid.
//
// Consumers (ScanResultsFaceScreen, ProductsScreen, AssistantScreen)
// read RecommendationContext directly. They never re-implement
// the rerank.
// ---------------------------------------------------------------------------

import {
  buildRecommendationContext,
  scoreCandidateLocal,
  selectSkinState,
  selectUserProfileContext,
} from '@/state/canonical';
import type {
  RecommendationAvailability,
  RecommendationContext,
  RecommendationIntent,
} from '@/types/canonical';
import type { AIRerankResult } from '@/ai/ai-contracts';
// v19.17 — deterministic seed catalog retrieval. v19.23 — now
// fallback only; OBF live search is the primary path.
import {
  filterUsableCandidates,
  retrieveSeedCandidates,
} from './seedRetrieval';
// v19.23 — Open Beauty Facts live search. Real non-AI live source.
import { searchOpenBeautyFacts } from './openBeautyFactsSearch';

export interface GetRecommendationOpts extends LookupOpts {
  intent: RecommendationIntent;
  /**
   * v19.17 — opt-in flag to augment the deterministic seed
   * catalog with AI-generated live candidates. Defaults to
   * `false` so the primary path is fully deterministic. Set
   * to `true` only when a caller has a specific reason to
   * widen the candidate set (e.g. a niche query that the
   * 24-product seed catalog can't answer cleanly).
   */
  allowAiAugmentation?: boolean;
}

// ---------------------------------------------------------------------------
// v19.17 — Deterministic-first pipeline.
//
// The previous v19.15 stack RAN every recommendation through
// `lookupForScan` / `lookupLiveProducts` (AI retrieval) even when
// the seed catalog could have answered. v19.17 inverts the order:
//
//   STEP A — Deterministic retrieval from `retrieveSeedCandidates`
//   STEP B — Normalization (handled inside the seed adapter +
//            sanitizeAndEnrich for any AI-augmented candidates)
//   STEP C — Filtering: drop unusable candidates (no productUrl,
//            no brand+name) via `filterUsableCandidates`.
//   STEP D — Dedupe: existing `dedupCandidates` (id + brand+name).
//   STEP E — Local score: existing `scoreCandidateLocal` inside
//            `buildRecommendationContext` (concern alignment +
//            skin-type fit + budget + safety penalties).
//   STEP F — AI rerank top N: deferred. The deterministic local
//            score + the seed product's existing description fields
//            (used by canonical's `buildWhyHeroFits`) provides a
//            credible hero + whyHeroFits today. A future v19.18+
//            can plug in an explicit AI rerank gateway method
//            without touching the consumer surfaces — the rerank
//            result type is `AIRerankResult` (heroId, alternativeIds,
//            whyHeroFits) and slots into `buildRecommendationContext`
//            via the existing `rerankScores` field.
//   STEP G — Final assembly: `buildRecommendationContext` from
//            canonical state.
//
// AI is no longer in the retrieval path. AI is no longer responsible
// for full product objects. AI is no longer responsible for ranking.
// AI is reserved (in a future PR) for optional rerank/explanation
// only.
// ---------------------------------------------------------------------------

const APP_CONCERN_TO_AI_CONCERN: Record<string, ConcernType> = {
  breakouts: 'breakouts',
  hydration: 'hydration',
  texture: 'texture',
  tone: 'dark_marks',
  redness: 'redness',
  oiliness: 'oiliness',
  sensitivity: 'sensitivity',
  pores: 'pores',
};

/**
 * v19.18 — Step F. Optional AI rerank wrapper. Takes the top
 * deterministic candidates + canonical context, calls the gateway's
 * tiny `rerankProducts` method, and returns the rerank result.
 *
 * Failure-resilient: any error returns null so the caller falls
 * back to the deterministic local-score order. The AI rerank is
 * BEST-EFFORT — never blocking.
 */
async function tryRerankProducts(args: {
  candidates: LiveProductCandidate[];
  profile: ReturnType<typeof selectUserProfileContext>;
  skinState: ReturnType<typeof selectSkinState>;
  intentLabel: string;
}): Promise<AIRerankResult | null> {
  const { candidates, profile, skinState, intentLabel } = args;
  if (!aiGateway.isAvailable() || candidates.length === 0) return null;
  // Trim to top 8 by deterministic localScore — rerank only the
  // strongest candidates so the call stays cheap.
  const scored = candidates
    .map((c) => ({
      c,
      localScore: scoreCandidateLocal(c, profile, skinState),
    }))
    .sort((a, b) => b.localScore - a.localScore)
    .slice(0, 8);
  if (scored.length === 0) return null;
  const payload = {
    candidates: scored.map(({ c, localScore }) => ({
      id: c.id,
      brand: c.brand,
      name: c.name,
      category: c.category ?? null,
      concernTags: c.concernTags ?? [],
      ingredientsHighlights: c.ingredientsHighlights ?? [],
      shortDescription: c.shortDescription ?? '',
      price: c.price ?? null,
      localScore,
    })),
    profile: {
      displayName: profile.displayName,
      skinType: profile.skinType,
      sensitivities: profile.sensitivities,
      goals: profile.goals,
    },
    primaryConcern: skinState?.topConcerns[0]?.concern ?? null,
    severityBand: skinState?.scoreBand ?? null,
    intentLabel,
  };
  try {
    return await aiGateway.rerankProducts(payload);
  } catch (e) {
    aiLog.warn('liveProducts.rerank', 'AI rerank failed; falling back to local order', {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

function inferConcernFromQuery(query: string): ConcernType | null {
  const q = query.toLowerCase();
  if (/breakout|acne|spot|pimple|clog/.test(q)) return 'breakouts';
  if (/redness|rosacea|irritation/.test(q)) return 'redness';
  if (/dry|hydrat|moistur/.test(q)) return 'hydration';
  if (/texture|smooth|rough|exfoli/.test(q)) return 'texture';
  if (/dark mark|pigment|brighten|dark spot/.test(q)) return 'dark_marks';
  if (/oily|oil control|matt/.test(q)) return 'oiliness';
  if (/sensitive|gentle|fragrance/.test(q)) return 'sensitivity';
  if (/pore/.test(q)) return 'pores';
  return null;
}

/**
 * v19.23 — REAL live retrieval restored via Open Beauty Facts (OBF).
 * OBF is a public, no-auth, no-AI search/database for cosmetic
 * products. The engine now:
 *   1. tries OBF search first (5s timeout, never blocks longer)
 *   2. falls back to seed catalog when OBF fails / empty
 *   3. tags retrievalSource as 'live' (OBF) or 'fallback' (seed)
 * Crucially: the AI proxy is NOT in the path. OBF's failure does
 * NOT surface as `AIProxyError` and does not depend on the
 * Metro middleware proxy.
 */

/**
 * Best-effort OBF live search wrapper. Catches network/timeout
 * failures and returns null so the caller can fall through to
 * the seed catalog. Never throws.
 */
async function tryLiveSearch(
  query: string
): Promise<{ candidates: LiveProductCandidate[]; failure: string | null }> {
  if (!query || query.trim().length === 0) {
    return { candidates: [], failure: null };
  }
  try {
    const cs = await searchOpenBeautyFacts({ query, pageSize: 12 });
    return { candidates: cs, failure: null };
  } catch (e) {
    return {
      candidates: [],
      failure: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Free-text → RecommendationContext.
 *
 * v19.23 — LIVE-FIRST via Open Beauty Facts:
 *   STEP A.LIVE     — searchOpenBeautyFacts(query)  (5s bounded)
 *   STEP A.FALLBACK — retrieveSeedCandidates(query) (synchronous)
 *
 * If OBF returns ≥1 valid candidate → retrievalSource: 'live'.
 * If OBF fails/empty → seed catalog with retrievalSource:
 * 'fallback' and `failureReason` set so diagnostics can see
 * exactly why we fell back.
 */
export async function getRecommendationContextFromQuery(
  query: string,
  opts: Omit<GetRecommendationOpts, 'intent'> & {
    intent?: RecommendationIntent;
    allowAiAugmentation?: boolean;
  } = {}
): Promise<RecommendationContext> {
  const intent: RecommendationIntent = opts.intent ?? {
    kind: 'query',
    text: query,
  };
  const state = useAppStore.getState();
  const profile = selectUserProfileContext(state);
  const inferredConcern = inferConcernFromQuery(query);

  let candidates: LiveProductCandidate[] = [];
  let retrievalSource: 'live' | 'fallback' | 'empty' = 'empty';
  let failureReason: string | null = null;

  // STEP A.LIVE — Open Beauty Facts search, real public source.
  const live = await tryLiveSearch(query);
  if (live.candidates.length > 0) {
    candidates = live.candidates;
    retrievalSource = 'live';
  } else {
    // OBF failed or returned nothing for this query. Fall back.
    failureReason = live.failure;
  }

  // STEP A.FALLBACK — seed catalog when OBF didn't deliver.
  if (candidates.length === 0) {
    candidates = retrieveSeedCandidates({
      query,
      concern: inferredConcern,
      limit: 12,
      rotation: opts.fresh ? Math.floor(Date.now() / 1000) : 0,
    });
    retrievalSource = candidates.length > 0 ? 'fallback' : 'empty';
  }

  // STEP B-D — normalize, filter, dedupe.
  const filtered = filterUsableCandidates(candidates);
  const deduped = dedupCandidates(filtered);

  // STEP F (AI rerank) remains DEFERRED — non-blocking refinement.
  const rerank = null;

  // STEP E + G — local score + canonical assembly.
  const availability: RecommendationAvailability =
    deduped.length > 0 ? 'available' : 'empty';

  return buildRecommendationContext({
    intent,
    candidates: deduped,
    profile,
    skinState: null,
    state: availability,
    failureReason: failureReason ?? undefined,
    rerankResult: rerank,
    retrievalSource: deduped.length > 0 ? retrievalSource : 'empty',
  });
}

/**
 * Scan-driven → RecommendationContext.
 *
 * v19.23 — LIVE-FIRST via Open Beauty Facts. The scan's primary
 * concern + a small concern-shaped query string drive an OBF
 * search; on success we surface real cosmetic products. On
 * failure we fall back to the seed catalog scoped to the
 * primary concern. retrievalSource is 'live' or 'fallback'
 * accordingly.
 */
export async function getRecommendationContextForScan(
  scan: Scan,
  opts: Omit<GetRecommendationOpts, 'intent'> & {
    intent?: RecommendationIntent;
    allowAiAugmentation?: boolean;
  } = {}
): Promise<RecommendationContext> {
  const state = useAppStore.getState();
  const previous = state.scans
    .filter((s) => s.capturedAt < scan.capturedAt)
    .slice(-1)[0];
  const profile = selectUserProfileContext(state);
  const skinState = selectSkinState(scan, previous, state.scans);
  const primaryConcern = skinState?.topConcerns[0]?.concern ?? null;
  const intent: RecommendationIntent = opts.intent ?? {
    kind: 'scan',
    scanId: scan.id,
    primaryConcern,
  };

  let candidates: LiveProductCandidate[] = [];
  let retrievalSource: 'live' | 'fallback' | 'empty' = 'empty';
  let failureReason: string | null = null;

  // STEP A.LIVE — OBF search using a concern-shaped query.
  // Maps the scan's primary concern to a search phrase OBF's
  // categories index understands (e.g. 'redness' → 'redness
  // serum', 'dark_marks' → 'brightening serum').
  const liveQuery =
    primaryConcern === 'breakouts'
      ? 'salicylic acid serum'
      : primaryConcern === 'redness'
      ? 'redness centella serum'
      : primaryConcern === 'hydration'
      ? 'hyaluronic acid serum'
      : primaryConcern === 'texture'
      ? 'glycolic acid serum'
      : primaryConcern === 'dark_marks'
      ? 'vitamin c serum'
      : primaryConcern === 'sensitivity'
      ? 'gentle moisturizer'
      : primaryConcern === 'oiliness'
      ? 'niacinamide serum'
      : primaryConcern === 'pores'
      ? 'pore minimizing serum'
      : 'skincare serum';
  const live = await tryLiveSearch(liveQuery);
  if (live.candidates.length > 0) {
    candidates = live.candidates;
    retrievalSource = 'live';
  } else {
    failureReason = live.failure;
  }

  // STEP A.FALLBACK — seed catalog scoped by primary concern.
  if (candidates.length === 0) {
    candidates = retrieveSeedCandidates({
      concern: primaryConcern,
      limit: 12,
      rotation: opts.fresh ? Math.floor(Date.now() / 1000) : 0,
    });
    if (candidates.length === 0) {
      candidates = retrieveSeedCandidates({
        limit: 12,
        rotation: opts.fresh ? Math.floor(Date.now() / 1000) : 0,
      });
    }
    retrievalSource = candidates.length > 0 ? 'fallback' : 'empty';
  }

  // STEP B-D — normalize, filter, dedupe.
  const filtered = filterUsableCandidates(candidates);
  const deduped = dedupCandidates(filtered);

  // v19.19 — AI rerank still DEFERRED to async refinement.
  const rerank = null;
  void tryRerankProducts; // kept for future async refinement

  // STEP E + G — local score + canonical assembly.
  const availability: RecommendationAvailability =
    deduped.length > 0 ? 'available' : 'empty';

  return buildRecommendationContext({
    intent,
    candidates: deduped,
    profile,
    skinState,
    state: availability,
    failureReason: failureReason ?? undefined,
    rerankResult: rerank,
    retrievalSource: deduped.length > 0 ? retrievalSource : 'empty',
  });
}

// Silence the unused-import linter for the legacy helper now that
// the primary paths no longer call it. It remains exported for
// the legacy ProductsScreen search path and any future
// AI-augmentation caller.
void APP_CONCERN_TO_AI_CONCERN;
