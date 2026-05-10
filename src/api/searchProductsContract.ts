/**
 * Pura AI — canonical /search-products contract (v19.25).
 *
 * One backend endpoint owns live product retrieval. Every
 * user-visible product surface (ResultScreen, ProductsScreen,
 * AssistantScreen, HomeScreen, PlanScreen, CategoryFeed,
 * ProductDetailScreen, DiagnosticsScreen) calls THIS endpoint
 * via the shared client wrapper. The server-side handler hits
 * Open Beauty Facts (the same source v19.23 added on the client),
 * applies a 5 s bounded timeout + light filtering, and returns
 * `BackendProductCandidate[]` in this exact shape.
 *
 * No AI in the request or response. No proxy-token-required;
 * `/search-products` lives alongside the AI methods on the same
 * proxy + Metro middleware but does not invoke OpenAIClient.
 *
 * Shared contract — imported by both `server/lib/searchProducts.ts`
 * AND `src/api/searchProductsBackend.ts`. Single source of truth
 * for the wire format.
 */

export type SearchProductsTrigger =
  | 'initial_load'
  | 'retry'
  | 'chip_press'
  | 'search'
  | 'assistant'
  | 'background';

export type BackendProductSource = 'live_backend' | 'empty' | 'error';

export interface SearchProductsRequest {
  query: string;
  concern?: string | null;
  skinType?:
    | 'dry'
    | 'oily'
    | 'combination'
    | 'normal'
    | 'sensitive'
    | 'unknown';
  sensitivities?: string[];
  /** Hard cap on returned candidates. Server clamps to [1, 24]. */
  limit?: number;
  /** Telemetry-only label of which user action drove the request. */
  trigger?: SearchProductsTrigger;
  // ----- v19.26 — personalized-search context fields (all optional)
  // The server uses these as soft signals to bias ordering. They are
  // ALSO forwarded to the AI rerank step so it can pick the hero
  // with full user context, not just the candidate set.
  /** User-stated skincare goals ('reduce_breakouts', 'soften_texture'). */
  goals?: string[];
  /**
   * Short, plain-English summary of the user's latest scan
   * ("Mostly calm with mild forehead texture and slight redness on
   *  the cheeks."). Bounded to ~280 chars by the client.
   */
  latestScanSummary?: string | null;
  /**
   * Canonical concern axes the user's latest scan flagged, in
   * descending severity order. e.g. ['texture', 'dark_marks',
   * 'hydration']. Empty when no scan exists yet.
   */
  topConcerns?: string[];
}

export interface BackendProductCandidate {
  /** Stable id derived from the upstream record (OBF code + 'be-' prefix). */
  id: string;
  brand: string;
  name: string;
  /** Recognisable retailer / brand DTC, or null when undetermined. */
  merchantName: string | null;
  /** Real product URL (BRAND_DTC, Sephora-search fallback, or null). */
  productUrl: string | null;
  /** Real product image URL when the upstream provided one. */
  imageUrl: string | null;
  /** Display string ("$24" / "£18.50") — null when unknown. */
  price: string | null;
  /** Cosmetic category inferred from upstream metadata. */
  category: string | null;
  /** Concern axes the product plausibly addresses. */
  concernTags: string[];
  /** Skin-type signals from upstream metadata. */
  skinTypeTags: string[];
  /** Safety tags ('fragrance_free', 'alcohol_free', etc.). */
  safetyTags: string[];
  /** Always 'live_backend' on a non-empty response. */
  source: 'live_backend';
}

export interface SearchProductsResponse {
  /** Echoed back so the client can correlate request → response. */
  query: string;
  /**
   * The path the server used to produce this result:
   *   • 'live_backend' — upstream search returned ≥1 usable record
   *   • 'empty'        — upstream returned zero usable records
   *   • 'error'        — upstream failed (timeout, network, parse, etc.)
   * The client engine reads this to decide whether to fall back
   * to the bundled seed catalog.
   */
  source: BackendProductSource;
  candidates: BackendProductCandidate[];
  /** Non-null on `'error'`; otherwise null. */
  failureReason: string | null;
}

/**
 * Method name as registered on the proxy + Metro middleware. Used
 * by the client wrapper to construct the URL path.
 */
export const SEARCH_PRODUCTS_METHOD = 'searchProducts' as const;
