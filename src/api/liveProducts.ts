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
 * v22.5 — aggressive normalization helpers used by both dedupe and
 * the same-brand cluster cap. Two product names that differ only by
 * volume ("30 ml"), packaging suffix ("Refill"), or trailing
 * punctuation must collapse to the same canonical slug so the
 * visible grid never shows the same item twice.
 */
function normalizeBrandToken(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[‘’']/g, '') // smart + straight apostrophes
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function normalizeNameToken(name: string): string {
  let s = name.toLowerCase();
  // Strip volume / weight suffixes and any standalone units.
  s = s.replace(
    /\b\d+(?:[\.,]\d+)?\s?(?:ml|milliliters?|oz|ounces?|fl\s?oz|g|grams?|gm|kg|l|pcs|count|ct|x|pack|packs)\b/gi,
    ''
  );
  // Strip percentage values when they read like packaging info, NOT
  // when they're part of a real product spec ("2% BHA" — keep).
  // We keep `%` tokens because they often DO carry meaning ("2% BHA").
  // Strip parenthetical suffixes.
  s = s.replace(/\([^)]*\)/g, '');
  s = s.replace(/\[[^\]]*\]/g, '');
  // Strip common packaging / format suffixes that vary across OBF
  // entries for the same product.
  s = s.replace(
    /\b(refill|jar|tube|bottle|pump|airless|sample|tester|travel size|trial size|mini|new formula|new packaging|limited edition)\b/gi,
    ''
  );
  // Collapse punctuation + whitespace.
  s = s.replace(/[‘’'`"]/g, '');
  s = s.replace(/[^a-z0-9%+]+/g, ' ');
  s = s.trim().replace(/\s+/g, ' ');
  return s;
}

function visibleDedupeKey(c: LiveProductCandidate): string {
  return `${normalizeBrandToken(c.brand ?? '')}::${normalizeNameToken(c.name ?? '')}`;
}

/**
 * v22.5 — defensive dedup. Catches:
 *   1. Exact id match (canonical case).
 *   2. Brand+normalized-name slug fallback (catches OBF returning
 *      the same product under different ids / volume suffixes /
 *      packaging variants).
 *   3. Same canonical productUrl (when present and trusted).
 * Preserves order — the first occurrence wins, which is what the
 * matchScore sort already guarantees.
 */
function dedupCandidates(
  candidates: LiveProductCandidate[]
): LiveProductCandidate[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenUrls = new Set<string>();
  const out: LiveProductCandidate[] = [];
  for (const c of candidates) {
    const id = (c.id ?? '').trim().toLowerCase();
    const slug = visibleDedupeKey(c);
    const url = canonicalUrlKey(c.productUrl);
    if (id.length > 0 && seenIds.has(id)) continue;
    if (slug !== '::' && seenSlugs.has(slug)) continue;
    if (url && seenUrls.has(url)) continue;
    if (id.length > 0) seenIds.add(id);
    if (slug !== '::') seenSlugs.add(slug);
    if (url) seenUrls.add(url);
    out.push(c);
  }
  return out;
}

/**
 * v22.10 / v22.11 — sanitize user-need summaries returned by the
 * AI planner or the deterministic catalog. Two-stage:
 *
 *   1. SANITIZE   — strip known legacy internal-summary prefixes
 *                   (third-person planner phrasing, leading
 *                   articles), truncate to 110 chars (down from 140
 *                   — keeps the caption tight and prevents 2-line
 *                   overflow).
 *   2. VALIDATE   — reject candidates that still contain forbidden
 *                   diagnosis/medical/engineering phrasing after
 *                   sanitization. Rejected → return null so the UI
 *                   falls through to its deterministic builder.
 *
 * The deterministic builder lives in the UI layer and produces a
 * clean user-facing caption from the active query/goal, so we never
 * depend on the AI planner getting the tone right.
 */
// v26.2 — moved to `./summaryGuards.ts` so RN-free consumers (the
// verify script) can import the canonical pattern list + sanitizer
// without dragging in `useAppStore` and the rest of the RN tree.
// Re-exported here so existing call sites keep working unchanged.
export { FORBIDDEN_SUMMARY_PATTERNS, sanitizeUserNeedSummary } from './summaryGuards';
import { sanitizeUserNeedSummary } from './summaryGuards';

function canonicalUrlKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Normalize host (drop www), pathname (drop trailing slash), and
    // strip tracking query params so the same product page under
    // different referral URLs deduplicates.
    const host = u.host.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return `${host}${path}`;
  } catch {
    return url.toLowerCase().trim();
  }
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
  RerankStatus,
} from '@/types/canonical';
import type { AIRerankResult } from '@/ai/ai-contracts';
// v19.17 — deterministic seed catalog retrieval. v19.23 — now
// fallback only; OBF live search is the primary path.
import {
  filterUsableCandidates,
  retrieveSeedCandidates,
} from './seedRetrieval';
// v19.23 — Open Beauty Facts live search (client-side). Preserved
// as a deprecated module for any direct caller; the engine no
// longer uses it as of v19.25.
import { searchOpenBeautyFacts } from './openBeautyFactsSearch';
// v19.25 — backend-owned live product search. The engine now
// calls THIS endpoint instead of the client-side OBF wrapper.
import { searchProductsBackend } from './searchProductsBackend';
import type { BackendProductCandidate } from './searchProductsContract';
// v19.27 — generalized search-intent interpreter.
import {
  buildBackendQueryFromIntent,
  interpretSearchIntent,
  type InterpretedIntent,
} from './queryIntent';
// v19.28 — multi-probe retrieval plan builder.
import {
  buildProbePlan,
  type RetrievalProbePlan,
} from './probePlan';
// v19.29 — deterministic candidate trust scoring + thresholds.
import {
  ALTERNATIVE_TRUST_THRESHOLD,
  HERO_TRUST_THRESHOLD,
  partitionByTrust,
  scoreTrustForCandidate,
  inferSkinProfile,
  buildWhyItFits,
  type InferredSkinProfile,
  type CandidateTrustScore,
  type ScoredCandidate,
} from './candidateTrust';

export interface GetRecommendationOpts extends LookupOpts {
  intent: RecommendationIntent;
  /**
   * v19.17 — opt-in flag to augment the deterministic seed
   * catalog with AI-generated live candidates. Defaults to
   * `false` so the primary path is fully deterministic.
   */
  allowAiAugmentation?: boolean;
  /**
   * v19.24 — explicit user-action label that triggered this
   * fetch. Stamped onto the resulting `RetrievalAttempt`
   * record so diagnostics + UI can prove the chain
   * "initial_load → seed_fallback → retry → obf_live". Default
   * is `'background'` for callers that don't supply one — but
   * every user-visible surface SHOULD pass an accurate value.
   */
  trigger?: import('@/types/canonical').RetrievalTrigger;
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
// v19.42 — outcome envelope. Replaces the silent `null` return with
// a structured shape so the caller always knows WHY the rerank
// didn't apply. The dev truth panel surfaces every field.
export interface RerankAttemptOutcome {
  result: AIRerankResult | null;
  attempted: boolean;
  skipped: boolean;
  skipReason: string | null;
  returned: boolean;
  returnReason: string | null;
}

async function tryRerankProducts(args: {
  candidates: LiveProductCandidate[];
  profile: ReturnType<typeof selectUserProfileContext>;
  skinState: ReturnType<typeof selectSkinState>;
  intentLabel: string;
  // v19.27 — generalized personalized rerank context.
  rawQuery?: string | null;
  chipIntent?: string | null;
  interpretedIntent?: InterpretedIntent;
  // v19.29 — trust signals.
  trustScores?: Array<{ id: string; trust: number; hasImage: boolean }>;
  // v19.36 — derived skin-profile axes.
  skinProfile?: InferredSkinProfile;
}): Promise<RerankAttemptOutcome> {
  const {
    candidates,
    profile,
    skinState,
    intentLabel,
    rawQuery,
    chipIntent,
    interpretedIntent,
    trustScores,
    skinProfile,
  } = args;
  // v19.42 — explicit skip-reason capture. Pre-v19.42 these
  // conditions returned a silent `null` and the dev panel went
  // gray. Now every skip has an explicit human-readable reason.
  if (!aiGateway.isAvailable()) {
    return {
      result: null,
      attempted: false,
      skipped: true,
      skipReason: 'AI gateway unavailable (proxy unreachable / not configured)',
      returned: false,
      returnReason: null,
    };
  }
  if (candidates.length === 0) {
    return {
      result: null,
      attempted: false,
      skipped: true,
      skipReason: 'candidate pool is empty (nothing to rerank)',
      returned: false,
      returnReason: null,
    };
  }
  // Trim to top 8 by deterministic localScore — rerank only the
  // strongest candidates so the call stays cheap.
  const scored = candidates
    .map((c) => ({
      c,
      localScore: scoreCandidateLocal(c, profile, skinState),
    }))
    .sort((a, b) => b.localScore - a.localScore)
    .slice(0, 8);
  if (scored.length === 0) {
    return {
      result: null,
      attempted: false,
      skipped: true,
      skipReason: 'scored candidate set empty after localScore sort',
      returned: false,
      returnReason: null,
    };
  }
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
    // v19.27 — generalized personalized search context.
    rawQuery: rawQuery ?? null,
    chipIntent: chipIntent ?? null,
    interpretedIntent: interpretedIntent
      ? {
          mode: interpretedIntent.mode,
          interpretedConcern: interpretedIntent.interpretedConcern,
          interpretedProductType:
            interpretedIntent.interpretedProductType,
          avoidanceConstraints: interpretedIntent.avoidanceConstraints,
        }
      : undefined,
    latestScanSummary: skinState?.summaryHeadline ?? null,
    topConcerns: skinState?.topConcerns?.map((c) => c.concern) ?? [],
    // v19.29 — trust signals for the rerank prompt.
    trustScores: trustScores ?? undefined,
    // v19.36 — skin-profile axes (derived once upstream).
    skinProfile: skinProfile ?? undefined,
  };
  try {
    const result = await aiGateway.rerankProducts(payload);
    if (!result || !result.heroId) {
      return {
        result: null,
        attempted: true,
        skipped: false,
        skipReason: null,
        returned: false,
        returnReason: 'AI rerank returned null or empty heroId',
      };
    }
    return {
      result,
      attempted: true,
      skipped: false,
      skipReason: null,
      returned: true,
      returnReason: null,
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    aiLog.warn('liveProducts.rerank', 'AI rerank failed; falling back to local order', {
      error: reason,
    });
    return {
      result: null,
      attempted: true,
      skipped: false,
      skipReason: null,
      returned: false,
      returnReason: `AI rerank threw: ${reason.slice(0, 120)}`,
    };
  }
}

/**
 * v19.26 — bounded-race wrapper around `tryRerankProducts`. The
 * AI rerank gateway has its own 15s timeout; this race caps the
 * total wait at 5s so the personalized search path never blocks
 * the user-visible result longer than that. On race timeout the
 * deterministic local-score order wins.
 */
const RERANK_RACE_MS = 5_000;

async function tryRerankProductsBounded(args: {
  candidates: LiveProductCandidate[];
  profile: ReturnType<typeof selectUserProfileContext>;
  skinState: ReturnType<typeof selectSkinState>;
  intentLabel: string;
  // v19.27 — optional rich context for generalized personalized rerank.
  rawQuery?: string | null;
  chipIntent?: string | null;
  interpretedIntent?: InterpretedIntent;
  // v19.29 — trust signals.
  trustScores?: Array<{ id: string; trust: number; hasImage: boolean }>;
  // v19.36 — derived skin-profile axes.
  skinProfile?: InferredSkinProfile;
}): Promise<RerankAttemptOutcome> {
  // v19.42 — race-timeout outcome envelope. Pre-v19.42 the race
  // resolved with `null` and the dev panel went gray. Now the
  // timeout returns an explicit RerankAttemptOutcome with reason.
  const timeoutOutcome: Promise<RerankAttemptOutcome> = new Promise(
    (resolve) => {
      setTimeout(
        () =>
          resolve({
            result: null,
            attempted: true,
            skipped: false,
            skipReason: null,
            returned: false,
            returnReason: `AI rerank race timeout after ${RERANK_RACE_MS}ms`,
          }),
        RERANK_RACE_MS
      );
    }
  );
  return Promise.race([tryRerankProducts(args), timeoutOutcome]);
}

// ===========================================================================
// v19.43 — AI-FIRST PRODUCT RECOMMENDATION ORCHESTRATOR.
//
// The new primary path. Calls the AI planner first to decide WHAT
// types of products to show this user, then enriches each slot
// into real candidates via the existing multi-probe retrieval and
// trust pipeline. Returns a structured outcome the engine entries
// fold into RecommendationContext.recommendationStatus.
//
// If AI is unavailable / fails / returns invalid plan / enriches
// zero candidates, the outer engine falls back to the rerank-only
// path and the status records ai_failed_fallback with an explicit
// reason. AI cannot fail silently.
// ===========================================================================

import type {
  ProductRecommendationPlan,
  ProductRecommendationSlot,
  SearchIntentPlan,
  SlotQueryFamily,
} from '@/ai/ai-contracts';
// v22.2 — deterministic fallback for typed search. When AI fails
// (proxy down / race timeout / invalid plan), the engine MUST still
// return a strong curated result. This module provides the
// catalog-backed planner + quality filter + min-6 enforcer.
import {
  planTypedSearchDeterministic,
  filterLiveQuality,
  ensureMinimumResults,
} from './typedSearchDeterministic';
import { resolveCategoryFromQuery } from '@/data/baseCategories';
import type { ProductRecommendationStatus } from '@/types/canonical';

const AI_PLAN_RACE_MS = 12_000;

interface AiFirstOutcome {
  status: ProductRecommendationStatus;
  /** Candidates assembled from enriched AI plan slots. Ordered. */
  candidates: LiveProductCandidate[];
  /** matchedProbes per id, threaded from each slot's retrieval. */
  matchedProbesById: Map<string, string[]>;
  /** Hero candidate id (first slot's strongest). */
  heroId: string | null;
  /** Alt ids (slots 2..N + same-slot peers). */
  alternativeIds: string[];
}

function buildEmptyAiOutcome(
  attempted: boolean,
  reason: string,
  productSourceMode: 'ai_failed_fallback' | 'deterministic_only',
  recommendationMode: 'best_for_you' | 'query_driven_search' | null = null
): AiFirstOutcome {
  // v21.2 — surface fallback to the top-right badge so it stops
  // saying IDLE when the AI engine has been attempted but failed.
  aiTelemetry.setFeatureSource(
    'products',
    productSourceMode === 'ai_failed_fallback' ? 'fallback' : 'idle',
    reason
  );
  return {
    status: {
      recommendationMode,
      dominantConcern: null,
      aiPlanAttempted: attempted,
      aiPlanReturned: false,
      aiPlanApplied: false,
      aiPlanReason: reason,
      aiSelectAttempted: false,
      aiSelectReturned: false,
      aiSelectApplied: false,
      aiSelectReason: attempted
        ? 'selector not attempted (planner did not produce a usable plan)'
        : 'selector not attempted (planner stage skipped)',
      userNeedSummary: null,
      whyTheseProducts: null,
      productSourceMode,
      slotCount: 0,
      slotLabels: [],
      plannerVersion: attempted ? 'v21.0-planner' : null,
      selectorVersion: null,
      // v21.2 — empty/failure outcome: no result mode, no family,
      // zero count, badge falls back to 'fallback' when AI was
      // attempted-but-failed, 'idle' when AI was never attempted.
      resultMode: null,
      dominantSearchFamily: null,
      resultCountTotal: 0,
      badgeMode:
        productSourceMode === 'ai_failed_fallback' ? 'fallback' : 'idle',
    },
    candidates: [],
    matchedProbesById: new Map(),
    heroId: null,
    alternativeIds: [],
  };
}

/**
 * v19.43 — primary AI-first recommendation orchestrator.
 *
 * Calls the planner, dispatches retrieval per slot, dedupes
 * candidates across slots, and returns a final ordered candidate
 * list with the hero pinned to the first slot's top result.
 *
 * Pure side-effect-free until cacheCandidates is called by the
 * engine entry. Never throws — every failure mode resolves to a
 * structured outcome with `aiRecommendationReason` set.
 */
async function tryAiFirstRecommendation(args: {
  query: string | null;
  profile: ReturnType<typeof selectUserProfileContext>;
  skinState: ReturnType<typeof selectSkinState>;
  trigger: RetrievalTrigger;
  interpretedIntent: InterpretedIntent;
  suggestedMode?: 'best_for_you' | 'query_driven_search';
}): Promise<AiFirstOutcome> {
  const { query, profile, skinState, trigger, interpretedIntent, suggestedMode } = args;

  if (trigger === 'background') {
    return buildEmptyAiOutcome(
      false,
      "trigger='background' (engine called for cache prewarm; AI planner deliberately skipped)",
      'deterministic_only'
    );
  }
  if (!aiGateway.isAvailable()) {
    return buildEmptyAiOutcome(
      false,
      'AI gateway unavailable (proxy unreachable / not configured)',
      'deterministic_only'
    );
  }

  // Derive skin profile axes once.
  const skinFit = inferSkinProfile(profile, skinState);

  // Call the planner with a bounded race so the user-facing path
  // never blocks more than AI_PLAN_RACE_MS.
  const plannerCall = aiGateway
    .recommendProductsForUser({
      query,
      profile: {
        displayName: profile.displayName,
        skinType: profile.skinType,
        sensitivities: profile.sensitivities,
        goals: profile.goals,
      },
      topConcerns: skinState?.topConcerns?.map((c) => c.concern as string) ?? [],
      latestScanSummary: skinState?.summaryHeadline ?? null,
      skinProfile: skinFit,
      suggestedMode,
    })
    .then(
      (plan): { ok: true; plan: ProductRecommendationPlan } => ({
        ok: true,
        plan,
      })
    )
    .catch(
      (e: unknown): { ok: false; reason: string } => ({
        ok: false,
        reason: `AI planner threw: ${(e instanceof Error ? e.message : String(e)).slice(0, 140)}`,
      })
    );
  const timeoutCall = new Promise<{ ok: false; reason: string }>((resolve) => {
    setTimeout(
      () =>
        resolve({
          ok: false,
          reason: `AI planner race timeout after ${AI_PLAN_RACE_MS}ms`,
        }),
      AI_PLAN_RACE_MS
    );
  });
  const result = await Promise.race([plannerCall, timeoutCall]);

  if (!result.ok) {
    return buildEmptyAiOutcome(
      true,
      result.reason,
      'ai_failed_fallback',
      suggestedMode ?? null
    );
  }
  const plan = result.plan;

  if (!plan.slots || plan.slots.length === 0) {
    return buildEmptyAiOutcome(
      true,
      'AI planner returned no slots',
      'ai_failed_fallback',
      plan.recommendationMode
    );
  }

  // v21.0 — STEP 1: enrich each slot via retrieval (top 3 trust
  // candidates per slot). Keep the per-slot shortlist intact so the
  // AI slot selector can choose from real candidates.
  type SlotShortlist = {
    slotKey: string;
    slotLabel: string;
    targetNeed: string;
    mustHaveSignals: string[];
    avoidSignals: string[];
    searchQueries: string[];
    shortlist: LiveProductCandidate[];
  };
  const slotShortlists: SlotShortlist[] = [];
  const matchedProbesById = new Map<string, string[]>();
  for (const slot of plan.slots) {
    const slotCandidates = await enrichSlot(slot, profile, skinState, interpretedIntent);
    for (const c of slotCandidates) {
      const existing = matchedProbesById.get(c.id) ?? [];
      const next = Array.from(new Set([...existing, ...slot.searchQueries]));
      matchedProbesById.set(c.id, next);
    }
    slotShortlists.push({
      slotKey: slot.slotKey,
      slotLabel: slot.slotLabel,
      targetNeed: slot.targetNeed,
      mustHaveSignals: slot.mustHaveSignals,
      avoidSignals: slot.avoidSignals,
      searchQueries: slot.searchQueries,
      shortlist: slotCandidates,
    });
  }

  const enrichedTotal = slotShortlists.reduce(
    (n, s) => n + s.shortlist.length,
    0
  );
  if (enrichedTotal === 0) {
    return buildEmptyAiOutcome(
      true,
      `AI planner returned ${plan.slots.length} slot(s) but retrieval enriched 0 candidates`,
      'ai_failed_fallback',
      plan.recommendationMode
    );
  }

  // v21.0 — STEP 2: AI slot selector picks the best real candidate
  // per slot from the shortlists. The selector race-times-out the
  // same way as the planner. On failure, deterministic
  // slot-top-trust is the fallback per slot, and the status records
  // aiSelectAttempted/Returned/Applied + reason.
  let aiSelectAttempted = false;
  let aiSelectReturned = false;
  let aiSelectApplied = false;
  let aiSelectReason: string | null = null;
  const slotsForSelector = slotShortlists
    .filter((s) => s.shortlist.length > 0)
    .map((s) => ({
      slotKey: s.slotKey,
      slotLabel: s.slotLabel,
      targetNeed: s.targetNeed,
      mustHaveSignals: s.mustHaveSignals,
      avoidSignals: s.avoidSignals,
      candidates: s.shortlist.map((c) => ({
        id: c.id,
        brand: c.brand,
        name: c.name,
        category: c.category ?? null,
        concernTags: c.concernTags ?? [],
        ingredientsHighlights: c.ingredientsHighlights ?? [],
        shortDescription: c.shortDescription ?? '',
      })),
    }));
  const selectionByKey = new Map<string, { id: string; whyPicked: string }>();
  if (aiGateway.isAvailable() && slotsForSelector.length > 0) {
    aiSelectAttempted = true;
    const selectorCall = aiGateway
      .selectProductForSlot({
        profile: {
          displayName: profile.displayName,
          skinType: profile.skinType,
          sensitivities: profile.sensitivities,
          goals: profile.goals,
        },
        topConcerns: skinState?.topConcerns?.map((c) => c.concern as string) ?? [],
        latestScanSummary: skinState?.summaryHeadline ?? null,
        skinProfile: skinFit,
        slotShortlists: slotsForSelector,
      })
      .then(
        (sel): { ok: true; sel: typeof sel } => ({ ok: true, sel })
      )
      .catch(
        (e: unknown): { ok: false; reason: string } => ({
          ok: false,
          reason: `AI selector threw: ${(e instanceof Error ? e.message : String(e)).slice(0, 140)}`,
        })
      );
    const selectorTimeout = new Promise<{ ok: false; reason: string }>(
      (resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: false,
              reason: `AI selector race timeout after ${AI_PLAN_RACE_MS}ms`,
            }),
          AI_PLAN_RACE_MS
        );
      }
    );
    const selResult = await Promise.race([selectorCall, selectorTimeout]);
    if (selResult.ok) {
      aiSelectReturned = true;
      // Verify each selectedCandidateId actually exists in its slot's
      // shortlist. AI cannot pick an id not in the shortlist.
      const shortlistByKey = new Map(
        slotsForSelector.map((s) => [s.slotKey, new Set(s.candidates.map((c) => c.id))])
      );
      let appliedAny = false;
      for (const s of selResult.sel.selections) {
        if (!s.selectedCandidateId) continue;
        const okSet = shortlistByKey.get(s.slotKey);
        if (okSet && okSet.has(s.selectedCandidateId)) {
          selectionByKey.set(s.slotKey, {
            id: s.selectedCandidateId,
            whyPicked: s.whyPicked,
          });
          appliedAny = true;
        }
      }
      if (appliedAny) {
        aiSelectApplied = true;
        aiSelectReason = `AI selector picked ${selectionByKey.size}/${slotsForSelector.length} slot(s)`;
      } else {
        aiSelectReason =
          'AI selector returned but no valid selection matched a shortlist id; deterministic slot-top used';
      }
    } else {
      aiSelectReason = selResult.reason;
    }
  } else if (slotsForSelector.length === 0) {
    aiSelectReason = 'no enriched shortlists to select from';
  } else {
    aiSelectReason = 'AI gateway unavailable; deterministic slot-top used';
  }

  // v21.2 — STEP 3: assemble final visible list. THIS IS WHERE
  // typed search and best-for-you diverge.
  //
  // BEST-FOR-YOU MODE (recommendationMode === 'best_for_you'):
  //   slot-based routine layout. Hero = slot 1's AI pick;
  //   alternatives = slots 2..N's AI picks + same-slot peers.
  //   Different slots can be different product types (moisturizer
  //   + blemish + smoothing serum). This is a personalized
  //   routine, not a search result.
  //
  // TYPED-SEARCH MODE (recommendationMode === 'query_driven_search'):
  //   FLAT SAME-INTENT LIST. The user typed "moisture" — they
  //   expect 6 moisturizers, not a moisturizer + an exfoliant
  //   + a blemish treatment. We:
  //     1. Determine the dominant queryFamily across slots (most
  //        common; first slot wins ties).
  //     2. Pool every enriched candidate from all slots.
  //     3. Keep only candidates whose name/category/description
  //        matches the dominant family.
  //     4. Rank by trust + image quality.
  //     5. Return a flat list — first 6 visible, rest revealed on
  //        scroll.
  const isTypedSearch =
    plan.recommendationMode === 'query_driven_search';
  let dominantSearchFamily: string | null = null;
  let resultMode: 'best_for_you_slots' | 'typed_search_list';

  const seen = new Set<string>();
  const heroOrdered: LiveProductCandidate[] = [];
  let heroId: string | null = null;
  const altOrdered: LiveProductCandidate[] = [];

  if (isTypedSearch) {
    resultMode = 'typed_search_list';
    // Resolve dominant family.
    const familyCounts = new Map<SlotQueryFamily, number>();
    for (const slot of plan.slots) {
      familyCounts.set(
        slot.queryFamily,
        (familyCounts.get(slot.queryFamily) ?? 0) + 1
      );
    }
    let topFamily: SlotQueryFamily =
      plan.slots[0]?.queryFamily ?? ('other' as SlotQueryFamily);
    let topCount = 0;
    for (const [fam, cnt] of familyCounts) {
      if (cnt > topCount) {
        topCount = cnt;
        topFamily = fam;
      }
    }
    dominantSearchFamily = topFamily;

    // Pool all enriched candidates across slots, dedupe by id, and
    // remember which slot's AI pick (if any) each candidate is.
    const pool: Array<{
      candidate: LiveProductCandidate;
      score: number;
      wasAiPick: boolean;
      slotMatchedFamily: boolean;
    }> = [];
    const trustById = new Map<string, number>();
    const slotFamilyById = new Map<string, string>();
    const aiPickedIds = new Set<string>(
      [...selectionByKey.values()].map((s) => s.id)
    );
    for (const slot of slotShortlists) {
      // Score per slot via the existing trust scorer.
      for (const c of slot.shortlist) {
        if (trustById.has(c.id)) continue;
        const scored = scoreTrustForCandidate({
          candidate: c,
          intent: { ...interpretedIntent, intentLabel: slot.slotLabel },
          profile,
          skinState,
          matchedProbes: matchedProbesById.get(c.id) ?? slot.searchQueries,
        });
        trustById.set(c.id, scored.score.total);
        slotFamilyById.set(
          c.id,
          plan.slots.find((s) => s.slotKey === slot.slotKey)?.queryFamily ??
            'other'
        );
      }
    }
    // Build the pool with same-family filter.
    const familyRegexById: Record<string, RegExp> = {
      moisturizer: /moisturi[sz]er|cream|lotion|emulsion|gel cream|barrier/i,
      serum_texture: /serum|essence|ampoule|peptide|smooth|texture|resurfac|lactic|pha|retinol|glycolic/i,
      chemical_exfoliant: /exfoli|salicylic|glycolic|lactic|mandelic|pha|aha|bha|peel|acid/i,
      blemish_support: /spot|acne|pimple|blemish|salicylic|benzoyl|sulfur|niacinamide/i,
      spf: /sunscreen|spf|sunblock|uv|sun cream/i,
      cleanser: /cleanser|wash|foam|micellar|gel cleanser/i,
      other: /.*/,
    };
    const dominantRegex = familyRegexById[dominantSearchFamily] ?? /.*/;
    const seenPool = new Set<string>();
    for (const slot of slotShortlists) {
      for (const c of slot.shortlist) {
        if (seenPool.has(c.id)) continue;
        seenPool.add(c.id);
        const corpus = `${c.name} ${c.category ?? ''} ${c.shortDescription ?? ''}`;
        const slotFam = slotFamilyById.get(c.id) ?? 'other';
        // A candidate matches the dominant family when its slot's
        // family equals dominant, OR its corpus matches the dominant
        // family regex (catches OBF-returned candidates whose slot
        // was originally different but whose actual product type
        // matches the dominant family).
        const slotMatchedFamily =
          slotFam === dominantSearchFamily || dominantRegex.test(corpus);
        if (!slotMatchedFamily && plan.slots.length > 1) {
          // Hard filter: drop cross-family candidates in typed search.
          continue;
        }
        const baseTrust = trustById.get(c.id) ?? 50;
        const imageBoost =
          c.imageQuality === 'high'
            ? 6
            : c.imageQuality === 'medium'
            ? 2
            : c.imageQuality === 'low'
            ? -6
            : 0;
        const aiBoost = aiPickedIds.has(c.id) ? 3 : 0;
        pool.push({
          candidate: c,
          score: baseTrust + imageBoost + aiBoost,
          wasAiPick: aiPickedIds.has(c.id),
          slotMatchedFamily,
        });
      }
    }
    pool.sort((a, b) => b.score - a.score);
    // Cap at 18 (enough for visibleCount 6 + 2 reveal batches).
    const flat = pool.slice(0, 18).map((p) => p.candidate);
    if (flat.length > 0) {
      heroOrdered.push(flat[0]);
      heroId = flat[0].id;
      altOrdered.push(...flat.slice(1));
    }
  } else {
    // BEST-FOR-YOU SLOT MODE — original v21.0 assembly.
    resultMode = 'best_for_you_slots';
    for (let slotIdx = 0; slotIdx < slotShortlists.length; slotIdx++) {
      const slot = slotShortlists[slotIdx];
      if (slot.shortlist.length === 0) continue;
      const pickedId = selectionByKey.get(slot.slotKey)?.id;
      const picked = pickedId
        ? slot.shortlist.find((c) => c.id === pickedId)
        : null;
      const slotHero = picked ?? slot.shortlist[0];
      if (!seen.has(slotHero.id)) {
        seen.add(slotHero.id);
        if (slotIdx === 0 && heroOrdered.length === 0) {
          heroOrdered.push(slotHero);
          heroId = slotHero.id;
        } else {
          altOrdered.push(slotHero);
        }
      }
      for (const c of slot.shortlist) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        altOrdered.push(c);
      }
    }
  }
  const candidates: LiveProductCandidate[] = [...heroOrdered, ...altOrdered];

  // Build a one-line summary of the whyPicked reasons (hero slot).
  const heroSelection = plan.slots[0]
    ? selectionByKey.get(plan.slots[0].slotKey)
    : undefined;

  // v21.2 — badge mode for the AISourceBadge.
  const badgeMode: 'ai_on' | 'fallback' | 'pending' | 'idle' = 'ai_on';

  // v21.2 — UPDATE THE TOP-RIGHT BADGE. Previously
  // AISourceBadge read aiTelemetry.features.products.source, which
  // defaulted to 'idle' and was never updated by the v21.x AI-first
  // path (only the legacy lookupLiveProducts path set it). The
  // user saw IDLE on the top-right pill even though productSourceMode
  // was clearly 'ai_first'. Wire the badge source now.
  aiTelemetry.setFeatureSource(
    'products',
    'ai',
    `AI-first ${resultMode}: planner+selector applied, ${candidates.length} candidates`
  );

  return {
    status: {
      recommendationMode: plan.recommendationMode,
      dominantConcern: plan.dominantConcern,
      aiPlanAttempted: true,
      aiPlanReturned: true,
      aiPlanApplied: true,
      aiPlanReason: `Planner returned ${plan.slots.length} slot(s); retrieval enriched ${enrichedTotal} candidate(s)`,
      aiSelectAttempted,
      aiSelectReturned,
      aiSelectApplied,
      aiSelectReason,
      userNeedSummary: sanitizeUserNeedSummary(plan.userNeedSummary),
      whyTheseProducts: heroSelection?.whyPicked ?? plan.slots[0]?.whyThisSlotMatters ?? '',
      productSourceMode: 'ai_first',
      slotCount: plan.slots.length,
      slotLabels: plan.slots.map((s) => s.slotLabel),
      plannerVersion: 'v21.0-planner',
      selectorVersion: aiSelectApplied ? 'v21.0-selector' : null,
      // v21.2 — typed-search vs best-for-you split fields.
      resultMode,
      dominantSearchFamily,
      resultCountTotal: candidates.length,
      badgeMode,
    },
    candidates,
    matchedProbesById,
    heroId,
    alternativeIds: candidates
      .filter((c) => c.id !== heroId)
      .slice(0, 4)
      .map((c) => c.id),
  };
}

// ===========================================================================
// v22.1 — TYPED-SEARCH ORCHESTRATOR.
//
// COMPLETELY SEPARATE from tryAiFirstRecommendation. Does NOT call the
// slot planner. Does NOT use slot output to derive the dominant family
// (no majority vote, no first-slot fallback). Calls planTypedSearch
// instead, retrieves real candidates using the plan's searchQueries,
// hard-filters to dominantProductFamily, ranks flat, and returns.
//
// Used by getRecommendationContextFromQuery (typed search entry).
// getRecommendationContextForScan (best-for-you) keeps the slot path.
// ===========================================================================

const TYPED_SEARCH_RACE_MS = 12_000;

interface TypedSearchOutcome {
  status: ProductRecommendationStatus;
  candidates: LiveProductCandidate[];
  matchedProbesById: Map<string, string[]>;
  heroId: string | null;
  alternativeIds: string[];
}

const SEARCH_FAMILY_REGEX: Record<string, RegExp> = {
  moisturizer: /moisturi[sz]er|cream|lotion|emulsion|gel cream|barrier/i,
  serum_texture: /serum|essence|ampoule|peptide|smooth|texture|resurfac|lactic|pha|retinol|glycolic/i,
  chemical_exfoliant: /exfoli|salicylic|glycolic|lactic|mandelic|pha|aha|bha|peel|acid/i,
  blemish_support: /spot|acne|pimple|blemish|salicylic|benzoyl|sulfur|niacinamide/i,
  spf: /sunscreen|spf|sunblock|uv|sun cream/i,
  cleanser: /cleanser|wash|foam|micellar|gel cleanser/i,
  other: /.*/,
};

/**
 * v22.2 — Build a deterministic typed-search outcome from the
 * curated catalog. Used when AI is unavailable, fails, or returns
 * nothing usable — instead of showing "1 picks" or an empty state,
 * the user sees a strong curated category result. The visible
 * recommendation is GOOD even when AI is off.
 *
 * `aiPlanReason` captures the underlying AI failure so the dev
 * panel still shows the truth, but the user just sees products.
 */
function buildDeterministicTypedSearchOutcome(
  rawQuery: string,
  profile: ReturnType<typeof selectUserProfileContext>,
  skinState: ReturnType<typeof selectSkinState>,
  productSourceMode: 'ai_failed_fallback' | 'deterministic_only',
  aiReason: string
): TypedSearchOutcome {
  const det = planTypedSearchDeterministic(rawQuery, profile, skinState);
  aiTelemetry.setFeatureSource(
    'products',
    productSourceMode === 'ai_failed_fallback' ? 'fallback' : 'idle',
    `${aiReason} — falling back to curated catalog (${det.category.label})`
  );
  // v22.4 — dedupe by brand+name slug (defensive — curated catalog
  // should already be clean, but the live engine reuses this code
  // path indirectly).
  const detDeduped = dedupCandidates(det.candidates);
  // v22.4 — stamp UI-facing fields. Curated entries are honest
  // `related` fit by default with a compressed % cap — they are NOT
  // exact live matches even if they're well-targeted.
  const detStamped: LiveProductCandidate[] = detDeduped.map((c) => ({
    ...c,
    matchScore: Math.min(c.matchScore ?? 70, 72),
    fitBand: 'related' as const,
    relevancePercent: Math.min(c.matchScore ?? 70, 72),
    visibleSource: 'curated' as const,
  }));
  // Cache into the store so ProductDetail can resolve taps.
  try {
    useAppStore.getState().cacheLiveProducts(detStamped);
  } catch {
    /* never block on cache write */
  }
  const matchedProbesById = new Map<string, string[]>();
  for (const c of detStamped) {
    matchedProbesById.set(c.id, [det.category.id]);
  }
  return {
    status: {
      recommendationMode: 'query_driven_search',
      dominantConcern: null,
      aiPlanAttempted: true,
      aiPlanReturned: false,
      aiPlanApplied: false,
      aiPlanReason: aiReason,
      aiSelectAttempted: false,
      aiSelectReturned: false,
      aiSelectApplied: false,
      aiSelectReason:
        'deterministic typed-search planner: AI not used for this fetch',
      userNeedSummary: sanitizeUserNeedSummary(det.userNeedSummary),
      whyTheseProducts: det.searchIntentLabel,
      productSourceMode,
      slotCount: 0,
      slotLabels: [],
      plannerVersion: 'v22.2-deterministic',
      selectorVersion: null,
      resultMode: 'typed_search_flat',
      dominantSearchFamily: det.dominantProductFamily,
      resultCountTotal: detStamped.length,
      badgeMode: productSourceMode === 'ai_failed_fallback' ? 'fallback' : 'idle',
    },
    candidates: detStamped,
    matchedProbesById,
    heroId: detStamped[0]?.id ?? null,
    alternativeIds: detStamped.slice(1, 5).map((c) => c.id),
  };
}

function buildEmptyTypedSearchOutcome(
  attempted: boolean,
  reason: string,
  productSourceMode: 'ai_failed_fallback' | 'deterministic_only'
): TypedSearchOutcome {
  aiTelemetry.setFeatureSource(
    'products',
    productSourceMode === 'ai_failed_fallback' ? 'fallback' : 'idle',
    reason
  );
  return {
    status: {
      recommendationMode: null,
      dominantConcern: null,
      aiPlanAttempted: attempted,
      aiPlanReturned: false,
      aiPlanApplied: false,
      aiPlanReason: reason,
      aiSelectAttempted: false,
      aiSelectReturned: false,
      aiSelectApplied: false,
      aiSelectReason: 'typed_search path: selector is not used',
      userNeedSummary: null,
      whyTheseProducts: null,
      productSourceMode,
      slotCount: 0,
      slotLabels: [],
      plannerVersion: attempted ? 'v22.1-search-only' : null,
      selectorVersion: null,
      resultMode: null,
      dominantSearchFamily: null,
      resultCountTotal: 0,
      badgeMode:
        productSourceMode === 'ai_failed_fallback' ? 'fallback' : 'idle',
    },
    candidates: [],
    matchedProbesById: new Map(),
    heroId: null,
    alternativeIds: [],
  };
}

/**
 * v22.1 — Typed-search orchestrator. Single-family flat-list path.
 * Bypasses the slot planner entirely.
 */
async function tryTypedSearch(args: {
  rawQuery: string;
  profile: ReturnType<typeof selectUserProfileContext>;
  skinState: ReturnType<typeof selectSkinState>;
  trigger: RetrievalTrigger;
  interpretedIntent: InterpretedIntent;
}): Promise<TypedSearchOutcome> {
  const { rawQuery, profile, skinState, trigger, interpretedIntent } = args;

  if (trigger === 'background') {
    return buildEmptyTypedSearchOutcome(
      false,
      "trigger='background' (cache prewarm; typed-search planner skipped)",
      'deterministic_only'
    );
  }
  // v22.13 — UNRECOGNIZED-QUERY EMPTY GUARD. When the parsed intent
  // has zero recognized signals (no productType, no concern, no
  // modifier, no ingredient, and the query isn't "best for me"),
  // we must NOT route through scan-fallback or curated default.
  // That produced misleading results for noise queries like
  // "asdfghjkl" (which used to surface Paula's BHA via scan top
  // concern). Now we return an empty outcome and the UI shows the
  // honest empty state.
  if (!interpretedIntent.recognized) {
    return buildEmptyTypedSearchOutcome(
      false,
      'query has no recognized product/concern/ingredient/modifier signal',
      'deterministic_only'
    );
  }
  if (!aiGateway.isAvailable()) {
    // v22.2 — AI proxy off. Fall through to curated catalog so the
    // user STILL sees a strong same-intent list. Status records
    // the AI-off state for dev; user just sees products.
    return buildDeterministicTypedSearchOutcome(
      rawQuery,
      profile,
      skinState,
      'deterministic_only',
      'AI gateway unavailable (proxy unreachable / not configured)'
    );
  }
  if (!rawQuery || rawQuery.trim().length === 0) {
    return buildEmptyTypedSearchOutcome(
      false,
      'empty raw query (typed-search planner needs a real user query)',
      'deterministic_only'
    );
  }

  const skinFit = inferSkinProfile(profile, skinState);

  // Call the typed-search planner with a bounded race.
  const plannerCall = aiGateway
    .planTypedSearch({
      rawQuery,
      profile: {
        displayName: profile.displayName,
        skinType: profile.skinType,
        sensitivities: profile.sensitivities,
        goals: profile.goals,
      },
      topConcerns: skinState?.topConcerns?.map((c) => c.concern as string) ?? [],
      latestScanSummary: skinState?.summaryHeadline ?? null,
      skinProfile: skinFit,
    })
    .then(
      (plan): { ok: true; plan: SearchIntentPlan } => ({ ok: true, plan })
    )
    .catch(
      (e: unknown): { ok: false; reason: string } => ({
        ok: false,
        reason: `typed-search planner threw: ${(e instanceof Error ? e.message : String(e)).slice(0, 140)}`,
      })
    );
  const timeoutCall = new Promise<{ ok: false; reason: string }>((resolve) => {
    setTimeout(
      () =>
        resolve({
          ok: false,
          reason: `typed-search planner race timeout after ${TYPED_SEARCH_RACE_MS}ms`,
        }),
      TYPED_SEARCH_RACE_MS
    );
  });
  const result = await Promise.race([plannerCall, timeoutCall]);

  if (!result.ok) {
    // v22.2 — AI planner failed. Don't return an empty failure
    // outcome that shows "1 picks" to the user. Build a strong
    // deterministic curated result from the base category registry
    // so the visible UI looks like a real search result.
    return buildDeterministicTypedSearchOutcome(
      rawQuery,
      profile,
      skinState,
      'ai_failed_fallback',
      result.reason
    );
  }
  const plan = result.plan;

  if (!plan.searchQueries || plan.searchQueries.length === 0) {
    return buildDeterministicTypedSearchOutcome(
      rawQuery,
      profile,
      skinState,
      'ai_failed_fallback',
      'typed-search planner returned no searchQueries'
    );
  }

  // Retrieve real candidates using the plan's searchQueries.
  // Each searchQuery hits tryLiveSearch (multi-probe OBF fan-out).
  // We capture the union, hard-filter to dominantProductFamily, and
  // rank flat.
  const matchedProbesById = new Map<string, string[]>();
  const candidatePool = new Map<string, LiveProductCandidate>();
  const intentForRetrieval: InterpretedIntent = {
    ...interpretedIntent,
    intentLabel: plan.searchIntentLabel || rawQuery,
  };
  for (const q of plan.searchQueries.slice(0, 4)) {
    const live = await tryLiveSearch(q, 'background', {
      profile,
      skinState,
      inferredConcern: interpretedIntent.interpretedConcern as ConcernType | null,
      intent: intentForRetrieval,
      chipIntent: null,
    });
    for (const c of live.candidates) {
      if (!candidatePool.has(c.id)) candidatePool.set(c.id, c);
      const existing = matchedProbesById.get(c.id) ?? [];
      matchedProbesById.set(c.id, Array.from(new Set([...existing, q])));
    }
  }
  // Seed fallback if OBF returned nothing for all queries.
  if (candidatePool.size === 0) {
    const seedHits = retrieveSeedCandidates({
      query: plan.searchQueries[0] ?? rawQuery,
      concern: interpretedIntent.interpretedConcern ?? null,
      limit: 16,
      rotation: 0,
    });
    for (const c of seedHits) {
      if (!candidatePool.has(c.id)) candidatePool.set(c.id, c);
    }
  }

  // Filter usable + dedupe + quality reject + dominant-family filter.
  const QUALITY_REJECT_PATTERNS: RegExp[] = [
    /\b(refill|sample|tester|sachet|pouch|travel size|trial size|mini)\b/i,
    /\b(empty bottle|empty container|dispenser only|pump only|applicator)\b/i,
    /\b(gift set|bundle|combo pack|kit)\b/i,
    /\b(value pack|family pack)\b/i,
  ];
  const familyRegex = SEARCH_FAMILY_REGEX[plan.dominantProductFamily] ?? /.*/;
  const allCandidates = Array.from(candidatePool.values());
  // v22.2 — first pass: reject promo/junk via the shared quality filter.
  const promoSafe = filterLiveQuality(allCandidates);
  const qualityFiltered = promoSafe.filter((c) => {
    const corpus = `${c.name ?? ''} ${c.shortDescription ?? ''}`;
    if (QUALITY_REJECT_PATTERNS.some((re) => re.test(corpus))) return false;
    const brand = (c.brand ?? '').trim();
    const name = (c.name ?? '').trim();
    if (brand.length < 2 && name.length < 8) return false;
    return true;
  });
  const filterUsable = filterUsableCandidates(qualityFiltered);
  const deduped = dedupCandidates(filterUsable);
  // HARD family filter — typed-search must only return candidates
  // whose name/category/description matches the dominant family.
  // For 'other' the regex matches everything (vague queries).
  const familyMatched = deduped.filter((c) => {
    const corpus = `${c.name ?? ''} ${c.category ?? ''} ${c.shortDescription ?? ''}`;
    return familyRegex.test(corpus);
  });

  if (familyMatched.length === 0) {
    // v22.2 — retrieval found nothing usable for this family. Don't
    // show an empty state; fall through to curated catalog so the
    // user sees real products.
    return buildDeterministicTypedSearchOutcome(
      rawQuery,
      profile,
      skinState,
      'ai_failed_fallback',
      `AI planner returned ${plan.searchQueries.length} queries for family=${plan.dominantProductFamily} but retrieval matched 0 candidates after quality filter`
    );
  }

  // Trust-score + flat rank. searchQueries from the plan become the
  // matchedProbes signal so probeSupport scoring counts them.
  const scored = familyMatched.map((c) =>
    scoreTrustForCandidate({
      candidate: c,
      intent: intentForRetrieval,
      profile,
      skinState,
      matchedProbes:
        matchedProbesById.get(c.id) ?? plan.searchQueries.slice(0, 2),
    })
  );
  // v22.4 — drop `weak` band before ranking. A weak fit should never
  // surface to the user; the topup will fill the gap.
  const eligible = scored.filter((s) => s.score.fitBand !== 'weak');
  // Final flat ranking:
  //   primary: trust score total (already includes strict-mismatch multiplier)
  //   secondary: image tier (high > medium > low)
  eligible.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    const imgRank = (c: LiveProductCandidate): number =>
      c.imageQuality === 'high' ? 3 : c.imageQuality === 'medium' ? 2 : c.imageQuality === 'low' ? 1 : 0;
    return imgRank(b.candidate) - imgRank(a.candidate);
  });
  // v22.5 — SAME-BRAND CLUSTER CAP. Walk the sorted list once and
  // push any 3rd+ occurrence of the same brand to the back of the
  // list. The visible grid never has 3+ same-brand cards stacked
  // together; same-brand picks are still allowed but as later
  // entries so a strong runner-up from a different brand surfaces
  // first. Brand normalization is the same shape used by dedupe.
  function brandKey(c: LiveProductCandidate): string {
    return normalizeBrandToken(c.brand ?? '');
  }
  const brandCount = new Map<string, number>();
  const promoted: typeof eligible = [];
  const demoted: typeof eligible = [];
  for (const s of eligible) {
    const b = brandKey(s.candidate);
    const n = (brandCount.get(b) ?? 0) + 1;
    brandCount.set(b, n);
    if (n <= 2) promoted.push(s);
    else demoted.push(s);
  }
  const reclustered = [...promoted, ...demoted];

  // v22.6 — stamp UI-facing fit fields onto every live candidate,
  // and build a deterministic why-it-fits reason from the scoring
  // breakdown so every card explains itself. The skin-fit profile
  // is recomputed once here and threaded into buildWhyItFits.
  const skinFitForReason = inferSkinProfile(profile, skinState);
  const rankedLive: LiveProductCandidate[] = reclustered.slice(0, 18).map((s) => {
    const reason = buildWhyItFits({
      candidate: s.candidate,
      intent: intentForRetrieval,
      score: s.score,
      skinFit: skinFitForReason,
    });
    return {
      ...s.candidate,
      // Only overwrite when the original is empty — preserves any
      // AI-supplied matchReason from the planner.
      matchReason: s.candidate.matchReason && s.candidate.matchReason.trim().length > 0
        ? s.candidate.matchReason
        : reason,
      matchScore: s.score.relevancePercent,
      fitBand:
        s.score.fitBand === 'weak'
          ? 'broad'
          : (s.score.fitBand as 'exact' | 'strong' | 'related' | 'broad'),
      relevancePercent: s.score.relevancePercent,
      visibleSource: 'live',
    };
  });

  // v22.2 — MINIMUM-6 ENFORCEMENT. If live retrieval returned fewer
  // than 6 strong candidates, top up from the curated catalog for
  // the resolved category. Users never see "1 picks" or a thin
  // 2-item shelf for a typed search.
  // v22.4 — also dedupe topups by brand+name slug so OBF + curated
  // duplicates of the SAME product never both render.
  const resolvedCategory = resolveCategoryFromQuery(rawQuery);
  const minResults = resolvedCategory?.minResults ?? 6;
  const flatCandidatesRaw = resolvedCategory
    ? ensureMinimumResults(
        rankedLive,
        resolvedCategory,
        profile,
        skinState,
        minResults
      )
    : rankedLive;
  // v22.4 — final brand+name dedupe pass. `ensureMinimumResults`
  // dedupes by id only; OBF id ≠ curated id even when brand+name
  // are identical. Run the same shared dedupe used for live results.
  const flatCandidates = dedupCandidates(flatCandidatesRaw).map((c) => {
    if (c.fitBand) return c;
    // Topup-source curated entry — stamp fitBand and a believable
    // relevancePercent so the card shows an honest label.
    return {
      ...c,
      fitBand: 'related' as const,
      relevancePercent: Math.min(c.matchScore ?? 70, 72),
      visibleSource: 'curated' as const,
    };
  });

  const heroId = flatCandidates[0]?.id ?? null;
  const alternativeIds = flatCandidates
    .filter((c) => c.id !== heroId)
    .slice(0, 4)
    .map((c) => c.id);

  // Compute hero skin-fit score for the dev panel.
  const heroSkinFitScore = (() => {
    if (flatCandidates.length === 0) return null;
    const s = scored[0];
    return Math.round(
      Math.max(
        0,
        Math.min(
          100,
          s.score.safetyFit * (100 / 15) - s.score.noisePenalty
        )
      )
    );
  })();
  void heroSkinFitScore; // returned by caller as part of context, not the status

  // v22.1 — surface AI ON to the badge.
  aiTelemetry.setFeatureSource(
    'products',
    'ai',
    `typed-search AI-first: family=${plan.dominantProductFamily}, ${flatCandidates.length} candidates`
  );

  return {
    status: {
      recommendationMode: 'query_driven_search',
      dominantConcern: null,
      aiPlanAttempted: true,
      aiPlanReturned: true,
      aiPlanApplied: true,
      aiPlanReason:
        `typed-search planner returned dominant family ${plan.dominantProductFamily} ` +
        `+ ${plan.searchQueries.length} searchQueries; retrieval matched ${familyMatched.length}/${deduped.length} candidates`,
      aiSelectAttempted: false,
      aiSelectReturned: false,
      aiSelectApplied: false,
      aiSelectReason: 'typed_search path: slot selector intentionally not used',
      userNeedSummary: sanitizeUserNeedSummary(plan.userNeedSummary),
      whyTheseProducts: plan.searchIntentLabel,
      productSourceMode: 'ai_first',
      slotCount: 0,
      slotLabels: [],
      plannerVersion: 'v22.1-search-only',
      selectorVersion: null,
      resultMode: 'typed_search_flat',
      dominantSearchFamily: plan.dominantProductFamily,
      resultCountTotal: flatCandidates.length,
      badgeMode: 'ai_on',
    },
    candidates: flatCandidates,
    matchedProbesById,
    heroId,
    alternativeIds,
  };
}

/**
 * Enrich a single AI plan slot into real LiveProductCandidate
 * objects. Runs the slot's searchQueries[0] through the existing
 * tryLiveSearch pipeline, then filter+dedup+trust scoring per
 * slot, then returns up to 3 candidates per slot.
 *
 * v21.0 — uses the new slot shape (searchQueries / queryFamily).
 */
async function enrichSlot(
  slot: ProductRecommendationSlot,
  profile: ReturnType<typeof selectUserProfileContext>,
  skinState: ReturnType<typeof selectSkinState>,
  parentIntent: InterpretedIntent
): Promise<LiveProductCandidate[]> {
  const slotQuery = slot.searchQueries[0] ?? slot.slotLabel ?? slot.queryFamily;
  const slotIntent: InterpretedIntent = {
    ...parentIntent,
    intentLabel: slot.slotLabel || slot.queryFamily,
  };
  const live = await tryLiveSearch(slotQuery, 'background', {
    profile,
    skinState,
    inferredConcern: parentIntent.interpretedConcern as ConcernType | null,
    intent: slotIntent,
    chipIntent: null,
  });
  let candidates: LiveProductCandidate[] = live.candidates;
  if (candidates.length === 0) {
    candidates = retrieveSeedCandidates({
      query: slotQuery,
      concern: parentIntent.interpretedConcern ?? null,
      limit: 8,
      rotation: 0,
    });
  }
  // v21.2 — STRONGER QUALITY FILTERING. Reject candidates that
  // look like marketplace junk / refills / samples / mini sizes
  // / accessory items / non-real-product variants before scoring.
  // The user's reported symptom is "weak product quality"; the
  // hard filter cuts those out entirely so the AI selector can't
  // pick from them.
  const QUALITY_REJECT_PATTERNS: RegExp[] = [
    /\b(refill|sample|tester|sachet|pouch|travel size|trial size|mini)\b/i,
    /\b(empty bottle|empty container|dispenser only|pump only|applicator)\b/i,
    /\b(gift set|bundle|combo pack|kit)\b/i,
    /\b(value pack|family pack)\b/i,
  ];
  const qualityFiltered = candidates.filter((c) => {
    const corpus = `${c.name ?? ''} ${c.shortDescription ?? ''}`;
    if (QUALITY_REJECT_PATTERNS.some((re) => re.test(corpus))) return false;
    // Reject candidates whose brand is missing AND whose name is
    // suspiciously short / non-product-like.
    const brand = (c.brand ?? '').trim();
    const name = (c.name ?? '').trim();
    if (brand.length < 2 && name.length < 8) return false;
    return true;
  });
  const filtered = filterUsableCandidates(qualityFiltered);
  const deduped = dedupCandidates(filtered);
  const scored = deduped.map((c) =>
    scoreTrustForCandidate({
      candidate: c,
      intent: slotIntent,
      profile,
      skinState,
      matchedProbes: live.matchedProbesById.get(c.id) ?? slot.searchQueries,
    })
  );
  const partition = partitionByTrust(scored);
  // v21.2 — bumped 3 -> 8 candidates per slot. The typed-search
  // flat-list assembly pools across slots and needs material to
  // produce 6 same-intent results; 3 per slot * 4 slots = only 12
  // and aggressive same-family filtering trimmed that to ~3 in
  // the user's reported case. 8 per slot gives flat list enough
  // headroom to surface 6-12 same-family results.
  return partition.alternativePool.slice(0, 8).map((s) => s.candidate);
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
// v19.24 — engine-layer attempt history. Bounded ring buffer so
// the latest 5 attempts are surfaceable to diagnostics + the UI
// without unbounded memory growth. Newest first.
import type {
  RetrievalAttempt,
  RetrievalSource,
  RetrievalTrigger,
} from '@/types/canonical';

const ATTEMPT_HISTORY_CAP = 5;
const _attemptHistory: RetrievalAttempt[] = [];

function genAttemptId(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
  return `att-${t}-${r}`;
}

function recordAttempt(att: RetrievalAttempt): readonly RetrievalAttempt[] {
  _attemptHistory.unshift(att);
  if (_attemptHistory.length > ATTEMPT_HISTORY_CAP) {
    _attemptHistory.length = ATTEMPT_HISTORY_CAP;
  }
  return _attemptHistory.slice();
}

/**
 * v19.24 — public read-only accessor for diagnostics. Returns the
 * engine's bounded attempt history (newest first). Diagnostics now
 * displays this DIRECTLY, so the user sees the same chain the UI
 * just used — not a separate diagnostics-only call.
 */
export function getRecommendationAttemptHistory(): readonly RetrievalAttempt[] {
  return _attemptHistory.slice();
}

/**
 * v19.25 — translate `BackendProductCandidate` (wire shape) to
 * `LiveProductCandidate` (canonical) so the existing pipeline
 * (filter → dedupe → score → assemble) consumes the result
 * without downstream changes.
 */
function backendCandidateToLive(
  bp: BackendProductCandidate
): LiveProductCandidate {
  let imageSource: LiveProductCandidate['imageSource'] = 'none';
  if (bp.imageUrl && bp.imageUrl.length > 0) {
    if (/openbeautyfacts/i.test(bp.imageUrl)) {
      imageSource = 'obf';
    } else {
      imageSource = 'merchant';
    }
  }
  return {
    id: bp.id,
    brand: bp.brand,
    name: bp.name,
    category: (bp.category as LiveProductCandidate['category']) ?? 'unknown',
    concernTags:
      bp.concernTags as unknown as LiveProductCandidate['concernTags'],
    skinTypeTags: bp.skinTypeTags ?? [],
    // v19.31 — preserve ingredients + description from the wire
    // shape so the client trust scorer's metadataCompleteness
    // signal actually fires. Pre-v19.31 these were always blank
    // and metadata score was capped at 4-6 / 10.
    ingredientsHighlights: bp.ingredientsHighlights ?? [],
    price: null,
    currency: 'USD',
    merchantName: bp.merchantName,
    productUrl: bp.productUrl,
    imageUrl: bp.imageUrl,
    imageSource,
    // v19.40 — carry the server's image quality tier + reason
    // through to the client trust scorer + dev truth panel.
    imageQuality: bp.imageQuality ?? null,
    imageQualityReason: bp.imageQualityReason ?? '',
    shortDescription: bp.shortDescription ?? '',
    matchReason: '',
    availability: 'available',
    sourceTimestamp: new Date().toISOString(),
    matchScore: 75,
  };
}

/**
 * v19.26 — backend-owned live search with full personalized
 * context. Forwards the user's profile + latest scan to the
 * server via the v19.26 SearchProductsRequest extension fields
 * so the server can apply a soft personalized sort BEFORE the
 * client gets the candidate set + AI rerank does its pass.
 *
 * Catches all failures and returns `{ candidates: [], failure }`
 * so the engine can fall back to the bundled seed catalog.
 */
async function tryLiveSearch(
  query: string,
  trigger:
    | 'initial_load'
    | 'retry'
    | 'chip_press'
    | 'search'
    | 'assistant'
    | 'background' = 'background',
  context?: {
    profile: ReturnType<typeof selectUserProfileContext>;
    skinState: ReturnType<typeof selectSkinState>;
    inferredConcern: ConcernType | null;
    intent?: InterpretedIntent;
    chipIntent?: string | null;
  }
): Promise<{
  candidates: LiveProductCandidate[];
  failure: string | null;
  // v19.31 — per-candidate matchedProbes annotation from the
  // server's multi-probe fan-out. Keyed by candidate id; empty
  // when the legacy single-query path was used.
  matchedProbesById: Map<string, string[]>;
  // v19.33 — the probe plan actually built and sent to the server.
  // `null` when no intent was supplied (legacy direct callers).
  // The engine threads this onto `RecommendationContext.probeQueries`
  // so the on-device ProductUiTrace shows what fired.
  probePlan: RetrievalProbePlan | null;
}> {
  if (!query || query.trim().length === 0) {
    return {
      candidates: [],
      failure: null,
      matchedProbesById: new Map(),
      probePlan: null,
    };
  }
  try {
    // v19.26 — translate the canonical UserProfileContext +
    // SkinState into the wire-shape SearchProductsRequest. Only
    // pass values that are actually known; absent fields are
    // omitted so the server's defaults stand.
    const skinTypeOnWire =
      context?.profile.skinType === 'dry' ||
      context?.profile.skinType === 'oily' ||
      context?.profile.skinType === 'combination' ||
      context?.profile.skinType === 'sensitive'
        ? context.profile.skinType
        : undefined;
    const topConcernsOnWire = context?.skinState?.topConcerns
      ? context.skinState.topConcerns.map((c) => c.concern)
      : undefined;
    // v19.27 — interpreter produces a richer single OBF query
    //   string for `query`. v19.28 adds a multi-probe plan that
    //   the server fans out across so we don't bet everything on
    //   one literal query string.
    const wireQuery = context?.intent
      ? buildBackendQueryFromIntent(query, context.intent)
      : query;
    let probePlan: RetrievalProbePlan | null = null;
    if (context?.intent) {
      probePlan = buildProbePlan(
        query,
        context.intent,
        context.profile,
        context.skinState
      );
    }
    const res = await searchProductsBackend({
      query: wireQuery,
      concern:
        context?.intent?.interpretedConcern ??
        context?.inferredConcern ??
        null,
      skinType: skinTypeOnWire,
      sensitivities: context?.profile.sensitivities,
      goals: context?.profile.goals,
      latestScanSummary: context?.skinState?.summaryHeadline ?? null,
      topConcerns: topConcernsOnWire,
      limit: 16,
      trigger,
      chipIntent: context?.chipIntent ?? null,
      interpretedIntent: context?.intent
        ? {
            mode: context.intent.mode,
            interpretedConcern: context.intent.interpretedConcern,
            interpretedProductType:
              context.intent.interpretedProductType,
            avoidanceConstraints: context.intent.avoidanceConstraints,
          }
        : undefined,
      probes: probePlan?.probes,
    });
    if (res.source === 'error') {
      return {
        candidates: [],
        failure: res.failureReason ?? 'unknown',
        matchedProbesById: new Map(),
        probePlan,
      };
    }
    // v19.31 — capture matchedProbes from the wire shape into a
    // map keyed by id BEFORE the adapter strips the field. The
    // engine passes this map to the trust scorer so probeSupport
    // actually reflects multi-probe matches.
    const matchedProbesById = new Map<string, string[]>();
    for (const bp of res.candidates) {
      if (Array.isArray(bp.matchedProbes) && bp.matchedProbes.length > 0) {
        matchedProbesById.set(bp.id, bp.matchedProbes);
      }
    }
    return {
      candidates: res.candidates.map(backendCandidateToLive),
      failure: null,
      matchedProbesById,
      probePlan,
    };
  } catch (e) {
    return {
      candidates: [],
      failure: e instanceof Error ? e.message : String(e),
      matchedProbesById: new Map(),
      probePlan: null,
    };
  }
}

// Legacy client-side OBF kept around for any direct caller.
// Engine no longer uses it.
void searchOpenBeautyFacts;

// ---------------------------------------------------------------------------
// v19.36 — hero-pool skin-fit filter.
//
// Runs AFTER trust partition, BEFORE AI rerank. Drops heroes whose
// name / description conflict with the user's inferred skin profile
// for moisturizer-family queries. Returns kept + dropped (with a
// short reason) so the trace can surface "excludedFromHero" and the
// user can see WHY a random heavy cream didn't become hero for an
// oily/acne user.
//
// The alternative pool is intentionally NOT filtered — the user can
// still see a broader set in the alts carousel; only the SINGLE
// HERO is restricted to a skin-fit-aligned candidate.
// ---------------------------------------------------------------------------

export interface HeroSkinFitFilterResult {
  kept: ScoredCandidate[];
  dropped: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
}

const HERO_HEAVY = /rich cream|heavy cream|\bbalm\b|ointment|occlusive|body lotion/i;
const HERO_ULTRALIGHT = /oil[- ]?free gel|\bgel only\b|ultra[- ]?light|matte gel/i;
const HERO_FRAGRANCED = /perfum|fragranced|\bscented\b|essential oil|parfum/i;
const HERO_HARSH_ACTIVE = /retinol moisturizer|exfoliating moisturizer|aha moisturizer|bha moisturizer/i;

// v19.38 — query-family relevance patterns. For "smoothing serum"
// the hero MUST literally be a serum with a smoothing/texture/
// resurfacing/peptide/lactic/PHA signal — a random hydrating
// hyaluronic-acid serum is not a smoothing serum. For "chemical
// exfoliant" the hero MUST contain an acid/exfoliant signal — a
// generic cleanser/toner/cream is not an exfoliant.
const SMOOTHING_SERUM_RELEVANT =
  /\b(serum|essence|ampoule)\b.*\b(smooth|texture|resurfac|peptide|lactic|pha|retinol|glycolic|salicylic|niacinamide)\b|\b(smooth|texture|resurfac|peptide|lactic|pha|retinol|glycolic|salicylic)\b.*\b(serum|essence|ampoule)\b/i;
const EXFOLIANT_RELEVANT =
  /\b(salicylic|glycolic|lactic|mandelic|pha|aha|bha|exfoli|peel|acid)\b/i;
const NON_EXFOLIANT_PRODUCT =
  /\b(cleanser|wash|foam|micellar|moisturi[sz]er|cream|lotion|emulsion|sunscreen|spf|sunblock|spot treatment|patch)\b/i;

function applyHeroSkinFitFilter(
  heroPool: ScoredCandidate[],
  intent: InterpretedIntent,
  skinFit: InferredSkinProfile
): HeroSkinFitFilterResult {
  const pt = intent.interpretedProductType;
  // v19.38 — filter is now active for moisturizer / serum / exfoliant.
  // For other product types (cleanser, toner, mask, spf, eye_cream,
  // spot_treatment) the conflict axes are weaker and we leave the
  // hero pool alone.
  if (pt !== 'moisturizer' && pt !== 'serum' && pt !== 'exfoliant') {
    return { kept: heroPool, dropped: [] };
  }
  const kept: ScoredCandidate[] = [];
  const dropped: HeroSkinFitFilterResult['dropped'] = [];
  for (const s of heroPool) {
    const corpus =
      `${s.candidate.name} ${s.candidate.shortDescription}`.toLowerCase();
    let exclusion: string | null = null;

    if (pt === 'moisturizer') {
      if (
        (skinFit.isOily || skinFit.isAcneProne) &&
        HERO_HEAVY.test(corpus)
      ) {
        exclusion = `excluded: heavy/occlusive cream conflicts with ${skinFit.label}`;
      } else if (
        (skinFit.isDry || skinFit.isBarrier) &&
        HERO_ULTRALIGHT.test(corpus)
      ) {
        exclusion = `excluded: ultra-light gel-only conflicts with ${skinFit.label}`;
      } else if (skinFit.isSensitive && HERO_FRAGRANCED.test(corpus)) {
        exclusion = `excluded: fragranced product conflicts with ${skinFit.label}`;
      } else if (skinFit.isSensitive && HERO_HARSH_ACTIVE.test(corpus)) {
        exclusion = `excluded: harsh-active moisturizer conflicts with ${skinFit.label}`;
      }
    } else if (pt === 'serum') {
      // v19.38 — smoothing-serum / texture-serum query: drop
      // candidates that are not literally smoothing/texture serums.
      // Only enforce when the user's query mentions smoothing /
      // texture / resurfacing — otherwise this would prune valid
      // hydrating serums for "hyaluronic serum" queries.
      const labelLooksTexture =
        /(smooth|texture|resurfac|peptide|exfoli)/i.test(
          intent.intentLabel
        );
      if (labelLooksTexture && !SMOOTHING_SERUM_RELEVANT.test(corpus)) {
        exclusion = `excluded: not a smoothing/texture serum (no smooth/peptide/lactic/PHA signal)`;
      }
    } else if (pt === 'exfoliant') {
      // v19.38 — chemical-exfoliant query: drop candidates that don't
      // mention an acid / PHA / exfoliant ingredient AND look like a
      // non-exfoliant product type. Empty corpus survives so sparse-
      // metadata candidates are not punished.
      if (
        corpus.length > 0 &&
        !EXFOLIANT_RELEVANT.test(corpus) &&
        NON_EXFOLIANT_PRODUCT.test(corpus)
      ) {
        exclusion = `excluded: not a chemical exfoliant (no acid/PHA signal, looks like another product type)`;
      }
    }

    if (exclusion) {
      dropped.push({
        id: s.candidate.id,
        name: `${s.candidate.brand} — ${s.candidate.name}`,
        reason: exclusion,
      });
    } else {
      kept.push(s);
    }
  }
  // Safety net: if every hero was filtered out, keep the highest-
  // trust hero candidate so we still surface SOMETHING. This
  // shouldn't fire often — by the time the trust pool exists, the
  // probes have been skin-shaped and conflicts should be rare. But
  // when it does, an imperfect hero beats no hero (the trust pool
  // is already pre-filtered, so even a "conflicting" candidate is
  // at least skincare).
  if (kept.length === 0 && heroPool.length > 0) {
    kept.push(heroPool[0]);
  }
  return { kept, dropped };
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
    trigger?: RetrievalTrigger;
    /**
     * v19.27 — when the user tapped a Suggested-for-you chip,
     * the chip's text is forwarded here. The intent layer uses
     * it as the interpretation source so the AI rerank prompt
     * sees both the canonical query and the chip context.
     */
    chipIntent?: string | null;
  } = {}
): Promise<RecommendationContext> {
  const intent: RecommendationIntent = opts.intent ?? {
    kind: 'query',
    text: query,
  };
  const state = useAppStore.getState();
  const profile = selectUserProfileContext(state);
  const inferredConcern = inferConcernFromQuery(query);

  // v19.24 — open the attempt record up front. We always close it,
  // success or failure, before returning.
  const attemptId = genAttemptId();
  const startedAt = new Date().toISOString();
  const trigger: RetrievalTrigger = opts.trigger ?? 'background';

  let candidates: LiveProductCandidate[] = [];
  let retrievalSource: 'live' | 'fallback' | 'empty' = 'empty';
  let hardSource: RetrievalSource = 'empty';
  let failureReason: string | null = null;

  // STEP A.LIVE — backend-owned personalized search.
  const latestScan = state.scans[state.scans.length - 1];
  const previousForCtx = latestScan
    ? state.scans
        .filter((s) => s.capturedAt < latestScan.capturedAt)
        .slice(-1)[0]
    : undefined;
  const skinStateForCtx = latestScan
    ? selectSkinState(latestScan, previousForCtx, state.scans)
    : null;

  // v19.27 — interpret the query (or chip) into structured
  // intent BEFORE hitting live retrieval. The interpreter is
  // user-aware: same query text resolves to different intent
  // for different users (different topConcerns, sensitivities).
  const interpretedIntent = interpretSearchIntent(
    query,
    profile,
    skinStateForCtx,
    { chipIntent: opts.chipIntent }
  );

  // v22.1 — TYPED SEARCH GOES THROUGH tryTypedSearch (NOT the slot
  // planner). The slot planner is for best-for-you only and is
  // reachable via getRecommendationContextForScan, not this entry.
  // This entry point is always typed search (free-text from the
  // search bar OR a concern chip routed through it). The previous
  // multi-slot planner + majority-vote dominantFamily approach was
  // the bug — replaced verbatim by the dedicated typed-search path.
  //
  // For "best for my skin" / "best for me" free-text queries the
  // user typed explicitly, we still route through tryTypedSearch
  // (the typed-search planner is smart enough to infer dominant
  // family from skin profile when the query is vague). The slot
  // planner is reserved for the scan-driven best-for-you surface.
  const typedOutcome = await tryTypedSearch({
    rawQuery: query,
    profile,
    skinState: skinStateForCtx,
    trigger,
    interpretedIntent,
  });
  // Alias to the legacy variable name so the success branch below
  // reads as before. The AiFirstOutcome shape is compatible.
  const aiFirstOutcome: AiFirstOutcome = {
    status: typedOutcome.status,
    candidates: typedOutcome.candidates,
    matchedProbesById: typedOutcome.matchedProbesById,
    heroId: typedOutcome.heroId,
    alternativeIds: typedOutcome.alternativeIds,
  };

  // When typed-search AI SUCCEEDS, skip the entire legacy
  // retrieve+filter+trust+rerank pipeline. The flat AI-driven
  // ranked list IS the final result. Cache + build the canonical
  // context directly.
  if (aiFirstOutcome.status.productSourceMode === 'ai_first') {
    cacheCandidates(aiFirstOutcome.candidates);
    const aiHero = aiFirstOutcome.candidates.find(
      (c) => c.id === aiFirstOutcome.heroId
    ) ?? null;
    // v19.43 — heroSkinFitScore for the AI-chosen hero. Compute
    // from a single-candidate trust score so the dev panel still
    // surfaces a comparable number.
    const heroSkinFit = aiHero
      ? scoreTrustForCandidate({
          candidate: aiHero,
          intent: interpretedIntent,
          profile,
          skinState: skinStateForCtx,
          matchedProbes:
            aiFirstOutcome.matchedProbesById.get(aiHero.id) ?? [],
        })
      : null;
    const heroSkinFitScoreAi = heroSkinFit
      ? Math.round(
          Math.max(
            0,
            Math.min(
              100,
              heroSkinFit.score.safetyFit * (100 / 15) -
                heroSkinFit.score.noisePenalty
            )
          )
        )
      : null;
    const attempt: RetrievalAttempt = {
      id: attemptId,
      startedAt,
      completedAt: new Date().toISOString(),
      trigger,
      query,
      source: 'obf_live',
      success: true,
      failureReason: null,
    };
    const attempts = recordAttempt(attempt);
    // Synthesize a rerank status that explicitly says AI-first
    // drove the result. heroBefore/heroAfter both = AI hero, source
    // = 'ai_rerank' (the planner IS the AI rerank). This keeps the
    // existing rerank fields meaningful even though the rerank
    // method itself was bypassed.
    const aiFirstRerankStatus: RerankStatus = {
      attempted: true,
      skipped: false,
      skipReason: null,
      returned: true,
      returnReason: null,
      applied: true,
      appliedReason: 'AI-first planner produced enriched candidates',
      heroBeforeRerank: aiFirstOutcome.heroId,
      heroAfterRerank: aiFirstOutcome.heroId,
      alternativeIdsBeforeRerank: aiFirstOutcome.alternativeIds,
      alternativeIdsAfterRerank: aiFirstOutcome.alternativeIds,
      source: 'ai_rerank',
    };
    return buildRecommendationContext({
      intent,
      candidates: aiFirstOutcome.candidates,
      profile,
      skinState: skinStateForCtx,
      state: 'available',
      failureReason: undefined,
      rerankResult: {
        heroId: aiFirstOutcome.heroId,
        alternativeIds: aiFirstOutcome.alternativeIds,
        whyHeroFits: aiFirstOutcome.status.whyTheseProducts,
        whatToAvoid: [],
      },
      retrievalSource: 'live',
      attempt,
      attemptHistory: attempts,
      interpretedIntentLabel: interpretedIntent.intentLabel,
      probeQueries: aiFirstOutcome.candidates
        .flatMap((c) => aiFirstOutcome.matchedProbesById.get(c.id) ?? [])
        .filter((q, i, arr) => arr.indexOf(q) === i)
        .slice(0, 8),
      queryFamily: `ai_first:${aiFirstOutcome.status.recommendationMode}`,
      skinFitReason:
        inferSkinProfile(profile, skinStateForCtx).label,
      heroSkinFitScore: heroSkinFitScoreAi,
      excludedFromHero: [],
      rerankStatus: aiFirstRerankStatus,
      recommendationStatus: aiFirstOutcome.status,
    });
  }

  // AI-first did not produce a usable plan. The status records
  // WHY (proxy unavailable / planner failed / zero enriched). The
  // legacy retrieve+filter+trust+rerank path runs below as the
  // fallback. We stash the status to thread onto the final
  // RecommendationContext after the legacy path finishes.
  const fallbackRecommendationStatus = aiFirstOutcome.status;

  const live = await tryLiveSearch(query, trigger, {
    profile,
    skinState: skinStateForCtx,
    inferredConcern,
    intent: interpretedIntent,
    chipIntent: opts.chipIntent,
  });
  if (live.candidates.length > 0) {
    candidates = live.candidates;
    retrievalSource = 'live';
    hardSource = 'obf_live';
  } else {
    failureReason = live.failure;
  }

  // v19.33 — track which probe plan was actually consumed
  // (live first, seed-fallback second). Threaded onto the canonical
  // RecommendationContext so the on-device ProductUiTrace can
  // surface the exact probes that fired.
  let effectiveProbePlan: RetrievalProbePlan | null = live.probePlan;

  // STEP A.FALLBACK — seed catalog when OBF didn't deliver.
  // v19.28: also probe the seed catalog using the same probe plan
  // so vague queries that overshot OBF can still find catalog
  // matches. The seed catalog is small (24 products) but well-
  // tagged; richer probes hit more of it than a literal query.
  if (candidates.length === 0) {
    const merged = new Map<string, LiveProductCandidate>();
    const rotation = opts.fresh ? Math.floor(Date.now() / 1000) : 0;
    // Primary literal query first.
    for (const c of retrieveSeedCandidates({
      query,
      concern: interpretedIntent.interpretedConcern ?? inferredConcern,
      limit: 8,
      rotation,
    })) {
      merged.set(c.id, c);
    }
    // Then fan out across the probe plan so "best for my skin"
    // / vague queries get coverage.
    const seedProbePlan = buildProbePlan(
      query,
      interpretedIntent,
      profile,
      skinStateForCtx
    );
    // v19.33 — when the live path produced no probe plan (early-exit
    // or empty query), the seed plan is the truth.
    if (!effectiveProbePlan) {
      effectiveProbePlan = seedProbePlan;
    }
    for (const probe of seedProbePlan.probes.slice(0, 3)) {
      for (const c of retrieveSeedCandidates({
        query: probe.query,
        concern: interpretedIntent.interpretedConcern ?? null,
        limit: 6,
        rotation,
      })) {
        if (!merged.has(c.id)) merged.set(c.id, c);
      }
    }
    candidates = Array.from(merged.values()).slice(0, 12);
    if (candidates.length > 0) {
      retrievalSource = 'fallback';
      hardSource = 'seed_fallback';
    }
  }

  // STEP B-D — normalize, filter, dedupe.
  const filtered = filterUsableCandidates(candidates);
  const deduped = dedupCandidates(filtered);

  // STEP D.5 — v19.29 trust scoring + partition. v19.31 passes
  // per-candidate matchedProbes from the server's multi-probe
  // fan-out so probeSupport actually reflects evidence quality.
  const scoredFree: ScoredCandidate[] = deduped.map((c) =>
    scoreTrustForCandidate({
      candidate: c,
      intent: interpretedIntent,
      profile,
      skinState: skinStateForCtx,
      matchedProbes: live.matchedProbesById.get(c.id) ?? [],
    })
  );
  const partitionedFree = partitionByTrust(scoredFree);
  // v19.36 — apply skin-fit filter to the hero pool BEFORE rerank.
  // Drops heroes whose name/description conflicts with the user's
  // inferred skin profile (heavy creams for oily/acne, ultra-light
  // gels for dry/barrier, fragranced products for sensitive). The
  // alternative pool is left untouched so the user still sees a
  // broader set; only the HERO is restricted to skin-fit-aligned.
  const skinFitFree = inferSkinProfile(profile, skinStateForCtx);
  const heroFitFree = applyHeroSkinFitFilter(
    partitionedFree.heroPool,
    interpretedIntent,
    skinFitFree
  );
  const trustedFree = partitionedFree.alternativePool.map(
    (s) => s.candidate
  );
  const heroIdsFree = new Set(
    heroFitFree.kept.map((s) => s.candidate.id)
  );

  // Final hard source: empty when (a) filter+dedupe killed all
  // candidates OR (b) trust pass dropped them all to junk.
  if (deduped.length === 0 || trustedFree.length === 0) {
    hardSource = failureReason && hardSource === 'empty' ? 'error' : 'empty';
  }

  // STEP F — personalized AI rerank with bounded race.
  // v19.29 — receives ONLY the trust pool. AI cannot rescue
  // dropped junk; AI personalizes WITHIN the trustworthy set.
  // v19.42 — record EVERY step of the rerank attempt in
  // `rerankStatus` so the dev panel can never go gray. The
  // status starts as "deterministic_fallback" (the default) and
  // is upgraded as the attempt progresses.
  let rerank: AIRerankResult | null = null;
  // Deterministic baseline: what would the hero be WITHOUT AI?
  const heroBeforeRerank: string | null =
    heroFitFree.kept[0]?.candidate.id ??
    partitionedFree.alternativePool[0]?.candidate.id ??
    null;
  const alternativeIdsBeforeRerank: string[] = trustedFree
    .filter((c) => c.id !== heroBeforeRerank)
    .slice(0, 4)
    .map((c) => c.id);
  let rerankStatusFree: RerankStatus = {
    attempted: false,
    skipped: true,
    skipReason: null,
    returned: false,
    returnReason: null,
    applied: false,
    appliedReason: null,
    heroBeforeRerank,
    heroAfterRerank: heroBeforeRerank,
    alternativeIdsBeforeRerank,
    alternativeIdsAfterRerank: alternativeIdsBeforeRerank,
    source: 'deterministic_fallback',
  };

  if (trigger === 'background') {
    rerankStatusFree = {
      ...rerankStatusFree,
      skipReason:
        "trigger='background' (engine called for cache prewarm, AI rerank deliberately skipped)",
    };
  } else if (trustedFree.length < 2) {
    rerankStatusFree = {
      ...rerankStatusFree,
      skipReason: `trustedFree.length=${trustedFree.length} (< 2, nothing to rerank)`,
    };
  } else {
    // v19.42 — gate cleared. Attempt rerank and capture the
    // explicit outcome envelope. No more silent null.
    const outcome = await tryRerankProductsBounded({
      candidates: trustedFree,
      profile,
      skinState: skinStateForCtx,
      intentLabel: interpretedIntent.intentLabel,
      rawQuery: query,
      chipIntent: opts.chipIntent ?? null,
      interpretedIntent,
      trustScores: partitionedFree.alternativePool.map((s) => ({
        id: s.candidate.id,
        trust: s.score.total,
        hasImage: s.hasImage,
      })),
      skinProfile: skinFitFree,
    });
    rerankStatusFree = {
      ...rerankStatusFree,
      attempted: outcome.attempted,
      skipped: outcome.skipped,
      skipReason: outcome.skipReason,
      returned: outcome.returned,
      returnReason: outcome.returnReason,
    };
    if (outcome.result && outcome.result.heroId) {
      rerank = outcome.result;
      rerankStatusFree = {
        ...rerankStatusFree,
        applied: true,
        appliedReason: 'AI rerank returned valid heroId; applying',
        heroAfterRerank: outcome.result.heroId,
        alternativeIdsAfterRerank: outcome.result.alternativeIds,
        source: 'ai_rerank',
      };
    } else if (outcome.attempted) {
      // AI was attempted but failed — explicit reason on the
      // status; deterministic skin-fit fallback follows.
      rerankStatusFree = {
        ...rerankStatusFree,
        source: 'ai_failed_fallback',
        appliedReason:
          outcome.returnReason ??
          'AI rerank returned no valid heroId; using deterministic skin-fit hero',
      };
    }
  }

  // v19.38 — DETERMINISTIC SKIN-FIT FALLBACK.
  // When AI rerank failed (proxy unreachable / race timeout / null
  // result), buildRecommendationContext picks `localSorted[0]` from
  // the candidate set as hero. That candidate is the top-localScore
  // entry from the FULL alternativePool — which can be a skin-fit-
  // CONFLICTING candidate (e.g. a heavy cream for an oily user)
  // because the alternativePool is broader than heroFitFree.kept.
  // Synthesize a deterministic rerank from heroFitFree.kept[0] so
  // the fallback hero is always skin-fit-aligned.
  if (rerank === null && heroFitFree.kept.length > 0) {
    const detHero = heroFitFree.kept[0].candidate;
    rerank = {
      heroId: detHero.id,
      alternativeIds: trustedFree
        .filter((c) => c.id !== detHero.id)
        .slice(0, 4)
        .map((c) => c.id),
      whyHeroFits: null,
      whatToAvoid: [],
    };
  }
  // v19.29 — clamp AI's hero choice to the hero pool. If AI
  // picked an alt-only candidate, repair to the top hero
  // candidate. AI personalizes; it does NOT override the hero
  // threshold.
  // v19.38 — repair target now `heroFitFree.kept[0]` (skin-fit
  // aligned) instead of `partitionedFree.heroPool[0]` (which
  // could be skin-fit-conflicting).
  if (rerank?.heroId && !heroIdsFree.has(rerank.heroId)) {
    const altMatch = rerank.alternativeIds.find((id) =>
      heroIdsFree.has(id)
    );
    const repaired =
      altMatch ?? heroFitFree.kept[0]?.candidate.id ?? null;
    rerank = {
      ...rerank,
      heroId: repaired,
      alternativeIds: rerank.alternativeIds.filter(
        (id) => id !== repaired
      ),
    };
  }
  // v19.30 — prefer image-backed hero. If AI picked a hero
  // without an image AND there's an image-backed peer in the
  // hero pool with a similar trust score (within 8 points),
  // swap them. The hero card NEEDS a real packshot; trust
  // scoring already weights image presence, but this catches
  // the rare case where two hero-pool candidates have similar
  // total scores and AI picked the image-less one for
  // personalization reasons that don't matter visually.
  if (rerank?.heroId) {
    const heroEntry = partitionedFree.heroPool.find(
      (s) => s.candidate.id === rerank!.heroId
    );
    if (heroEntry && !heroEntry.hasImage) {
      const imageBackedAlternative = partitionedFree.heroPool.find(
        (s) =>
          s.candidate.id !== rerank!.heroId &&
          s.hasImage &&
          heroEntry.score.total - s.score.total <= 8
      );
      if (imageBackedAlternative) {
        const oldHero = rerank.heroId;
        const newHero = imageBackedAlternative.candidate.id;
        rerank = {
          ...rerank,
          heroId: newHero,
          alternativeIds: [
            oldHero,
            ...rerank.alternativeIds.filter(
              (id) => id !== oldHero && id !== newHero
            ),
          ],
        };
      }
    }
  }

  // STEP E + G — local score + canonical assembly.
  const availability: RecommendationAvailability =
    trustedFree.length > 0 ? 'available' : 'empty';

  // Close the attempt record + push to bounded history.
  const attempt: RetrievalAttempt = {
    id: attemptId,
    startedAt,
    completedAt: new Date().toISOString(),
    trigger,
    query,
    source: hardSource,
    success: trustedFree.length > 0,
    failureReason,
  };
  const attempts = recordAttempt(attempt);

  // v19.36 — compute the hero's skin-fit score for the trace. The
  // safetyFit + (max - noisePenalty) component already encodes
  // skin-fit; we derive a normalized 0..100 number directly off
  // the hero's score breakdown so the trace shows ONE number the
  // user can look at.
  const heroIdResolved = rerank?.heroId ?? heroFitFree.kept[0]?.candidate.id ?? null;
  const heroScored = heroIdResolved
    ? partitionedFree.alternativePool.find(
        (s) => s.candidate.id === heroIdResolved
      )
    : null;
  const heroSkinFitScore = heroScored
    ? Math.round(
        Math.max(
          0,
          Math.min(
            100,
            heroScored.score.safetyFit * (100 / 15) -
              heroScored.score.noisePenalty
          )
        )
      )
    : null;

  // v19.37 — cache the trust-pool candidates into the shared
  // liveProductsById store. Without this, ProductDetail (which
  // resolves productId -> liveProductsById[productId]) never
  // finds a candidate written by the v19.x engine and renders
  // the "Product not found" empty state. This was the root
  // cause of the user's tap-card "Product not found" bug.
  cacheCandidates(trustedFree);

  return buildRecommendationContext({
    intent,
    // v19.29 — only trust-pool candidates reach the canonical
    // context. The engine no longer surfaces below-threshold
    // junk to the UI.
    candidates: trustedFree,
    profile,
    skinState: skinStateForCtx,
    state: availability,
    failureReason: failureReason ?? undefined,
    rerankResult: rerank,
    retrievalSource: trustedFree.length > 0 ? retrievalSource : 'empty',
    attempt,
    attemptHistory: attempts,
    // v19.33 — surface the structured intent + actual probes onto
    // the canonical context so the on-device ProductUiTrace can
    // show exactly which decisions drove this fetch.
    interpretedIntentLabel: interpretedIntent.intentLabel,
    probeQueries:
      effectiveProbePlan?.probes.map((p) => p.query) ?? [],
    // v19.36 — personalization fields the truth panel renders.
    queryFamily: effectiveProbePlan?.primaryIntentLabel ?? null,
    skinFitReason: skinFitFree.label,
    heroSkinFitScore,
    excludedFromHero: heroFitFree.dropped,
    // v19.42 — explicit rerank execution status. The dev truth
    // panel renders every field; gray/silent state is no longer
    // possible.
    rerankStatus: rerankStatusFree,
    // v19.43 — thread the AI-first attempt outcome onto the canonical
    // context. Even though the legacy path produced the visible
    // result, the recommendationStatus tells the user WHY AI-first
    // didn't (proxy down / timeout / empty plan / zero enriched).
    recommendationStatus: fallbackRecommendationStatus,
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
    trigger?: RetrievalTrigger;
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

  // v19.24 — open the attempt record.
  const attemptId = genAttemptId();
  const startedAt = new Date().toISOString();
  const trigger: RetrievalTrigger = opts.trigger ?? 'initial_load';

  let candidates: LiveProductCandidate[] = [];
  let retrievalSource: 'live' | 'fallback' | 'empty' = 'empty';
  let hardSource: RetrievalSource = 'empty';
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
  // v19.26 — pass full personalized context to /searchProducts.
  // v19.27 — interpret the scan-shaped query the same way the
  // free-text path does so the server gets structured intent.
  const scanIntentForLive = interpretSearchIntent(
    liveQuery,
    profile,
    skinState
  );

  // v19.43 — AI-FIRST PRIMARY PATH for the scan engine. Same
  // pattern as the free-text engine: planner runs first; if it
  // succeeds, AI-chosen slots are the visible result. If it fails,
  // the legacy path below runs as fallback and the status
  // records why.
  const aiFirstOutcomeScan = await tryAiFirstRecommendation({
    query: null, // scan-driven, no typed query
    profile,
    skinState,
    trigger,
    interpretedIntent: scanIntentForLive,
    suggestedMode: 'best_for_you',
  });
  if (aiFirstOutcomeScan.status.productSourceMode === 'ai_first') {
    cacheCandidates(aiFirstOutcomeScan.candidates);
    const aiHero = aiFirstOutcomeScan.candidates.find(
      (c) => c.id === aiFirstOutcomeScan.heroId
    ) ?? null;
    const heroSkinFit = aiHero
      ? scoreTrustForCandidate({
          candidate: aiHero,
          intent: scanIntentForLive,
          profile,
          skinState,
          matchedProbes:
            aiFirstOutcomeScan.matchedProbesById.get(aiHero.id) ?? [],
        })
      : null;
    const heroSkinFitScoreAi = heroSkinFit
      ? Math.round(
          Math.max(
            0,
            Math.min(
              100,
              heroSkinFit.score.safetyFit * (100 / 15) -
                heroSkinFit.score.noisePenalty
            )
          )
        )
      : null;
    const attempt: RetrievalAttempt = {
      id: attemptId,
      startedAt,
      completedAt: new Date().toISOString(),
      trigger,
      query: liveQuery,
      source: 'obf_live',
      success: true,
      failureReason: null,
    };
    const attempts = recordAttempt(attempt);
    const aiFirstRerankStatus: RerankStatus = {
      attempted: true,
      skipped: false,
      skipReason: null,
      returned: true,
      returnReason: null,
      applied: true,
      appliedReason:
        'AI-first planner produced enriched candidates (scan path)',
      heroBeforeRerank: aiFirstOutcomeScan.heroId,
      heroAfterRerank: aiFirstOutcomeScan.heroId,
      alternativeIdsBeforeRerank: aiFirstOutcomeScan.alternativeIds,
      alternativeIdsAfterRerank: aiFirstOutcomeScan.alternativeIds,
      source: 'ai_rerank',
    };
    return buildRecommendationContext({
      intent,
      candidates: aiFirstOutcomeScan.candidates,
      profile,
      skinState,
      state: 'available',
      failureReason: undefined,
      rerankResult: {
        heroId: aiFirstOutcomeScan.heroId,
        alternativeIds: aiFirstOutcomeScan.alternativeIds,
        whyHeroFits: aiFirstOutcomeScan.status.whyTheseProducts,
        whatToAvoid: [],
      },
      retrievalSource: 'live',
      attempt,
      attemptHistory: attempts,
      interpretedIntentLabel: scanIntentForLive.intentLabel,
      probeQueries: aiFirstOutcomeScan.candidates
        .flatMap(
          (c) => aiFirstOutcomeScan.matchedProbesById.get(c.id) ?? []
        )
        .filter((q, i, arr) => arr.indexOf(q) === i)
        .slice(0, 8),
      queryFamily: `ai_first:${aiFirstOutcomeScan.status.recommendationMode}`,
      skinFitReason: inferSkinProfile(profile, skinState).label,
      heroSkinFitScore: heroSkinFitScoreAi,
      excludedFromHero: [],
      rerankStatus: aiFirstRerankStatus,
      recommendationStatus: aiFirstOutcomeScan.status,
    });
  }
  const fallbackRecommendationStatusScan = aiFirstOutcomeScan.status;

  const live = await tryLiveSearch(liveQuery, trigger, {
    profile,
    skinState,
    inferredConcern: primaryConcern as ConcernType | null,
    intent: scanIntentForLive,
    chipIntent: null,
  });
  if (live.candidates.length > 0) {
    candidates = live.candidates;
    retrievalSource = 'live';
    hardSource = 'obf_live';
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
    if (candidates.length > 0) {
      retrievalSource = 'fallback';
      hardSource = 'seed_fallback';
    }
  }

  // STEP B-D — normalize, filter, dedupe.
  const filtered = filterUsableCandidates(candidates);
  const deduped = dedupCandidates(filtered);

  // STEP D.5 — v19.29 trust scoring + partition. v19.31 threads
  // matchedProbes from the server fan-out into the scorer.
  const scanIntent = interpretSearchIntent(liveQuery, profile, skinState);
  const scoredScan: ScoredCandidate[] = deduped.map((c) =>
    scoreTrustForCandidate({
      candidate: c,
      intent: scanIntent,
      profile,
      skinState,
      matchedProbes: live.matchedProbesById.get(c.id) ?? [],
    })
  );
  const partitionedScan = partitionByTrust(scoredScan);
  // v19.36 — same skin-fit filter as the free-text path.
  const skinFitScan = inferSkinProfile(profile, skinState);
  const heroFitScan = applyHeroSkinFitFilter(
    partitionedScan.heroPool,
    scanIntent,
    skinFitScan
  );
  const trustedScan = partitionedScan.alternativePool.map(
    (s) => s.candidate
  );
  const heroIdsScan = new Set(
    heroFitScan.kept.map((s) => s.candidate.id)
  );

  // Final hard source: empty when filter+dedupe killed all OR
  // when trust pass dropped them all to junk.
  if (deduped.length === 0 || trustedScan.length === 0) {
    hardSource = failureReason && hardSource === 'empty' ? 'error' : 'empty';
  }

  // STEP F — personalized AI rerank with bounded race.
  // v19.29 — receives ONLY trust-pool candidates.
  // v19.42 — same explicit rerank-status capture as the
  // free-text path. Best-for-you (scan path) is the surface the
  // user specifically complained about (different users see the
  // same products); the status now records EXACTLY whether AI
  // ran for this scan and, if not, why.
  let rerank: AIRerankResult | null = null;
  const heroBeforeRerankScan: string | null =
    heroFitScan.kept[0]?.candidate.id ??
    partitionedScan.alternativePool[0]?.candidate.id ??
    null;
  const alternativeIdsBeforeRerankScan: string[] = trustedScan
    .filter((c) => c.id !== heroBeforeRerankScan)
    .slice(0, 4)
    .map((c) => c.id);
  let rerankStatusScan: RerankStatus = {
    attempted: false,
    skipped: true,
    skipReason: null,
    returned: false,
    returnReason: null,
    applied: false,
    appliedReason: null,
    heroBeforeRerank: heroBeforeRerankScan,
    heroAfterRerank: heroBeforeRerankScan,
    alternativeIdsBeforeRerank: alternativeIdsBeforeRerankScan,
    alternativeIdsAfterRerank: alternativeIdsBeforeRerankScan,
    source: 'deterministic_fallback',
  };

  if (trigger === 'background') {
    rerankStatusScan = {
      ...rerankStatusScan,
      skipReason:
        "trigger='background' (scan engine called for cache prewarm, AI rerank deliberately skipped)",
    };
  } else if (trustedScan.length < 2) {
    rerankStatusScan = {
      ...rerankStatusScan,
      skipReason: `trustedScan.length=${trustedScan.length} (< 2, nothing to rerank)`,
    };
  } else {
    const outcome = await tryRerankProductsBounded({
      candidates: trustedScan,
      profile,
      skinState,
      intentLabel:
        primaryConcern?.replace(/_/g, ' ') ?? 'best for your skin',
      rawQuery: liveQuery,
      chipIntent: null,
      interpretedIntent: scanIntent,
      trustScores: partitionedScan.alternativePool.map((s) => ({
        id: s.candidate.id,
        trust: s.score.total,
        hasImage: s.hasImage,
      })),
      skinProfile: skinFitScan,
    });
    rerankStatusScan = {
      ...rerankStatusScan,
      attempted: outcome.attempted,
      skipped: outcome.skipped,
      skipReason: outcome.skipReason,
      returned: outcome.returned,
      returnReason: outcome.returnReason,
    };
    if (outcome.result && outcome.result.heroId) {
      rerank = outcome.result;
      rerankStatusScan = {
        ...rerankStatusScan,
        applied: true,
        appliedReason: 'AI rerank returned valid heroId; applying',
        heroAfterRerank: outcome.result.heroId,
        alternativeIdsAfterRerank: outcome.result.alternativeIds,
        source: 'ai_rerank',
      };
    } else if (outcome.attempted) {
      rerankStatusScan = {
        ...rerankStatusScan,
        source: 'ai_failed_fallback',
        appliedReason:
          outcome.returnReason ??
          'AI rerank returned no valid heroId; using deterministic skin-fit hero',
      };
    }
  }

  // v19.38 — same deterministic skin-fit fallback for the scan path.
  if (rerank === null && heroFitScan.kept.length > 0) {
    const detHero = heroFitScan.kept[0].candidate;
    rerank = {
      heroId: detHero.id,
      alternativeIds: trustedScan
        .filter((c) => c.id !== detHero.id)
        .slice(0, 4)
        .map((c) => c.id),
      whyHeroFits: null,
      whatToAvoid: [],
    };
  }
  // v19.29 — clamp AI's hero choice to the hero pool.
  // v19.38 — repair target = heroFitScan.kept[0] (skin-fit aligned).
  if (rerank?.heroId && !heroIdsScan.has(rerank.heroId)) {
    const altMatch = rerank.alternativeIds.find((id) =>
      heroIdsScan.has(id)
    );
    const repaired =
      altMatch ?? heroFitScan.kept[0]?.candidate.id ?? null;
    rerank = {
      ...rerank,
      heroId: repaired,
      alternativeIds: rerank.alternativeIds.filter(
        (id) => id !== repaired
      ),
    };
  }
  // v19.30 — prefer image-backed hero (same rule as free-text path).
  if (rerank?.heroId) {
    const heroEntry = partitionedScan.heroPool.find(
      (s) => s.candidate.id === rerank!.heroId
    );
    if (heroEntry && !heroEntry.hasImage) {
      const imageBackedAlternative = partitionedScan.heroPool.find(
        (s) =>
          s.candidate.id !== rerank!.heroId &&
          s.hasImage &&
          heroEntry.score.total - s.score.total <= 8
      );
      if (imageBackedAlternative) {
        const oldHero = rerank.heroId;
        const newHero = imageBackedAlternative.candidate.id;
        rerank = {
          ...rerank,
          heroId: newHero,
          alternativeIds: [
            oldHero,
            ...rerank.alternativeIds.filter(
              (id) => id !== oldHero && id !== newHero
            ),
          ],
        };
      }
    }
  }

  // STEP E + G — local score + canonical assembly.
  const availability: RecommendationAvailability =
    trustedScan.length > 0 ? 'available' : 'empty';

  // v19.24 — close the attempt + push history.
  const attempt: RetrievalAttempt = {
    id: attemptId,
    startedAt,
    completedAt: new Date().toISOString(),
    trigger,
    query: liveQuery,
    source: hardSource,
    success: trustedScan.length > 0,
    failureReason,
  };
  const attempts = recordAttempt(attempt);

  // v19.36 — same hero-skin-fit score computation for the scan path.
  const heroIdResolvedScan =
    rerank?.heroId ?? heroFitScan.kept[0]?.candidate.id ?? null;
  const heroScoredScan = heroIdResolvedScan
    ? partitionedScan.alternativePool.find(
        (s) => s.candidate.id === heroIdResolvedScan
      )
    : null;
  const heroSkinFitScoreScan = heroScoredScan
    ? Math.round(
        Math.max(
          0,
          Math.min(
            100,
            heroScoredScan.score.safetyFit * (100 / 15) -
              heroScoredScan.score.noisePenalty
          )
        )
      )
    : null;

  // v19.37 — cache scan-path candidates into liveProductsById too,
  // so ProductDetail can resolve any candidate the user taps from
  // the scan results carousel without falling to "Product not found".
  cacheCandidates(trustedScan);

  return buildRecommendationContext({
    intent,
    candidates: trustedScan,
    profile,
    skinState,
    state: availability,
    failureReason: failureReason ?? undefined,
    rerankResult: rerank,
    retrievalSource: trustedScan.length > 0 ? retrievalSource : 'empty',
    attempt,
    attemptHistory: attempts,
    // v19.33 — surface the structured intent + actual probes onto
    // the canonical context. The scan path's probe plan was built
    // by tryLiveSearch from the concern-shaped query above.
    interpretedIntentLabel: scanIntent.intentLabel,
    probeQueries: live.probePlan?.probes.map((p) => p.query) ?? [],
    // v19.36 — personalization fields (scan path).
    queryFamily: live.probePlan?.primaryIntentLabel ?? null,
    skinFitReason: skinFitScan.label,
    heroSkinFitScore: heroSkinFitScoreScan,
    excludedFromHero: heroFitScan.dropped,
    // v19.42 — rerank status (scan path).
    rerankStatus: rerankStatusScan,
    // v19.43 — recommendation status from the AI-first attempt
    // (scan path fallback).
    recommendationStatus: fallbackRecommendationStatusScan,
  });
}

// Silence the unused-import linter for the legacy helper now that
// the primary paths no longer call it. It remains exported for
// the legacy ProductsScreen search path and any future
// AI-augmentation caller.
void APP_CONCERN_TO_AI_CONCERN;

// ---------------------------------------------------------------------------
// v19.30 — verifyTrustPipeline. Public diagnostic helper that runs
// a query through the full deterministic pre-AI pipeline (live
// retrieval → filter → dedupe → trust scoring → partition) and
// returns the structured trace WITHOUT firing AI rerank. Lets
// diagnostics show "for query X, here are the top N candidates,
// their scores, and which pool they fell into".
//
// Same engine path consumers use, just stops short of AI rerank
// so the diagnostics view is fast and identical to what the UI
// would see deterministically.
// ---------------------------------------------------------------------------

export interface TrustVerificationEntry {
  candidateId: string;
  brand: string;
  name: string;
  hasImage: boolean;
  imageSource: LiveProductCandidate['imageSource'];
  trust: CandidateTrustScore;
  pool: 'hero' | 'alternative' | 'dropped';
}

export interface TrustVerificationResult {
  query: string;
  intent: {
    mode: string;
    interpretedConcern: string | null;
    interpretedProductType: string | null;
    avoidanceConstraints: string[];
  };
  retrievalSource: 'live' | 'fallback' | 'empty';
  rawCandidateCount: number;
  trustPoolCount: number;
  heroPoolCount: number;
  imageBackedCount: number;
  topEntries: TrustVerificationEntry[];
  failureReason: string | null;
}

export async function verifyTrustPipeline(
  query: string
): Promise<TrustVerificationResult> {
  const state = useAppStore.getState();
  const profile = selectUserProfileContext(state);
  const latestScan = state.scans[state.scans.length - 1];
  const previousForCtx = latestScan
    ? state.scans
        .filter((s) => s.capturedAt < latestScan.capturedAt)
        .slice(-1)[0]
    : undefined;
  const skinStateForCtx = latestScan
    ? selectSkinState(latestScan, previousForCtx, state.scans)
    : null;

  const interpretedIntent = interpretSearchIntent(
    query,
    profile,
    skinStateForCtx
  );

  // Live retrieval (multi-probe).
  const live = await tryLiveSearch(query, 'background', {
    profile,
    skinState: skinStateForCtx,
    inferredConcern: interpretedIntent.interpretedConcern as
      | ConcernType
      | null,
    intent: interpretedIntent,
    chipIntent: null,
  });

  let candidates: LiveProductCandidate[] = live.candidates;
  let retrievalSource: 'live' | 'fallback' | 'empty' =
    live.candidates.length > 0 ? 'live' : 'empty';
  let failureReason: string | null = live.failure;

  if (candidates.length === 0) {
    // Seed fallback so verification mirrors the real engine path.
    const seed = retrieveSeedCandidates({
      query,
      concern: interpretedIntent.interpretedConcern,
      limit: 12,
      rotation: 0,
    });
    candidates = seed;
    if (seed.length > 0) retrievalSource = 'fallback';
  }

  const filtered = filterUsableCandidates(candidates);
  const deduped = dedupCandidates(filtered);

  // Score every survivor. v19.31 — pass matchedProbes from the
  // verification's own live retrieval so the trace shows real
  // probe evidence per candidate.
  const scored: ScoredCandidate[] = deduped.map((c) =>
    scoreTrustForCandidate({
      candidate: c,
      intent: interpretedIntent,
      profile,
      skinState: skinStateForCtx,
      matchedProbes: live.matchedProbesById.get(c.id) ?? [],
    })
  );
  const partitioned = partitionByTrust(scored);
  const heroIds = new Set(partitioned.heroPool.map((s) => s.candidate.id));
  const altIds = new Set(
    partitioned.alternativePool.map((s) => s.candidate.id)
  );

  // Build per-entry trace, sorted by score desc. Cap at 8 to keep
  // diagnostics compact.
  const allScored = [...scored].sort(
    (a, b) => b.score.total - a.score.total
  );
  const topEntries: TrustVerificationEntry[] = allScored
    .slice(0, 8)
    .map((s) => ({
      candidateId: s.candidate.id,
      brand: s.candidate.brand,
      name: s.candidate.name,
      hasImage: s.hasImage,
      imageSource: s.candidate.imageSource,
      trust: s.score,
      pool: heroIds.has(s.candidate.id)
        ? ('hero' as const)
        : altIds.has(s.candidate.id)
        ? ('alternative' as const)
        : ('dropped' as const),
    }));

  const imageBackedCount = scored.filter((s) => s.hasImage).length;

  return {
    query,
    intent: {
      mode: interpretedIntent.mode,
      interpretedConcern: interpretedIntent.interpretedConcern,
      interpretedProductType: interpretedIntent.interpretedProductType,
      avoidanceConstraints: interpretedIntent.avoidanceConstraints,
    },
    retrievalSource,
    rawCandidateCount: deduped.length,
    trustPoolCount: partitioned.alternativePool.length,
    heroPoolCount: partitioned.heroPool.length,
    imageBackedCount,
    topEntries,
    failureReason,
  };
}
