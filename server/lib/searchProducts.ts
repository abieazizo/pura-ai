/**
 * Pura AI — `/search-products` server handler (v19.25).
 *
 * The backend-owned live product source. Hits Open Beauty Facts
 * server-side (same provider barcodeLookup.ts already uses), maps
 * to the canonical `BackendProductCandidate` shape, and returns
 * the canonical `SearchProductsResponse`.
 *
 * Does NOT use `OpenAIClient`. Does NOT invoke any AI gateway
 * method. Pure HTTP-out → JSON-in → canonical response.
 *
 * Failure handling:
 *   • 5 s AbortController timeout per OBF call
 *   • network failure / non-2xx / parse failure → response.source =
 *     'error', candidates = []
 *   • zero usable records → response.source = 'empty', candidates = []
 *   • ≥1 usable record → response.source = 'live_backend'
 *
 * The client engine decides whether to fall back to the bundled
 * seed catalog when source ∈ {'error', 'empty'}.
 */

import type {
  BackendProductCandidate,
  SearchProductsRequest,
  SearchProductsResponse,
} from '../../src/api/searchProductsContract';

// ---------------------------------------------------------------------------
// OBF response shape (subset — only what we read).
// ---------------------------------------------------------------------------

interface OBFProduct {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  labels?: string;
  labels_tags?: string[];
}

interface OBFSearchResponse {
  count?: number;
  page?: number;
  page_size?: number;
  products?: OBFProduct[];
}

// ---------------------------------------------------------------------------
// Constants.
// ---------------------------------------------------------------------------

const OBF_SEARCH_URL = 'https://world.openbeautyfacts.org/cgi/search.pl';
const OBF_TIMEOUT_MS = 5_000;
const DEFAULT_PAGE_SIZE = 12;
const USER_AGENT = 'PuraAI-Server/19.25 (https://pura.app)';

const COSMETIC_CATEGORY_PATTERNS: RegExp[] = [
  /cosmetic/i,
  /skincare/i,
  /skin care/i,
  /beauty/i,
  /serum/i,
  /cleanser/i,
  /moisturi[sz]er/i,
  /sunscreen/i,
  /toner/i,
  /face care/i,
];

const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/cleanser|wash|foam|micellar/i, 'cleanser'],
  [/serum|essence|ampoule|booster/i, 'serum'],
  [/moisturi[sz]er|cream|lotion|emulsion/i, 'moisturizer'],
  [/sun ?(screen|cream)|spf|sunblock/i, 'spf'],
  [/toner|tonique/i, 'toner'],
  [/mask|masque/i, 'mask'],
  [/spot|treatment|acid/i, 'spot_treatment'],
];

const CONCERN_KEYWORDS: Record<string, readonly string[]> = {
  breakouts: ['salicylic', 'bha', 'azelaic', 'benzoyl', 'breakout', 'acne'],
  redness: ['redness', 'rosacea', 'centella', 'cica', 'soothing', 'calm'],
  hydration: ['hyaluronic', 'glycerin', 'ceramide', 'moisturi', 'hydrat'],
  texture: ['glycolic', 'lactic', 'aha', 'pha', 'retinol', 'resurfacing'],
  dark_marks: ['vitamin c', 'ascorbic', 'tranexamic', 'brighten'],
  oiliness: ['niacinamide', 'mattifying', 'oil control'],
  sensitivity: ['sensitive', 'gentle', 'fragrance-free', 'panthenol'],
  pores: ['pore', 'minimizing', 'tightening'],
};

const SAFETY_TAG_PATTERNS: Array<[RegExp, string]> = [
  [/fragrance[- ]?free|sans parfum/i, 'fragrance_free'],
  [/alcohol[- ]?free|sans alcool/i, 'alcohol_free'],
  [/sulfate[- ]?free/i, 'sulfate_free'],
  [/silicone[- ]?free/i, 'silicone_free'],
  [/paraben[- ]?free/i, 'paraben_free'],
  [/cruelty[- ]?free/i, 'cruelty_free'],
  [/vegan/i, 'vegan'],
];

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function inferCategory(categories: string | undefined): string | null {
  if (!categories) return null;
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(categories)) return cat;
  }
  return null;
}

/**
 * v19.28 — looser cosmetic check. Pre-v19.28 required non-empty
 * `categories` from OBF, dropping many real skincare entries
 * whose categories field is blank. Now we also accept items
 * whose product_name / generic_name matches a skincare pattern,
 * provided they have a brand. False-positive risk: low — OBF's
 * search API already biases toward beauty when the search term
 * is a beauty term.
 */
const SKINCARE_NAME_PATTERNS: RegExp[] = [
  /serum/i,
  /cleanser/i,
  /toner/i,
  /moisturi[sz]er/i,
  /cream/i,
  /lotion/i,
  /sunscreen|spf/i,
  /mask|masque/i,
  /essence/i,
  /ampoule/i,
  /eye cream|eye serum/i,
  /exfoli/i,
  /retinol|retinal|tretinoin/i,
  /niacinamide/i,
  /hyaluronic/i,
  /vitamin c|ascorbic/i,
  /salicylic|glycolic|lactic|mandelic/i,
];

function looksLikeCosmetic(p: OBFProduct): boolean {
  const cats = p.categories ?? '';
  if (cats.length > 0) {
    if (COSMETIC_CATEGORY_PATTERNS.some((re) => re.test(cats))) {
      return true;
    }
  }
  // Loosened path: name signals skincare AND brand is present.
  const name = (p.product_name_en || p.product_name || p.generic_name || '')
    .trim();
  if (name.length === 0) return false;
  if (!p.brands || p.brands.trim().length === 0) return false;
  return SKINCARE_NAME_PATTERNS.some((re) => re.test(name));
}

function pickPrimaryBrand(brands: string | undefined): string {
  if (!brands) return '';
  const first = brands.split(',')[0]?.trim() ?? '';
  if (first.length === 0) return '';
  return first.replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveConcernTags(p: OBFProduct): string[] {
  const corpus = [
    p.product_name ?? '',
    p.product_name_en ?? '',
    p.generic_name ?? '',
    p.categories ?? '',
    p.ingredients_text ?? '',
    p.ingredients_text_en ?? '',
  ]
    .join(' ')
    .toLowerCase();
  const tags: string[] = [];
  for (const concern of Object.keys(CONCERN_KEYWORDS)) {
    if (CONCERN_KEYWORDS[concern].some((kw) => corpus.includes(kw))) {
      tags.push(concern);
    }
  }
  return tags;
}

function deriveSafetyTags(p: OBFProduct): string[] {
  const corpus = [
    p.labels ?? '',
    p.ingredients_text ?? '',
    p.ingredients_text_en ?? '',
    ...(p.labels_tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
  const tags: string[] = [];
  for (const [re, tag] of SAFETY_TAG_PATTERNS) {
    if (re.test(corpus)) tags.push(tag);
  }
  return tags;
}

// Brand DTC table — duplicated from src/lib/commerceEnrichment.ts so
// the server handler doesn't import a client-side module. Keep the
// list small; the merchant link is best-effort, the client renders
// graceful UI when productUrl is null.
const BRAND_DTC: Record<string, { host: string; merchant: string }> = {
  'the ordinary': { host: 'theordinary.com', merchant: 'The Ordinary' },
  'the inkey list': { host: 'theinkeylist.com', merchant: 'The Inkey List' },
  cerave: { host: 'cerave.com', merchant: 'CeraVe' },
  'la roche-posay': { host: 'laroche-posay.us', merchant: 'La Roche-Posay' },
  "paula's choice": { host: 'paulaschoice.com', merchant: "Paula's Choice" },
  cosrx: { host: 'cosrx.com', merchant: 'COSRX' },
  'beauty of joseon': {
    host: 'beautyofjoseon.com',
    merchant: 'Beauty of Joseon',
  },
  "kiehl's": { host: 'kiehls.com', merchant: "Kiehl's" },
  supergoop: { host: 'supergoop.com', merchant: 'Supergoop!' },
  glossier: { host: 'glossier.com', merchant: 'Glossier' },
  fenty: { host: 'fentyskin.com', merchant: 'Fenty Skin' },
  innisfree: { host: 'innisfree.com', merchant: 'innisfree' },
  laneige: { host: 'laneige.com', merchant: 'LANEIGE' },
};

function deriveMerchant(brand: string, name: string): {
  productUrl: string;
  merchantName: string;
} {
  const dtc = BRAND_DTC[brand.trim().toLowerCase()];
  if (dtc) {
    return {
      productUrl: `https://www.${dtc.host}/`,
      merchantName: `${dtc.merchant} (DTC)`,
    };
  }
  // Sephora-search fallback.
  const q = encodeURIComponent(`${brand} ${name}`);
  return {
    productUrl: `https://www.sephora.com/search?keyword=${q}`,
    merchantName: 'Sephora (search)',
  };
}

/**
 * v19.29 — deterministic best-image selection. Pre-v19.29 just
 * fell through `image_url || image_small_url || image_thumb_url`.
 * Several OBF entries have empty `image_url` but a populated
 * `image_small_url`, and even more have only the thumb — we want
 * the BIGGEST usable image for hero rendering, the SMALLEST for
 * alt cards, but the contract today is one URL. Pick the largest
 * usable URL (hero-quality) and validate the shape; reject empty
 * strings, relative paths, and non-http schemes.
 */
function pickBestImageUrl(p: OBFProduct): string | null {
  const candidates = [
    p.image_url,
    p.image_small_url,
    p.image_thumb_url,
  ];
  for (const u of candidates) {
    if (typeof u !== 'string') continue;
    const trimmed = u.trim();
    if (trimmed.length === 0) continue;
    if (!/^https?:\/\//i.test(trimmed)) continue;
    // Filter obvious junk URL patterns from OBF (rare but seen).
    if (/\/invalid|placeholder|missing/i.test(trimmed)) continue;
    return trimmed;
  }
  return null;
}

/**
 * v19.31 — extract ≤5 ingredient highlights from OBF
 * `ingredients_text`. Splits on comma/semicolon, trims, drops
 * empty / overly long entries. Real OBF data has commas in
 * almost every ingredient list, so this gives the trust scorer
 * + AI rerank a useful highlight list.
 */
function extractIngredientHighlights(p: OBFProduct): string[] {
  const text =
    (p.ingredients_text_en || p.ingredients_text || '').trim();
  if (text.length === 0) return [];
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 80)
    .slice(0, 5);
}

/**
 * v19.31 — synthesize a short human-readable description from
 * the candidate's name, category, and top ingredient highlights.
 * Used when upstream has no description field. Bounded to ~140
 * chars for UI safety.
 */
function buildShortDescription(
  name: string,
  category: string | null,
  highlights: string[]
): string {
  const parts: string[] = [];
  if (category) parts.push(category);
  if (highlights.length > 0) {
    parts.push(`with ${highlights.slice(0, 2).join(', ')}`);
  }
  if (parts.length === 0) return name.slice(0, 140);
  return parts.join(' ').slice(0, 140);
}

function toCandidate(p: OBFProduct): BackendProductCandidate | null {
  const code = p.code ?? p._id ?? '';
  const name = (p.product_name_en || p.product_name || p.generic_name || '')
    .trim();
  const brand = pickPrimaryBrand(p.brands);
  if (code.length === 0) return null;
  if (name.length === 0 || brand.length === 0) return null;

  const category = inferCategory(p.categories);
  const merchant = deriveMerchant(brand, name);
  const imageUrl = pickBestImageUrl(p);
  // v19.31 — populate highlights + description so client trust
  // scoring + AI rerank get the metadata they need.
  const ingredientsHighlights = extractIngredientHighlights(p);
  const shortDescription = buildShortDescription(
    name,
    category,
    ingredientsHighlights
  );

  return {
    id: `be-${code}`,
    brand,
    name,
    merchantName: merchant.merchantName,
    productUrl: merchant.productUrl,
    imageUrl,
    price: null, // OBF doesn't carry price data
    category,
    concernTags: deriveConcernTags(p),
    skinTypeTags: [], // OBF doesn't carry skin-type metadata
    safetyTags: deriveSafetyTags(p),
    ingredientsHighlights,
    shortDescription,
    source: 'live_backend',
  };
}

// ---------------------------------------------------------------------------
// OBF call with bounded timeout. Throws on non-2xx / network failure.
// ---------------------------------------------------------------------------

async function fetchOBFSearch(query: string, pageSize: number): Promise<OBFProduct[]> {
  const url =
    `${OBF_SEARCH_URL}` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&page_size=${pageSize}` +
    `&json=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`OBF HTTP ${res.status}`);
    }
    const body = (await res.json()) as OBFSearchResponse;
    return Array.isArray(body.products) ? body.products : [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public handler — body coercion + canonical response.
// ---------------------------------------------------------------------------

function coerceRequest(body: Record<string, unknown>): SearchProductsRequest {
  const query =
    typeof body['query'] === 'string' ? (body['query'] as string).trim() : '';
  const concernRaw = body['concern'];
  const concern =
    typeof concernRaw === 'string' && concernRaw.length > 0 ? concernRaw : null;
  const skinTypeRaw = body['skinType'];
  const skinType =
    skinTypeRaw === 'dry' ||
    skinTypeRaw === 'oily' ||
    skinTypeRaw === 'combination' ||
    skinTypeRaw === 'normal' ||
    skinTypeRaw === 'sensitive'
      ? skinTypeRaw
      : 'unknown';
  const sensitivities = Array.isArray(body['sensitivities'])
    ? (body['sensitivities'] as unknown[]).filter(
        (s): s is string => typeof s === 'string'
      )
    : [];
  const limitRaw = body['limit'];
  const limit =
    typeof limitRaw === 'number' && Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(24, Math.round(limitRaw)))
      : DEFAULT_PAGE_SIZE;
  const triggerRaw = body['trigger'];
  const trigger =
    triggerRaw === 'initial_load' ||
    triggerRaw === 'retry' ||
    triggerRaw === 'chip_press' ||
    triggerRaw === 'search' ||
    triggerRaw === 'assistant' ||
    triggerRaw === 'background'
      ? triggerRaw
      : 'background';
  // v19.26 — personalized-search context fields.
  const goals = Array.isArray(body['goals'])
    ? (body['goals'] as unknown[]).filter(
        (g): g is string => typeof g === 'string'
      )
    : [];
  const latestScanSummaryRaw = body['latestScanSummary'];
  const latestScanSummary =
    typeof latestScanSummaryRaw === 'string' &&
    latestScanSummaryRaw.length > 0
      ? latestScanSummaryRaw.slice(0, 320)
      : null;
  const topConcerns = Array.isArray(body['topConcerns'])
    ? (body['topConcerns'] as unknown[]).filter(
        (c): c is string => typeof c === 'string'
      )
    : [];
  // v19.27 — interpreted intent + chip intent.
  const chipIntentRaw = body['chipIntent'];
  const chipIntent =
    typeof chipIntentRaw === 'string' && chipIntentRaw.length > 0
      ? chipIntentRaw
      : null;
  const intentRaw = body['interpretedIntent'];
  let interpretedIntent: SearchProductsRequest['interpretedIntent'];
  if (intentRaw && typeof intentRaw === 'object' && !Array.isArray(intentRaw)) {
    const r = intentRaw as Record<string, unknown>;
    const modeRaw = r['mode'];
    const mode =
      modeRaw === 'concern_search' ||
      modeRaw === 'product_type_search' ||
      modeRaw === 'best_for_my_skin' ||
      modeRaw === 'vague_query'
        ? modeRaw
        : 'vague_query';
    const ic = r['interpretedConcern'];
    const ipt = r['interpretedProductType'];
    const avs = r['avoidanceConstraints'];
    interpretedIntent = {
      mode,
      interpretedConcern: typeof ic === 'string' ? ic : null,
      interpretedProductType: typeof ipt === 'string' ? ipt : null,
      avoidanceConstraints: Array.isArray(avs)
        ? (avs as unknown[]).filter(
            (x): x is string => typeof x === 'string'
          )
        : [],
    };
  }
  // v19.28 — multi-probe retrieval. Each probe carries its own
  // query string + weight + reason. Empty/missing → server falls
  // back to single-query OBF call (legacy v19.25 behavior).
  let probes: SearchProductsRequest['probes'];
  const probesRaw = body['probes'];
  if (Array.isArray(probesRaw)) {
    probes = (probesRaw as unknown[])
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
      .map((p) => ({
        query: typeof p.query === 'string' ? p.query.trim() : '',
        weight:
          typeof p.weight === 'number' && Number.isFinite(p.weight)
            ? p.weight
            : 1,
        reason: typeof p.reason === 'string' ? p.reason : '',
      }))
      .filter((p) => p.query.length > 0)
      .slice(0, 5);
    if (probes.length === 0) probes = undefined;
  }
  return {
    query,
    concern,
    skinType,
    sensitivities,
    limit,
    trigger,
    goals,
    latestScanSummary,
    topConcerns,
    chipIntent,
    interpretedIntent,
    probes,
  };
}

/**
 * Public handler — registered as `searchProducts` in the
 * `HANDLERS` map. The first arg (OpenAI client) is unused; the
 * handler uses native `fetch` to call OBF and never touches AI.
 */
export async function searchProductsHandler(
  _client: unknown,
  body: Record<string, unknown>
): Promise<SearchProductsResponse> {
  const req = coerceRequest(body);

  if (req.query.length === 0) {
    return {
      query: '',
      source: 'empty',
      candidates: [],
      failureReason: null,
    };
  }

  // v19.28 — fan out across probes when the client sent them;
  // otherwise fall back to the legacy single-query path.
  type ProbeExec = { query: string; weight: number; reason: string };
  const probeList: ProbeExec[] = req.probes && req.probes.length > 0
    ? req.probes
    : [{ query: req.query, weight: 1, reason: 'verbatim' }];

  // Per-probe page size: when multiple probes fan out, keep each
  // probe's page small so the total OBF load stays bounded. The
  // overall response is still capped by req.limit after merge.
  const perProbeSize = Math.max(
    4,
    Math.floor((req.limit ?? DEFAULT_PAGE_SIZE) / Math.max(1, probeList.length))
  );

  // Run all probes in parallel. Use Promise.allSettled so one
  // failed probe (rare OBF 5xx) doesn't fail the whole search.
  const probeResults = await Promise.allSettled(
    probeList.map(async (probe) => ({
      probe,
      raw: await fetchOBFSearch(probe.query, perProbeSize),
    }))
  );

  // Aggregate failures + raw products. We only short-circuit when
  // ALL probes failed; partial success is fine.
  const allFailures: string[] = [];
  const probeMatches = new Map<string, Set<string>>(); // candidate.id → probe queries
  const candidatesByCode = new Map<string, BackendProductCandidate>();

  for (const r of probeResults) {
    if (r.status === 'rejected') {
      allFailures.push(
        r.reason instanceof Error ? r.reason.message : String(r.reason)
      );
      continue;
    }
    const { probe, raw } = r.value;
    for (const p of raw) {
      if (!looksLikeCosmetic(p)) continue;
      const c = toCandidate(p);
      if (!c) continue;
      // Dedup by id; first occurrence wins, but still append the
      // probe to matchedProbes so we know all routes that found it.
      const existing = candidatesByCode.get(c.id);
      const target = existing ?? c;
      if (!existing) {
        candidatesByCode.set(c.id, target);
      }
      const set = probeMatches.get(c.id) ?? new Set<string>();
      set.add(probe.query);
      probeMatches.set(c.id, set);
    }
  }

  // If every probe failed, surface the first error. Single-probe
  // case preserves the legacy "source: error" behavior.
  if (
    allFailures.length === probeList.length &&
    candidatesByCode.size === 0
  ) {
    return {
      query: req.query,
      source: 'error',
      candidates: [],
      failureReason: allFailures[0] ?? 'all probes failed',
    };
  }

  const candidates: BackendProductCandidate[] = Array.from(
    candidatesByCode.values()
  ).map((c) => ({
    ...c,
    matchedProbes: Array.from(probeMatches.get(c.id) ?? []),
  }));

  // v19.26 — personalized soft sort. Score every candidate against
  // the full user context the client passed. Higher score → earlier
  // in the array. We don't hard-drop anything; the AI rerank step
  // (called downstream by the client) will pick the final hero.
  //
  // Signals (each adds to score):
  //   • concern in concernTags                → +5
  //   • topConcerns[i] in concernTags          → +(4 - i)  (decay)
  //   • goals overlap with concernTags / safety→ +1 per overlap
  //   • candidate's safetyTags ∩ user-flagged-sensitivities → +2 each
  //   • avoid_ingredient in user sensitivities matching candidate
  //     ingredients — penalised by the local scorer client-side; we
  //     don't have ingredient data here
  const personalizedScore = (c: BackendProductCandidate): number => {
    let s = 0;
    if (req.concern && c.concernTags.includes(req.concern)) s += 5;
    // v19.27 — interpretedIntent.interpretedConcern boosts even
    // higher than the raw `concern` field (it's the ENGINE's
    // best understanding of intent, post-interpretation).
    if (
      req.interpretedIntent?.interpretedConcern &&
      c.concernTags.includes(req.interpretedIntent.interpretedConcern)
    ) {
      s += 6;
    }
    if (req.topConcerns) {
      for (let i = 0; i < req.topConcerns.length; i++) {
        if (c.concernTags.includes(req.topConcerns[i])) {
          s += Math.max(1, 4 - i);
        }
      }
    }
    if (req.goals) {
      for (const g of req.goals) {
        const norm = g.toLowerCase().replace(/[_-]/g, ' ');
        if (
          c.concernTags.some((t) => norm.includes(t.replace(/_/g, ' '))) ||
          c.safetyTags.some((t) => norm.includes(t.replace(/_/g, ' ')))
        ) {
          s += 1;
        }
      }
    }
    if (req.sensitivities) {
      for (const sens of req.sensitivities) {
        if (c.safetyTags.includes(sens)) s += 2;
      }
    }
    // v19.27 — avoidanceConstraints PENALIZE candidates with
    // the avoided tag in safetyTags (e.g. NOT fragrance_free
    // when 'fragrance' is avoided). Soft signal — the AI rerank
    // step gets the final say.
    if (req.interpretedIntent?.avoidanceConstraints) {
      for (const av of req.interpretedIntent.avoidanceConstraints) {
        // Inverted match: candidate is GOOD if it has the
        // safety tag (e.g. 'fragrance_free' for avoid 'fragrance').
        const goodTag = `${av}_free`;
        if (c.safetyTags.includes(goodTag)) {
          s += 3;
        }
      }
    }
    // v19.27 — product-type tie-break. When the user explicitly
    // asked for a product type (e.g. 'serum'), promote candidates
    // whose category matches.
    if (
      req.interpretedIntent?.interpretedProductType &&
      c.category === req.interpretedIntent.interpretedProductType
    ) {
      s += 4;
    }
    return s;
  };
  candidates.sort((a, b) => personalizedScore(b) - personalizedScore(a));

  return {
    query: req.query,
    source: candidates.length > 0 ? 'live_backend' : 'empty',
    candidates,
    failureReason: null,
  };
}
