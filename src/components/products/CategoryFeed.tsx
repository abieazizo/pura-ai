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
import {
  lookupForConcern,
  lookupForScan,
  lookupLiveProducts,
} from '@/api/liveProducts';
import { LiveProductCard } from './LiveProductCard';
import { type GoalKey } from './CategoryRail';
import type {
  ConcernType,
  LiveProductCandidate,
} from '@/ai/ai-contracts';

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

  // v18.2 — live retrieval per goal. The Promise behind each goal is
  // cached at the module layer (src/api/liveProducts.ts) so jumping
  // back to the same chip is instant after the first run.
  useEffect(() => {
    let cancelled = false;
    if (goal === 'best-for-you' && !hasScanned) {
      // Pre-scan locked state — no retrieval needed.
      setPicks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const promise: Promise<LiveProductCandidate[]> =
      goal === 'best-for-you' && latestScan
        ? lookupForScan(latestScan, { count: 8 })
        : goalToConcern(goal)
        ? lookupForConcern(goalToConcern(goal)!, { count: 8 })
        : lookupLiveProducts(goalToFreeQuery(goal), { count: 8 });
    promise
      .then((next) => {
        if (cancelled) return;
        setPicks(next);
      })
      .catch(() => {
        if (cancelled) return;
        setPicks([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goal, hasScanned, latestScan?.id]);

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
          {loading
            ? 'Loading…'
            : picks.length > 0
            ? `${picks.length} picks`
            : 'No live picks'}
        </Text>
      </View>

      {loading && picks.length === 0 ? (
        <Text style={styles.loadingLine} maxFontSizeMultiplier={1.2}>
          Finding the best real products for {meta.queryName}…
        </Text>
      ) : null}

      {!loading && picks.length === 0 ? (
        <Text style={styles.emptyLine} maxFontSizeMultiplier={1.2}>
          The AI engine couldn’t reach the live retrieval service.
          Connect the proxy and pull this goal again.
        </Text>
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

// ---------------------------------------------------------------------------
// Goal mapping.
// ---------------------------------------------------------------------------

const GOAL_LABELS: Record<GoalKey, { kicker: string; queryName: string }> = {
  'best-for-you': { kicker: 'MATCHED TO YOUR SKIN', queryName: 'your skin' },
  breakouts: { kicker: 'TARGETED FOR BREAKOUTS', queryName: 'breakouts' },
  hydration: { kicker: 'FOR HYDRATION', queryName: 'hydration' },
  texture: { kicker: 'FOR SMOOTHER TEXTURE', queryName: 'texture' },
  'dark-marks': { kicker: 'FOR DARK MARKS', queryName: 'dark marks' },
  sensitive: { kicker: 'GENTLE FOR SENSITIVE SKIN', queryName: 'sensitive skin' },
  natural: { kicker: 'NATURAL & CLEAN', queryName: 'clean & natural picks' },
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
    default:
      return null;
  }
}

function goalToFreeQuery(goal: GoalKey): string {
  switch (goal) {
    case 'natural':
      return 'best clean fragrance-free skincare from natural-leaning brands';
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
