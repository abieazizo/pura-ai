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
}): string {
  return [
    'lp',
    args.query.toLowerCase().trim().replace(/\s+/g, '_'),
    args.scanId ?? '_',
    args.category ?? '_',
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
// URL safety.
//
// The AI is instructed to never fabricate URLs, but defense-in-depth
// applies. Real retailer + brand domains are whitelisted; anything
// else collapses to null so the card renders a search-on-merchant
// CTA instead of pointing at a guessed brand DTC site.
// ---------------------------------------------------------------------------

const TRUSTED_HOSTS = new Set<string>([
  // Major retailers
  'sephora.com',
  'ulta.com',
  'amazon.com',
  'amazon.co.uk',
  'amazon.ca',
  'boots.com',
  'cultbeauty.com',
  'cultbeauty.co.uk',
  'lookfantastic.com',
  'lookfantastic.co.uk',
  'spacenk.com',
  'beautypie.com',
  'dermstore.com',
  'target.com',
  'walmart.com',
  'mecca.com',
  'mecca.com.au',
  'adore.com.au',
  'feelunique.com',
  // Brand DTC domains (selection of recognisable global brands)
  'cerave.com',
  'cerave.co.uk',
  'laroche-posay.us',
  'laroche-posay.co.uk',
  'theordinary.com',
  'paulaschoice.com',
  'paulaschoice.co.uk',
  'beautyofjoseon.com',
  'cosrx.com',
  'kiehls.com',
  'supergoop.com',
  'naturium.com',
  'glowrecipe.com',
  'youthtothepeople.com',
  'goodmolecules.com',
  'biotherm.com',
  'biotherm-usa.com',
  'elfcosmetics.com',
  'innisfree.com',
  'laneige.com',
  'drunkelephant.com',
  'tatcha.com',
  'fentyskin.com',
  'rare-beauty.com',
  'ren-skincare.com',
  'kinship.com',
  'iliabeauty.com',
  'farmacybeauty.com',
  'firstaidbeauty.com',
  'kosas.com',
  'merit-beauty.com',
  'summerfridays.com',
  'biossance.com',
  'krave-beauty.com',
  'anuaglobal.com',
  'anua-global.com',
  'bonajour.com',
  'illiyoon.com',
  'itsskin.com',
]);

/** Strip leading "www." and a trailing slash; return host only. */
function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    let host = u.host.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return null;
  }
}

function isTrustedUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (TRUSTED_HOSTS.has(host)) return true;
  // Allow subdomains of trusted hosts (e.g. shop.sephora.com).
  for (const t of TRUSTED_HOSTS) {
    if (host.endsWith('.' + t)) return true;
  }
  return false;
}

function sanitizeCandidate(c: LiveProductCandidate): LiveProductCandidate {
  let productUrl = c.productUrl;
  let merchantName = c.merchantName;
  let imageUrl = c.imageUrl;
  let imageSource = c.imageSource;

  if (productUrl && !isTrustedUrl(productUrl)) {
    aiLog.warn('liveProducts', 'dropped untrusted productUrl', {
      url: productUrl.slice(0, 120),
    });
    productUrl = null;
    if (imageSource === 'merchant' || imageSource === 'brand') {
      merchantName = merchantName ?? null;
    }
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    imageUrl = null;
    imageSource = 'none';
  }
  return {
    ...c,
    productUrl,
    merchantName,
    imageUrl,
    imageSource,
  };
}

/**
 * Build a search-on-merchant URL when the AI didn't supply a trusted
 * productUrl. Used by the card-render layer at click time.
 */
export function buildSearchUrl(candidate: LiveProductCandidate): string {
  const q = encodeURIComponent(`${candidate.brand} ${candidate.name}`);
  // Default to Sephora's general search; works for major US brands.
  return `https://www.sephora.com/search?keyword=${q}`;
}

// ---------------------------------------------------------------------------
// Public retrieval API.
// ---------------------------------------------------------------------------

export interface LookupOpts {
  /** Optional explicit scan id used for cache scoping. */
  scanId?: string | null;
  /** Override the default candidate count (default 8). */
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
  const key = cacheKey({ query: trimmed, scanId: opts.scanId ?? null });
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
  try {
    const result = await aiGateway.lookupLiveProducts({
      query: trimmed,
      count: opts.count ?? 8,
    });
    const sanitized = result.candidates
      .map(sanitizeCandidate)
      .sort((a, b) => b.matchScore - a.matchScore);
    writeCache(key, sanitized, result.confidence);
    cacheCandidates(sanitized);
    aiLog.info('liveProducts', 'AI live retrieval ok', {
      query: trimmed,
      n: sanitized.length,
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
    aiLog.warn('liveProducts', 'scan has no aiAnalysis');
    return [];
  }
  const primary = ai.primary_concern ?? 'overall_skin';
  const region = ai.findings[0]?.regions[0] ?? 'across_face';
  const severity = ai.findings[0]?.severity ?? 'mild';
  const sensitivities = ai.plan_inputs.contraindication_tags;
  const query = [
    `Recommend products for ${primary.replace('_', ' ')}`,
    region !== 'across_face' ? `on the ${region.replace('_', ' ')}` : null,
    severity !== 'mild' && severity !== 'low'
      ? `(severity: ${severity})`
      : null,
    sensitivities.length > 0
      ? `avoid: ${sensitivities.slice(0, 3).join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  const key = cacheKey({
    query,
    scanId: opts.scanId ?? scan.id,
    category: primary,
  });
  if (!opts.fresh) {
    const hit = readCache(key);
    if (hit) {
      aiLog.info('liveProducts', 'scan cache hit', {
        scanId: scan.id,
        n: hit.length,
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
      count: opts.count ?? 8,
      scanContext: {
        primary_concern: ai.primary_concern,
        secondary_concerns: ai.secondary_concerns,
        severity_band: ai.skin_score.band,
        regions: ai.findings.flatMap((f) => f.regions).slice(0, 6),
        skin_type: 'unknown',
        sensitivities,
      },
    });
    const sanitized = result.candidates
      .map(sanitizeCandidate)
      .sort((a, b) => b.matchScore - a.matchScore);
    writeCache(key, sanitized, result.confidence);
    cacheCandidates(sanitized);
    aiLog.info('liveProducts', 'scan live retrieval ok', {
      scanId: scan.id,
      n: sanitized.length,
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
