/**
 * Pura AI — ProductUiTrace store (v19.32).
 *
 * The single source of truth for "what did the real Products
 * screen render on the last fetch?". Written by the actual UI
 * (ProductsScreen + LiveProductCard) AFTER state updates fire.
 * Read by the diagnostics screen so we can prove
 * diagnostics-vs-UI equality from the user's device, not from
 * internal-only state.
 *
 * The store deliberately holds the LAST trace per "scope" key
 * (`scope:trigger`) so diagnostics can show the most recent
 * search vs retry vs chip_press independently.
 *
 * NO mocked or synthesized fields. Every value is set by the
 * actual UI path:
 *   • `query` / `trigger` set by the search-bar effect
 *   • `interpretedIntentLabel` / `probeQueries` set when the
 *     engine call resolves (the engine attaches them to
 *     RecommendationContext.lastAttempt + the probe plan that
 *     was actually used)
 *   • `rawCandidateCount` / `filteredCandidateCount` /
 *     `trustPoolCount` set from the resolved engine context
 *   • `heroId` / `heroName` / `heroImageInPayload` /
 *     `alternativeCount` / `alternativesWithImagesInPayload`
 *     set when ProductsScreen receives the result
 *   • `heroImageRendered` / `alternativesWithImagesRendered`
 *     set by LiveProductCard's `onLoad` / `onError` callbacks
 *     AFTER expo-image actually decodes the bitmap
 *   • `visibleState` set by ProductsScreen based on what it
 *     actually rendered (live_results / fallback_results /
 *     empty / unavailable / error)
 */

export type ProductUiVisibleState =
  | 'live_results'
  | 'fallback_results'
  | 'empty'
  | 'unavailable'
  | 'error';

export type ProductUiTrigger = 'search' | 'retry' | 'chip_press';

export interface ProductUiTrace {
  /** The exact query the UI dispatched. */
  query: string;
  /** Which user action drove this attempt. */
  trigger: ProductUiTrigger;
  /** From RecommendationContext.lastAttempt; null when missing. */
  interpretedIntentLabel: string | null;
  /** Probe queries actually sent to the backend. */
  probeQueries: string[];
  /** Raw OBF result count from the server response. */
  rawCandidateCount: number;
  /** Count after filter+dedup. */
  filteredCandidateCount: number;
  /** Count after trust threshold (alt+hero pool). */
  trustPoolCount: number;

  /** Hero candidate id actually rendered (`null` when no hero). */
  heroId: string | null;
  heroName: string | null;
  /** True when the hero candidate had `imageUrl` set in payload. */
  heroImageInPayload: boolean;
  /**
   * True when LiveProductCard's `onLoad` fired for the hero
   * (the bitmap actually decoded into the view). Stays false
   * if onError fires or no image was attempted.
   */
  heroImageRendered: boolean;

  /** Alternatives count actually rendered. */
  alternativeCount: number;
  /** Of those, how many had `imageUrl` set in payload. */
  alternativesWithImagesInPayload: number;
  /** Of those, how many actually decoded their bitmap. */
  alternativesWithImagesRendered: number;

  /** Visible UI state branch the screen is rendering. */
  visibleState: ProductUiVisibleState;

  /** Diagnostics-side counts (set when diagnostics runs). */
  diagnosticsCandidateCount: number | null;
  diagnosticsHeroId: string | null;
  uiMatchesDiagnostics: boolean | null;

  /**
   * v19.36 — minimum personalization fields. Surfaced in the
   * truth panel so the user can see WHY this hero was chosen and
   * which random candidates were excluded from the hero pool.
   */
  /** Resolved query family (e.g. `family:moisturizer`). */
  queryFamily: string | null;
  /** One short tag for the user's skin axis (`oily`, `sensitive`, `dry`, …). */
  skinFitReason: string | null;
  /** Composite skin-fit score for the hero (0..100, integer-rounded). */
  heroSkinFitScore: number | null;
  /** Hero candidates dropped by the skin-fit filter, with reasons. */
  excludedFromHero: Array<{ id: string; name: string; reason: string }>;

  /** ISO timestamp when the trace was last updated. */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// In-memory store. Lightweight pub/sub so diagnostics can refresh
// without a full state subscription. Key is `${scope}:${trigger}`,
// scope='products' for the Products tab today; future surfaces can
// reuse the store with their own scope.
// ---------------------------------------------------------------------------

type Listener = () => void;

const traces = new Map<string, ProductUiTrace>();
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore listener exceptions */
    }
  }
}

function keyOf(scope: string, trigger: ProductUiTrigger): string {
  return `${scope}:${trigger}`;
}

/**
 * Replace the trace for `(scope, trigger)`. The UI calls this
 * once per resolved fetch; image-render updates use
 * `updateImageRender` below.
 */
export function setTrace(scope: string, trace: ProductUiTrace): void {
  traces.set(keyOf(scope, trace.trigger), { ...trace });
  notify();
}

/**
 * Patch the image-render fields on an existing trace. Called by
 * LiveProductCard's onLoad/onError per card. No-op if the trace
 * has been replaced by a newer fetch (id mismatch via heroId).
 */
export function updateImageRender(args: {
  scope: string;
  trigger: ProductUiTrigger;
  candidateId: string;
  isHero: boolean;
  loaded: boolean;
}): void {
  const k = keyOf(args.scope, args.trigger);
  const t = traces.get(k);
  if (!t) return;
  // Hero update.
  if (args.isHero && t.heroId === args.candidateId) {
    if (t.heroImageRendered !== args.loaded) {
      traces.set(k, {
        ...t,
        heroImageRendered: args.loaded,
        timestamp: new Date().toISOString(),
      });
      notify();
    }
    return;
  }
  // Alternative update — incremental count.
  if (!args.isHero && args.loaded) {
    // Bound to the alternatives-with-payload-images count so we
    // don't double-count if onLoad fires twice.
    const next = Math.min(
      t.alternativesWithImagesRendered + 1,
      t.alternativesWithImagesInPayload
    );
    if (next !== t.alternativesWithImagesRendered) {
      traces.set(k, {
        ...t,
        alternativesWithImagesRendered: next,
        timestamp: new Date().toISOString(),
      });
      notify();
    }
  }
}

/**
 * Patch the diagnostics-side fields. Called by AIDiagnosticsScreen
 * after it runs its own engine call so the equality flag is
 * populated for human inspection.
 *
 * v19.34 — `query` is required and must match the existing trace's
 * query for the patch to apply. Without this, a diagnostics loop
 * that fans out across multiple queries (all using
 * `trigger: 'search'`) would overwrite each other's counterparts in
 * the same `(scope, trigger)` slot, leaving the final
 * `uiMatchesDiagnostics` flag meaningless. With the query gate, the
 * loop only patches the trace whose query the user actually
 * searched on the real Products screen.
 */
export function setDiagnosticsCounterpart(args: {
  scope: string;
  trigger: ProductUiTrigger;
  query: string;
  candidateCount: number;
  heroId: string | null;
}): void {
  const k = keyOf(args.scope, args.trigger);
  const t = traces.get(k);
  if (!t) return;
  if (t.query !== args.query) return;
  const matches =
    args.candidateCount === t.filteredCandidateCount && args.heroId === t.heroId;
  traces.set(k, {
    ...t,
    diagnosticsCandidateCount: args.candidateCount,
    diagnosticsHeroId: args.heroId,
    uiMatchesDiagnostics: matches,
    timestamp: new Date().toISOString(),
  });
  notify();
}

export function getTrace(
  scope: string,
  trigger: ProductUiTrigger
): ProductUiTrace | null {
  return traces.get(keyOf(scope, trigger)) ?? null;
}

export function getAllTraces(): ProductUiTrace[] {
  return Array.from(traces.values()).sort(
    (a, b) =>
      Date.parse(b.timestamp || '') - Date.parse(a.timestamp || '')
  );
}

export function subscribeTraces(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function clearTraces(): void {
  traces.clear();
  notify();
}
