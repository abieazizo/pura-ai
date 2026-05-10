import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SlidersHorizontal } from 'phosphor-react-native';
import { AISearchBar } from '@/components/products/AISearchBar';
// v19.35 — `SearchResults` (offline-catalog grid) removed from
// ProductsScreen. The screen no longer maintains its own private
// fallback result universe; it renders ONLY from the canonical
// shared RecommendationContext returned by the engine.
import { FiltersStubSheet } from '@/components/products/FiltersStubSheet';
import { CategoryRail, type GoalKey } from '@/components/products/CategoryRail';
import { CategoryFeed } from '@/components/products/CategoryFeed';
import {
  LiveProductCard,
  setActiveTraceContext,
} from '@/components/products/LiveProductCard';
import { LiveProductsUnavailable } from '@/components/products/LiveProductsUnavailable';
import { PuraMark } from '@/components/PuraMark';
import { AISourceBadge } from '@/components/dev/AISourceBadge';
// v19.35 — local `searchProducts` selector removed from screen
// imports. The screen no longer has a parallel "offline catalog
// match" rendering path; the canonical engine is the only source.
import { useAppStore } from '@/store/useAppStore';
import { getSearchSuggestions } from '@/api';
// v19.18 — ProductsScreen now consumes the canonical
// deterministic-first recommendation engine instead of calling
// `lookupLiveProducts` directly. The engine handles seed-catalog
// retrieval, normalization, dedupe, local scoring, and (best-effort)
// AI rerank — all in one shared path with ResultScreen + Diagnostics.
import { getRecommendationContextFromQuery } from '@/api/liveProducts';
// v19.32 — real UI trace store. ProductsScreen writes this AFTER
// every fetch resolve so diagnostics + the user can verify what
// the actual UI rendered.
import {
  setTrace,
  type ProductUiTrigger,
  type ProductUiVisibleState,
} from '@/state/productUiTrace';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { LiveProductCandidate } from '@/ai/ai-contracts';
import type { RecommendationContext as RecommendationContextType } from '@/types/canonical';

/**
 * ProductsScreen — v10.16.
 *
 * Information architecture (top → bottom):
 *
 *   BrandBar
 *   ↓
 *   Title: "Products."
 *   ↓
 *   "POWERED BY AI" kicker
 *   ↓
 *   AISearchBar
 *   ↓
 *   CategoryRail — "Browse by goal" chips (7, in spec order)
 *   ↓
 *   CategoryFeed — 2-column grid. When the default "Best for your skin"
 *                  chip is selected, this is the "Matched to your skin"
 *                  section (CategoryFeed already renders that kicker);
 *                  when another chip is selected, the grid becomes the
 *                  goal-specific feed.
 *
 * v10.16 — the v10.9 `BestForYouLead` editorial hero that sat between
 * search and browse has been removed. A single standout match card
 * between the search bar and the browse chips broke the page rhythm and
 * made personalized picks feel like an interruption. Now Browse by goal
 * leads directly after search, and "Matched to your skin" expands into a
 * full multi-pick grid below it via the default-selected chip — the
 * personalized feed is the answer to "Best for your skin", not a
 * competing hero.
 *
 * Pre-scan users: the "Best for your skin" chip's CategoryFeed renders a
 * premium locked promotion for the scan; every other goal is populated
 * from the static catalog regardless of scan state.
 */
export function ProductsScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [goal, setGoal] = useState<GoalKey>('best-for-you');

  // v10.22 — pull AI-driven placeholder + chips from the store.
  // Hydrated by `getSearchSuggestions('products')` after a scan
  // completes (see useAppStore::addScan); on mount we re-fire so a
  // user landing here outside the scan flow still gets contextual
  // suggestions if AI is configured.
  const aiSuggestions = useAppStore((s) => s.aiSearchSuggestions);

  // 150ms debounce on search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // v11.10 — fire AI search suggestions ONLY when:
  //   (a) the AI gateway is actually configured (no point firing into
  //       a dead transport), AND
  //   (b) we don't already have suggestions cached from the post-scan
  //       hydration in useAppStore::addScan.
  //
  // Previously this fired unconditionally on every mount; when the
  // proxy was unreachable it generated a runtime AbortError that
  // surfaced as a red overlay despite being non-critical. Gating the
  // call removes the noise without changing behavior when AI is up.
  useEffect(() => {
    if (aiSuggestions) return;
    let cancelled = false;
    void (async () => {
      try {
        const { aiGateway } = await import('@/ai/aiGateway');
        if (cancelled) return;
        if (!aiGateway.isAvailable()) return;
        await getSearchSuggestions('products');
      } catch {
        /* non-critical: AISearchBar uses its default placeholder */
      }
    })();
    return () => {
      cancelled = true;
    };
    // aiSuggestions intentionally listed: only re-fires if the cache
    // is invalidated, which currently never happens at runtime — but
    // the dependency keeps the linter honest.
  }, [aiSuggestions]);

  // v18.0 — live retrieval becomes the primary search engine. The
  // local fuzzy `searchProducts` selector becomes the emergency
  // fallback only when (a) the gateway is unreachable, or (b) the AI
  // returned zero candidates for this query. Cached at the module
  // layer in liveProducts.ts so a back-press → re-search is instant.
  const [liveResults, setLiveResults] = useState<LiveProductCandidate[]>(
    []
  );
  // v19.38 — keep the latest RecommendationContext on the screen so
  // the in-screen dev panel can render queryFamily / skinFitReason /
  // heroSkinFitScore / resultSource directly under the hero. This is
  // the proof surface the user demanded: if the values appear in the
  // real UI, the corrected path is actually running.
  const [lastRec, setLastRec] = useState<RecommendationContextType | null>(
    null
  );
  const [lastRecAt, setLastRecAt] = useState<string | null>(null);
  const [liveSearching, setLiveSearching] = useState(false);
  // v19.27 — track which Suggested-for-you chip (if any) drove
  // the current query. Used to pass `chipIntent` to the
  // recommendation engine so the AI rerank prompt differentiates
  // chip-tap intent from typed-text intent.
  const [lastChipIntent, setLastChipIntent] = useState<string | null>(null);
  // v18.9 — tiered loading copy. After 5 s show "Still working —
  // thanks for waiting…".
  // v19.10 — REMOVED the redundant screen-level 25 s hard-ceiling.
  // The ceiling competed with the gateway's own 25 s AbortController
  // and produced the user-visible `client timeout after 25000ms`
  // log even when the gateway was still running. The gateway is
  // now the SINGLE source of truth (45 s budget, no retry on
  // timeout). The variant for the unavailable card is chosen
  // post-hoc from the elapsed wall-clock so the user still gets
  // the right copy when the gateway DID time out.
  const [searchSlow, setSearchSlow] = useState(false);
  const [searchTimedOut, setSearchTimedOut] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length === 0) {
      setLiveResults([]);
      setLiveSearching(false);
      setSearchSlow(false);
      setSearchTimedOut(false);
      return;
    }
    let cancelled = false;
    const t0 = Date.now();
    setLiveSearching(true);
    setSearchSlow(false);
    setSearchTimedOut(false);
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSearchSlow(true);
    }, 5000);
    // v19.19 — shared deterministic engine. NO AI in the critical
    // path. The screen renders search results from the seed
    // catalog only; AI augmentation is OFF by default to keep the
    // grid responsive when the proxy is down.
    // v19.27 — chip-tap distinguished from typed search.
    // `lastChipIntent === q` means the current query came
    // from a chip tap (chip text === query text). Otherwise
    // it's typed text.
    const isChipQuery = lastChipIntent === q && q.length > 0;
    const chipIntentForCall = isChipQuery ? lastChipIntent : null;
    getRecommendationContextFromQuery(q, {
      intent: { kind: 'query', text: q },
      allowAiAugmentation: false,
      fresh: searchAttempt > 0,
      // v19.24 — explicit trigger so diagnostics can prove
      // "search vs retry vs chip_press" on this surface.
      // v19.27 — chip taps now produce 'chip_press' explicitly.
      trigger:
        searchAttempt > 0
          ? 'retry'
          : isChipQuery
          ? 'chip_press'
          : 'search',
      chipIntent: chipIntentForCall,
    })
      .then((rec) => {
        if (cancelled) return;
        setLiveResults(rec.candidateProducts);
        // v19.38 — capture the latest canonical context for the
        // in-screen dev panel.
        setLastRec(rec);
        setLastRecAt(new Date().toISOString());
        // v19.32 — write the real ProductUiTrace so diagnostics
        // and the user can verify what the actual UI rendered.
        const hero = rec.heroProduct;
        const alternatives = rec.alternatives ?? [];
        const altsWithImages = alternatives.filter(
          (c) => !!c.imageUrl && /^https?:\/\//i.test(c.imageUrl)
        ).length;
        let visibleState: ProductUiVisibleState = 'live_results';
        if (rec.availabilityState === 'unavailable') {
          visibleState = 'unavailable';
        } else if (rec.availabilityState === 'empty') {
          visibleState = 'empty';
        } else if (rec.retrievalSource === 'fallback') {
          visibleState = 'fallback_results';
        } else if (rec.retrievalSource === 'live') {
          visibleState = 'live_results';
        }
        const trigger: ProductUiTrigger =
          searchAttempt > 0
            ? 'retry'
            : isChipQuery
            ? 'chip_press'
            : 'search';
        setTrace('products', {
          query: q,
          trigger,
          interpretedIntentLabel: rec.interpretedIntentLabel,
          probeQueries: [...rec.probeQueries],
          rawCandidateCount: rec.candidateProducts.length,
          filteredCandidateCount: rec.candidateProducts.length,
          trustPoolCount: rec.candidateProducts.length,
          heroId: hero?.id ?? null,
          heroName: hero ? `${hero.brand} — ${hero.name}` : null,
          heroImageInPayload:
            !!hero?.imageUrl && /^https?:\/\//i.test(hero.imageUrl),
          heroImageRendered: false, // updated by LiveProductCard onLoad
          alternativeCount: alternatives.length,
          alternativesWithImagesInPayload: altsWithImages,
          alternativesWithImagesRendered: 0, // updated by alts onLoad
          visibleState,
          diagnosticsCandidateCount: null,
          diagnosticsHeroId: null,
          uiMatchesDiagnostics: null,
          // v19.36 — minimum personalization fields. These come
          // from the canonical context the engine threaded on, so
          // the trace shows: which family the engine resolved,
          // what skin axis it anchored personalization to, the
          // hero's composite skin-fit score, and any candidates
          // the hero filter dropped (with reasons the user can read).
          queryFamily: rec.queryFamily,
          skinFitReason: rec.skinFitReason,
          heroSkinFitScore: rec.heroSkinFitScore,
          excludedFromHero: [...rec.excludedFromHero],
          timestamp: new Date().toISOString(),
        });
        // v19.32 — set trace context BEFORE the cards render, so
        // expo-image's onLoad/onError callbacks can route to the
        // right trace bucket. Cleared on unmount/cancel below.
        setActiveTraceContext({
          scope: 'products',
          trigger,
          heroId: hero?.id ?? null,
        });
        if (
          rec.candidateProducts.length === 0 &&
          rec.availabilityState === 'unavailable'
        ) {
          setSearchTimedOut(true);
        } else if (
          rec.candidateProducts.length === 0 &&
          Date.now() - t0 > 30_000
        ) {
          setSearchTimedOut(true);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLiveResults([]);
        setSearchTimedOut(Date.now() - t0 > 30_000);
        // v19.32 — record the failure trace too.
        setTrace('products', {
          query: q,
          trigger:
            searchAttempt > 0
              ? 'retry'
              : isChipQuery
              ? 'chip_press'
              : 'search',
          interpretedIntentLabel: null,
          probeQueries: [],
          rawCandidateCount: 0,
          filteredCandidateCount: 0,
          trustPoolCount: 0,
          heroId: null,
          heroName: null,
          heroImageInPayload: false,
          heroImageRendered: false,
          alternativeCount: 0,
          alternativesWithImagesInPayload: 0,
          alternativesWithImagesRendered: 0,
          visibleState: 'error',
          diagnosticsCandidateCount: null,
          diagnosticsHeroId: null,
          uiMatchesDiagnostics: null,
          // v19.36 — personalization fields are unknown on engine
          // failure. Trace surfaces these as null/empty so the
          // truth panel renders consistently across success/error.
          queryFamily: null,
          skinFitReason: null,
          heroSkinFitScore: null,
          excludedFromHero: [],
          timestamp: new Date().toISOString(),
        });
        void e;
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(slowTimer);
        setLiveSearching(false);
        setSearchSlow(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [debouncedQuery, searchAttempt]);

  const retrySearch = () => setSearchAttempt((n) => n + 1);

  // v19.35 — `seedFallbackResults` removed. The screen no longer
  // computes a private offline-catalog grid that competes with the
  // canonical RecommendationContext. When the engine returns zero
  // candidates, the screen shows ONLY the unavailable / empty card
  // (which carries an actionable Retry). Any seed-catalog fallback
  // happens INSIDE the engine, not in the screen render path.

  const isSearching = query.trim().length > 0;
  const placeholder =
    aiSuggestions?.prefill_placeholder &&
    aiSuggestions.prefill_placeholder.trim().length > 0
      ? aiSuggestions.prefill_placeholder
      : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <AISourceBadge feature="products" />

      {/* v11.10 — unified header pattern. Page identity in the brand
          bar (top-left); no redundant giant in-page title. Matches the
          AssistantScreen pattern so all primary tabs read consistently. */}
      <View style={styles.headerRow}>
        <View style={styles.brandLeft}>
          <PuraMark size={22} variant="idle" />
          <Text style={styles.brandWord} maxFontSizeMultiplier={1.1}>
            Products
          </Text>
        </View>
        <Pressable
          onPress={() => {
            hapt.select();
            setFiltersOpen(true);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          style={({ pressed }) => [
            styles.filterBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <SlidersHorizontal size={18} color={palette.ink} weight="duotone" />
        </Pressable>
      </View>

      <AISearchBar
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        placeholder={placeholder}
      />

      {/* v10.26 — when AI search suggestions are present, render a
          horizontal chip row under the search bar. Each chip is a
          tap-to-search affordance. Only renders when the AI gateway
          returned non-empty suggestion_chips; on fallback there's
          simply no row, so its presence alone signals "AI ran". */}
      {!isSearching &&
      aiSuggestions &&
      aiSuggestions.suggestion_chips.length > 0 ? (
        <AISuggestionRow
          chips={aiSuggestions.suggestion_chips}
          onPick={(chip) => {
            hapt.select();
            setQuery(chip);
            // v19.27 — record the chip text so the engine call
            // can pass `chipIntent` and the trigger flips to
            // 'chip_press'. Cleared by the typed-text branch
            // below when the user types a different query.
            setLastChipIntent(chip);
          }}
        />
      ) : null}

      {isSearching ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.searchScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {liveResults.length > 0 ? (
            <View>
              {/* v19.38 — REAL PATH PROOF MARKER. Renders in dev
                  builds only, inside the same JSX branch that
                  renders live hero+alts. If the user does NOT see
                  this badge, the corrected v19.38 path is not
                  active on their device (likely stale JS bundle
                  — they need to reload). */}
              {__DEV__ ? (
                <RealPathBadge rec={lastRec} at={lastRecAt} />
              ) : null}
              <View style={liveStyles.grid}>
                {liveResults.map((c) => (
                  <View key={c.id} style={liveStyles.cell}>
                    <LiveProductCard candidate={c} variant="alt" />
                  </View>
                ))}
              </View>
            </View>
          ) : liveSearching ? (
            <View style={liveStyles.unavailableWrap}>
              {/* v18.9 — tiered search loading state.
                  • 0–5 s  → "Searching products for X…"
                  • 5–25 s → "Still working — thanks for waiting"
                  • > 25 s → hard-fail to the empty/timeout branch
                              below (searchTimedOut === true). */}
              {searchSlow ? (
                <SearchSlowNote query={debouncedQuery} />
              ) : (
                <SearchLoadingNote query={debouncedQuery} />
              )}
            </View>
          ) : (
            // v19.35 — single empty/unavailable state, no parallel
            // offline-catalog grid. Retry re-runs the canonical
            // engine, which can itself produce seed-fallback
            // results if live retrieval failed; the screen does
            // NOT decide that branch.
            <View style={liveStyles.unavailableWrap}>
              <LiveProductsUnavailable
                variant={searchTimedOut ? 'unavailable' : 'empty'}
                scope={`for "${debouncedQuery}"`}
                onRetry={retrySearch}
              />
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.rowsScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Browse by goal — 7 chips, category-first ─────── */}
          <CategoryRail selected={goal} onSelect={setGoal} />

          {/* ── 2. Matched to your skin / goal feed ──────────────── */}
          <CategoryFeed goal={goal} />

          <View style={{ height: 140 }} />
        </ScrollView>
      )}

      <FiltersStubSheet
        visible={filtersOpen}
        onDismiss={() => setFiltersOpen(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// v10.26 — AI suggestion chip row.
//
// Renders a horizontal scrolling row of AI-generated suggestion chips
// beneath the AISearchBar when the gateway has produced fresh
// suggestions. Tapping a chip populates the search input.
//
// Chips fade-in on mount via a small reanimated transition so the row
// doesn't pop visually when AI eventually returns. The whole row only
// renders when AI suggestions exist — so its presence on screen is
// itself a strong signal that AI is alive for this user.
// ---------------------------------------------------------------------------

/**
 * v19.38 — REAL PATH PROOF MARKER + dev panel.
 *
 * Visible only when __DEV__ is true. Rendered DIRECTLY inside the
 * live-results JSX branch on the real Products screen. Shows the
 * minimum dev fields the user needs to verify on-device that the
 * corrected path is running:
 *
 *   • REAL PATH v19.38 (badge — proves the new code is active)
 *   • queryFamily        (e.g. "family:moisturizer")
 *   • skinFitReason      (e.g. "oily" / "sensitive" / "dry")
 *   • heroSkinFitScore   (0..100 — higher = better skin match)
 *   • resultSource       (live | fallback | empty | unknown)
 *   • lastUpdatedAt      (ISO timestamp of latest fetch)
 *
 * If the user opens the Products tab in dev/Expo Go and does NOT
 * see the "REAL PATH v19.38" pill, the v19.38 bundle is not
 * actually running on their device — they should reload Metro and
 * re-launch.
 */
function RealPathBadge({
  rec,
  at,
}: {
  rec: RecommendationContextType | null;
  at: string | null;
}) {
  return (
    <View style={realPathStyles.wrap}>
      <View style={realPathStyles.pill}>
        <Text style={realPathStyles.pillText} maxFontSizeMultiplier={1}>
          REAL PATH v19.38
        </Text>
      </View>
      <View style={realPathStyles.row}>
        <Text style={realPathStyles.label}>queryFamily</Text>
        <Text style={realPathStyles.value} numberOfLines={1}>
          {rec?.queryFamily ?? '(none)'}
        </Text>
      </View>
      <View style={realPathStyles.row}>
        <Text style={realPathStyles.label}>skinFitReason</Text>
        <Text style={realPathStyles.value} numberOfLines={1}>
          {rec?.skinFitReason ?? '(unknown)'}
        </Text>
      </View>
      <View style={realPathStyles.row}>
        <Text style={realPathStyles.label}>heroSkinFitScore</Text>
        <Text style={realPathStyles.value}>
          {rec?.heroSkinFitScore !== null && rec?.heroSkinFitScore !== undefined
            ? `${rec.heroSkinFitScore}/100`
            : '(none)'}
        </Text>
      </View>
      <View style={realPathStyles.row}>
        <Text style={realPathStyles.label}>resultSource</Text>
        <Text style={realPathStyles.value} numberOfLines={1}>
          {rec?.retrievalSource ?? '(none)'}
        </Text>
      </View>
      <View style={realPathStyles.row}>
        <Text style={realPathStyles.label}>lastUpdatedAt</Text>
        <Text style={realPathStyles.value} numberOfLines={1}>
          {at ?? '(none)'}
        </Text>
      </View>
      {rec?.excludedFromHero && rec.excludedFromHero.length > 0 ? (
        <View style={{ marginTop: 6 }}>
          <Text style={realPathStyles.label}>
            excludedFromHero ({rec.excludedFromHero.length}):
          </Text>
          {rec.excludedFromHero.slice(0, 3).map((x) => (
            <Text
              key={x.id}
              style={realPathStyles.excludedRow}
              numberOfLines={2}
            >
              × {x.name} — {x.reason}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const realPathStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF7E5',
    borderWidth: 1,
    borderColor: '#E0B341',
    gap: 4,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#0B1220',
    marginBottom: 6,
  },
  pillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#FEF7E5',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: '#7C5C00',
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0B1220',
    flex: 1,
    textAlign: 'right',
  },
  excludedRow: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 13,
    color: '#7C5C00',
    marginTop: 2,
  },
});

/**
 * v18.9 — premium search loading copy.
 * 0–5 s window. Reads as alive, not technical.
 */
function SearchLoadingNote({ query }: { query: string }) {
  return (
    <View style={searchNoteStyles.card}>
      <Text style={searchNoteStyles.headline} maxFontSizeMultiplier={1.2}>
        Searching products…
      </Text>
      <Text
        style={searchNoteStyles.sub}
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
      >
        Finding the best matches for{' '}
        <Text style={{ fontStyle: 'italic' }}>{`"${query}"`}</Text>.
      </Text>
    </View>
  );
}

/**
 * v18.9 — slow-search reassurance.
 * Triggered after 5 s of waiting. Tells the user the screen
 * isn't frozen.
 */
function SearchSlowNote({ query }: { query: string }) {
  return (
    <View style={searchNoteStyles.card}>
      <Text style={searchNoteStyles.headline} maxFontSizeMultiplier={1.2}>
        Still working — thanks for waiting…
      </Text>
      <Text
        style={searchNoteStyles.sub}
        maxFontSizeMultiplier={1.2}
        numberOfLines={2}
      >
        Pulling live picks for{' '}
        <Text style={{ fontStyle: 'italic' }}>{`"${query}"`}</Text>.
      </Text>
    </View>
  );
}

function AISuggestionRow({
  chips,
  onPick,
}: {
  chips: string[];
  onPick: (chip: string) => void;
}) {
  const op = useSharedValue(0);
  const ty = useSharedValue(6);
  React.useEffect(() => {
    op.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [op, ty]);
  const containerStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[suggestionRow.wrap, containerStyle]}>
      <Text style={suggestionRow.kicker} maxFontSizeMultiplier={1.1}>
        SUGGESTED FOR YOU
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={suggestionRow.row}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => onPick(chip)}
            accessibilityRole="button"
            accessibilityLabel={`Search ${chip}`}
            style={({ pressed }) => [
              suggestionRow.chip,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={suggestionRow.chipLabel}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
            >
              {chip}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const suggestionRow = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clay,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipLabel: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    letterSpacing: -0.1,
    color: palette.ink,
  },
});

// v18.0 — live search grid + transient status block.
const liveStyles = StyleSheet.create({
  grid: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '47%',
  },
  statusWrap: {
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: palette.inkTertiary,
  },
  unavailableWrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  // v19.35 — `fallbackWrap` / `fallbackKicker` styles removed
  // alongside the offline-catalog render path.
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  // v11.10 — unified header dimensions across primary tabs.
  // 48pt height matches AssistantScreen.brandBar so the page-to-page
  // transitions feel consistent.
  headerRow: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandWord: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.0,
    color: palette.ink,
    marginHorizontal: 20,
    marginTop: 8,
  },
  searchKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  rowsScroll: {
    paddingTop: 6,
    paddingBottom: 20,
  },
  searchScroll: {
    paddingBottom: 120,
  },
});

// v18.9 — premium search loading copy. Lives alongside the existing
// liveStyles so the search results column has a coherent visual
// language across loading / slow / empty / unavailable states.
const searchNoteStyles = StyleSheet.create({
  card: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    gap: 6,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
  },
});
