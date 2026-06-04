/**
 * ConcernsTonight — the "what I saw tonight" evidence row (Step 7).
 *
 * Between the consultant's letterhead (FeedHeader) and the recommendation
 * stack sits the EVIDENCE: a horizontal scroll of the concerns the last scan
 * actually surfaced, each with its severity and its movement since the scan
 * before. This is what earns the picks below — "here's what I read in your
 * skin, and here's what I'd reach for."
 *
 * It renders ONLY real scan concerns. The model hands us `concernsTonight`
 * already resolved from the canonical `SkinState.topConcerns` (empty pre-scan
 * or when nothing crossed the confidence floor), so this component reads that
 * contract and adds nothing — no store, no raw AI output. Pre-scan, or when
 * there are no surfaced concerns, it renders nothing at all (the feed simply
 * doesn't claim to have seen anything it didn't).
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { puraShop, puraShopHome, puraShopLayout, puraShopType } from '@/theme';
import type { ConcernChip } from '../shopStackModel';

export interface ConcernsTonightProps {
  concerns: ConcernChip[];
  /** Optional — routes to the concern's detail. Tap targets stay siblings. */
  onPressConcern?: (key: string) => void;
}

export function ConcernsTonight({ concerns, onPressConcern }: ConcernsTonightProps) {
  // Trust-first: if the scan surfaced nothing, the feed claims nothing.
  if (concerns.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.headTick} />
        <Text style={styles.headLabel}>WHAT I SAW TONIGHT</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {concerns.map((c) => (
          <ConcernCardItem key={c.key} chip={c} onPress={onPressConcern} />
        ))}
      </ScrollView>
    </View>
  );
}

interface TrendMeta {
  label: string;
  color: string;
  a11y: string;
}

/**
 * Movement since the previous scan, as a quiet word — never an alarm. Trust-
 * first: a rising concern is stated plainly in ink, an easing one earns the
 * positive green, a new one takes the concern's own accent. "Steady" is left
 * unsaid (no chip), so the row only ever speaks when there's something to say.
 */
function trendFor(chip: ConcernChip): TrendMeta | null {
  switch (chip.direction) {
    case 'worse':
      return { label: 'RISING', color: puraShopHome.ink, a11y: 'rising since your last scan' };
    case 'better':
      return { label: 'EASING', color: puraShopHome.budgetInk, a11y: 'easing since your last scan' };
    case 'new':
      return { label: 'NEW', color: chip.accent, a11y: 'new since your last scan' };
    case 'same':
    case null:
    default:
      return null;
  }
}

function ConcernCardItem({
  chip,
  onPress,
}: {
  chip: ConcernChip;
  onPress?: (key: string) => void;
}) {
  const trend = trendFor(chip);
  const a11yLabel = `${chip.label}, ${chip.severityLabel}${
    trend ? `, ${trend.a11y}` : ''
  }`;

  const inner = (
    <>
      <View style={styles.cardTop}>
        <View style={[styles.dot, { backgroundColor: chip.accent }]} />
        {trend ? (
          <Text style={[styles.trend, { color: trend.color }]} numberOfLines={1}>
            {trend.label}
          </Text>
        ) : null}
      </View>
      <Text style={styles.concern} numberOfLines={1}>
        {chip.label}
      </Text>
      <Text style={styles.severity} numberOfLines={1}>
        {chip.severityLabel}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(chip.key)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="See this concern in detail"
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.card} accessible accessibilityLabel={a11yLabel}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 12,
  },
  headTick: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: puraShopHome.quietInk,
    marginRight: 8,
  },
  headLabel: {
    ...puraShopType.tagLabel,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
  },
  row: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    gap: 10,
  },

  // ----- One concern card -----
  card: {
    minWidth: 138,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: puraShopHome.cardSurface,
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trend: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.9,
  },
  concern: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: -0.2,
    color: puraShopHome.ink,
    marginBottom: 3,
  },
  severity: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    letterSpacing: -0.05,
    color: puraShop.inkSecondary,
  },
});
