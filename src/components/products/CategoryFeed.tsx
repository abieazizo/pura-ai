/**
 * CategoryFeed — v18.2.
 *
 * The Products tab's "Browse by goal" grid. v18.2 replaces the
 * seed-driven `getGoalBreakouts()` / `getGoalHydration()` / etc.
 * selectors with the live retrieval engine. Each goal chip now
 * fires `lookupForConcern()` or, for `best-for-you`, fires
 * `lookupForScan(latestScan)` so the grid surfaces the AI's actual
 * curated picks for the active goal.
 *
 * Visible behavior change:
 *   • Tap a goal chip ("BREAKOUTS") → grid populates with real
 *     named products from real brands (CeraVe, La Roche-Posay,
 *     Beauty of Joseon, etc.) returned by the live retrieval engine.
 *   • Tap "Best for you" with a scan → grid is the same scan-driven
 *     retrieval as the Plan / Home / Scan-result hero, so all surfaces
 *     stay consistent.
 *   • No scan + "Best for you" → BestForYouLocked still surfaces a
 *     premium "take a scan" CTA (unchanged from v10.9).
 *   • While the AI call is in flight, a quiet italic-serif "Loading
 *     real picks for X…" line shows.
 *   • Card tap → in-app ProductDetail (resolves from
 *     useAppStore.liveProductsById). Shop button on each card opens
 *     the merchant URL.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
// v19.20 — CategoryFeed now consumes the shared deterministic
// recommendation engine. Legacy `lookupForScan` / `lookupForConcern` /
// `lookupLiveProducts` direct AI calls are gone from the critical
// path. Grid renders from the seed catalog regardless of proxy state.
import {
  getRecommendationContextForScan,
  getRecommendationContextFromQuery,
} from '@/api/liveProducts';
import { LiveProductCard } from './LiveProductCard';
import { LiveProductsUnavailable } from './LiveProductsUnavailable';
import { type GoalKey } from './CategoryRail';
import type {
  ConcernType,
  LiveProductCandidate,
} from '@/ai/ai-contracts';
// v22.8 — canonical selectors to build the personalization context
// line on the Browse-by-goal feed. Same builder pattern as
// ProductsScreen.UserContextLine.
import {
  selectSkinState,
  selectUserProfileContext,
} from '@/state/canonical';
// v22.7 — canonical hook with primitive-selector subscriptions.
// Replaces calling `selectUserProfileContext(s)` inside a `useShallow`
// selector, which rebuilt the profile object on every store snapshot
// read, broke React 19's `getSnapshot` cache invariant, and looped the
// Products tab into "Maximum update depth exceeded".
import { useUserProfileContext } from '@/hooks/useCanonical';

export interface CategoryFeedProps {
  goal: GoalKey;
}

export function CategoryFeed({ goal }: CategoryFeedProps) {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const { hasScanned, latestScan } = useAppStore(
    useShallow((s) => ({
      hasScanned: s.scans.length > 0,
      latestScan: s.scans.length > 0 ? s.scans[s.scans.length - 1] : null,
    }))
  );

  const [picks, setPicks] = useState<LiveProductCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errored, setErrored] = useState<boolean>(false);
  const [attempt, setAttempt] = useState<number>(0);

  // v18.2/v18.4 — live retrieval per goal with explicit retry.
  useEffect(() => {
    let cancelled = false;
    if (goal === 'best-for-you' && !hasScanned) {
      setPicks([]);
      setLoading(false);
      setErrored(false);
      return;
    }
    setLoading(true);
    setErrored(false);
    // v19.20 — shared deterministic engine. Three branches:
    //   • best-for-you + scan exists → scan-driven engine
    //   • concern goal             → free-text engine
    //                                 (concern keyword maps cleanly
    //                                  through the seed retrieval's
    //                                  query-token matcher)
    //   • free-text goal           → free-text engine
    // No AI proxy required. Grid paints from the seed catalog.
    const goalConcern = goalToConcern(goal);
    // v19.24 — chip_press when goal change drives the effect,
    // retry when the user explicitly bumped attempt, initial_load
    // on first mount.
    const trigger = attempt > 0 ? 'retry' : 'chip_press';
    const promise =
      goal === 'best-for-you' && latestScan
        ? getRecommendationContextForScan(latestScan, {
            fresh: attempt > 0,
            trigger,
          })
        : getRecommendationContextFromQuery(
            goalConcern
              ? `${goalConcern.replace(/_/g, ' ')} skincare`
              : goalToFreeQuery(goal),
            { fresh: attempt > 0, trigger }
          );
    promise
      .then((rec) => {
        if (cancelled) return;
        const hero = rec.heroProduct;
        const list: LiveProductCandidate[] = hero
          ? [hero, ...rec.alternatives.filter((c) => c.id !== hero.id)]
          : rec.candidateProducts;
        setPicks(list);
        setErrored(
          list.length === 0 ||
            rec.availabilityState === 'unavailable' ||
            rec.availabilityState === 'empty'
        );
      })
      .catch(() => {
        if (cancelled) return;
        setPicks([]);
        setErrored(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goal, hasScanned, latestScan?.id, attempt]);

  const meta = GOAL_LABELS[goal];

  if (goal === 'best-for-you' && !hasScanned) {
    return <BestForYouLocked onScan={() => nav.navigate('ScanModal')} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {meta.kicker}
        </Text>
        <Text style={styles.count} maxFontSizeMultiplier={1.1}>
          {/* v22.10 — count slot reads as a calm secondary detail.
              While loading we show a quiet "Refining…" so the user
              knows the engine is working without the "Loading…"
              technical phrasing. When picks resolve we show the
              count. Empty state shows nothing — the empty/unavailable
              card below carries the message. */}
          {loading
            ? 'Refining…'
            : picks.length > 0
            ? `${picks.length} picks`
            : ''}
        </Text>
      </View>
      {/* v22.8 — personalization context line. Renders a single
          italic-serif line ("Picked for redness-prone, sensitive
          skin") under the section kicker when the user has any
          profile or scan signal. Stays silent for cold-start users
          so the layout doesn't claim personalization that isn't
          there. */}
      <CategoryFeedContextLine />

      {/* v22.11 — honest Natural-goal subtitle. The curated catalog
          rarely carries strong "natural" metadata, so the Natural
          shelf must say so plainly — not pretend it's a verified
          natural product feed. Renders only on the Natural goal.
          Never implies natural is safer or more effective. */}
      {goal === 'natural' && picks.length > 0 ? (
        <Text
          style={styles.naturalNote}
          maxFontSizeMultiplier={1.2}
          numberOfLines={3}
        >
          Curated from available product data. Natural claims are shown only
          when product data supports them.
        </Text>
      ) : null}

      {/* v23.0 — loading state is now COMPACT. The previous full-card
          "Finding your best match for breakouts… / Reading your scan
          and matching to product details." treatment dominated the
          page and read as a stuck loader. Compact mode shows a calm
          single-row line that lives inline above the grid — products
          appear right under it as soon as they're available. */}
      {loading && picks.length === 0 ? (
        <LiveProductsUnavailable
          variant="loading"
          scope={`for ${meta.queryName}`}
          compact
        />
      ) : null}

      {!loading && picks.length === 0 ? (
        <LiveProductsUnavailable
          variant={errored ? 'unavailable' : 'empty'}
          scope={`for ${meta.queryName}`}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : null}

      <View style={styles.grid}>
        {picks.map((c) => (
          <View key={c.id} style={styles.cell}>
            <LiveProductCard candidate={c} variant="alt" />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * v22.8 — small editorial context line shown above the
 * Browse-by-goal grid. Same shape as ProductsScreen.UserContextLine
 * but compact (max 1 line) since it sits inside a section header.
 */
function CategoryFeedContextLine() {
  // v22.7 — same fix as ProductsScreen.UserContextLine. The previous
  // selector was:
  //   useShallow((s) => ({ scans: s.scans, profile: selectUserProfileContext(s) }))
  // `selectUserProfileContext` rebuilds an object with fresh arrays
  // every call, so `profile`'s reference changed on every store
  // snapshot read. React 19's useSyncExternalStore calls getSnapshot
  // multiple times per render to detect tears; the unstable profile
  // reference looked like a tear, React retried, and the loop
  // compounded into "Maximum update depth exceeded" + the
  // "result of getSnapshot should be cached" warning on the Products
  // tab. Primitive subscription on `scans` + the memoized canonical
  // hook restores referential stability across snapshots.
  const scans = useAppStore((s) => s.scans);
  const profile = useUserProfileContext();
  const phrase = useMemo(() => {
    const latestScan = scans[scans.length - 1] ?? null;
    const previous =
      scans.length >= 2 ? scans[scans.length - 2] : undefined;
    const skinState = latestScan
      ? selectSkinState(latestScan, previous, scans)
      : null;
    return buildCategoryFeedPhrase(profile, skinState);
  }, [scans, profile]);
  if (!phrase) return null;
  return (
    <Text
      style={contextLineStyles.text}
      maxFontSizeMultiplier={1.2}
      numberOfLines={1}
    >
      {phrase}
    </Text>
  );
}

function buildCategoryFeedPhrase(
  profile: ReturnType<typeof selectUserProfileContext>,
  skinState: ReturnType<typeof selectSkinState>
): string | null {
  const skinType = profile.skinType ?? null;
  const top = skinState?.topConcerns?.[0]?.concern ?? null;
  const concernAdjective = (() => {
    switch (top) {
      case 'breakouts':
        return 'breakout-prone';
      case 'redness':
        return 'redness-prone';
      case 'hydration':
        return 'dehydrated';
      case 'texture':
        return 'uneven-texture';
      case 'dark_marks':
        return 'mark-prone';
      case 'oiliness':
        return 'oil-prone';
      case 'sensitivity':
        return 'sensitive';
      case 'pores':
        return 'pore-prone';
      default:
        return null;
    }
  })();
  const skinTypeLabel = (() => {
    switch (skinType) {
      case 'dry':
        return 'dry';
      case 'oily':
        return 'oily';
      case 'combination':
        return 'combination';
      case 'sensitive':
        return 'sensitive';
      default:
        return null;
    }
  })();
  if (concernAdjective && skinTypeLabel) {
    return `Picked for ${concernAdjective}, ${skinTypeLabel} skin.`;
  }
  if (concernAdjective) return `Picked for ${concernAdjective} skin.`;
  if (skinTypeLabel) return `Picked for ${skinTypeLabel} skin.`;
  return null;
}

const contextLineStyles = StyleSheet.create({
  text: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 12,
    marginTop: -4,
  },
});

// ---------------------------------------------------------------------------
// Goal mapping.
// ---------------------------------------------------------------------------

const GOAL_LABELS: Record<GoalKey, { kicker: string; queryName: string }> = {
  'best-for-you': { kicker: 'MATCHED TO YOUR SKIN', queryName: 'your skin' },
  breakouts: { kicker: 'BEST MATCHES FOR BREAKOUTS', queryName: 'breakouts' },
  hydration: { kicker: 'BEST MATCHES FOR HYDRATION', queryName: 'hydration' },
  texture: { kicker: 'BEST MATCHES FOR TEXTURE', queryName: 'texture' },
  'dark-marks': { kicker: 'BEST MATCHES FOR DARK MARKS', queryName: 'dark marks' },
  sensitive: { kicker: 'SENSITIVE-SKIN PICKS', queryName: 'sensitive skin' },
  // v22.9 — explicit barrier goal kicker + queryName.
  barrier: { kicker: 'BARRIER-SUPPORT PICKS', queryName: 'barrier repair' },
  // v22.11 — honest Natural kicker. "Natural-leaning" reads as
  // editorial framing, not a verified-natural claim.
  natural: { kicker: 'NATURAL-LEANING OPTIONS', queryName: 'natural-leaning picks' },
};

function goalToConcern(goal: GoalKey): ConcernType | null {
  switch (goal) {
    case 'breakouts':
      return 'breakouts';
    case 'hydration':
      return 'hydration';
    case 'texture':
      return 'texture';
    case 'dark-marks':
      return 'dark_marks';
    case 'sensitive':
      return 'sensitivity';
    // v22.9 — barrier maps to hydration concern for the free-text
    // engine (barrier repair is hydration-adjacent in the curated
    // category registry under "barrier repair").
    case 'barrier':
      return 'hydration';
    default:
      return null;
  }
}

function goalToFreeQuery(goal: GoalKey): string {
  switch (goal) {
    case 'natural':
      return 'best clean fragrance-free skincare from natural-leaning brands';
    // v22.9 — barrier free-text query routes to the curated
    // 'barrier repair' category via the resolver.
    case 'barrier':
      return 'barrier repair';
    case 'best-for-you':
      // Used only when there's no scan AND this somehow gets past
      // the BestForYouLocked guard.
      return 'best entry-level skincare picks for general skin';
    default:
      return GOAL_LABELS[goal].queryName;
  }
}

// ---------------------------------------------------------------------------
// Pre-scan locked state (only for best-for-you).
// ---------------------------------------------------------------------------

function BestForYouLocked({ onScan }: { onScan: () => void }) {
  return (
    <View style={lockedStyles.wrap}>
      <Text style={lockedStyles.kicker} maxFontSizeMultiplier={1.1}>
        MATCHED TO YOUR SKIN
      </Text>
      <Text
        style={lockedStyles.headline}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.9}
      >
        Scan your face to unlock your best matches.
      </Text>
      <Text style={lockedStyles.body} maxFontSizeMultiplier={1.2}>
        One thirty-second scan, and this feed fills with products picked from everything we have.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Take your first scan"
        style={({ pressed }) => [
          lockedStyles.cta,
          pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={lockedStyles.ctaLabel} maxFontSizeMultiplier={1.15}>
          Take a scan
        </Text>
        <ArrowRight size={15} color={palette.inkInverse} weight="duotone" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  count: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  loadingLine: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkTertiary,
    marginBottom: 8,
  },
  emptyLine: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkTertiary,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cell: {
    width: '47%',
  },
  // v22.11 — Natural-goal honesty note. Small italic-serif line
  // under the kicker that signals these picks aren't a verified
  // natural product feed.
  naturalNote: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12,
    lineHeight: 17,
    color: palette.inkSecondary,
    marginTop: -4,
    marginBottom: 12,
  },
});

const lockedStyles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginHorizontal: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'flex-start',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  cta: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
});
