/**
 * BestMoveTodayCard — the loop bridge.
 *
 * Reads `insight.bestMove` from the canonical adapter and renders the
 * single best action for tonight, with a primary CTA that either:
 *   1. Writes the resolved product id into the user's routine via
 *      `addUserRoutineProduct(slot, productId)`, or
 *   2. Navigates to the matched-picks view (Products tab) when no
 *      product id resolved.
 *
 * Honesty rules:
 *   • Never invents a product. When `resolvedProductId === null`, the
 *     CTA opens the matched-picks flow — it does NOT silently add
 *     something arbitrary.
 *   • When `insight.bestMove === null`, the parent must not render
 *     this card at all.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, CheckCircle, Sparkle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import type { InsightBestMove } from '@/state/progressRoutineInsight';
import type { RootStackParamList } from '@/navigation/types';

interface Props {
  bestMove: InsightBestMove;
  /** When true, render the compact variant (used in Routine empty state). */
  compact?: boolean;
}

export function BestMoveTodayCard({ bestMove, compact = false }: Props) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const addUserRoutineProduct = useAppStore((s) => s.addUserRoutineProduct);
  const [added, setAdded] = useState(false);

  const onPrimary = () => {
    hapt.tap();
    if (bestMove.resolvedProductId) {
      addUserRoutineProduct(
        bestMove.slot === 'saved' ? 'evening' : bestMove.slot,
        bestMove.resolvedProductId
      );
      setAdded(true);
      // Brief confirmation; revert label after a moment so the user can
      // see it landed and the card stays useful for repeat scans.
      setTimeout(() => setAdded(false), 2400);
      return;
    }
    // Fallback: open the matched-picks flow. No fake add.
    // @ts-expect-error nested stack nav from a primary tab screen
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  };

  const onSecondary = () => {
    hapt.select();
    // @ts-expect-error nested stack nav from a primary tab screen
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.railWrap} pointerEvents="none">
        <View style={styles.rail} />
      </View>
      <View style={styles.kickerRow}>
        <Sparkle size={12} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          BEST MOVE TONIGHT
        </Text>
      </View>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
      >
        {bestMove.title}
      </Text>
      {/* v23.0 — bumped from 3 to 4 lines so the new concrete
          per-category instructions (when/why/how) never clip with
          a trailing "…". Body still has bounded length upstream. */}
      <Text
        style={styles.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={4}
      >
        {bestMove.body}
      </Text>

      <Pressable
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={added ? 'Added to routine' : bestMove.ctaLabel}
        style={({ pressed }) => [
          styles.primaryCta,
          added && styles.primaryCtaAdded,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        {added ? (
          <>
            <CheckCircle size={16} color={palette.inkInverse} weight="fill" />
            <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
              Added to {bestMove.slot === 'morning' ? 'morning' : 'evening'} routine
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
              {bestMove.ctaLabel}
            </Text>
            <ArrowRight size={15} color={palette.inkInverse} weight="bold" />
          </>
        )}
      </Pressable>

      {bestMove.resolvedProductId ? (
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          accessibilityLabel="Choose from my matches"
          hitSlop={6}
          style={({ pressed }) => [
            styles.secondary,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.1}>
            Choose from my matches
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    marginHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: palette.clayPaper,
    position: 'relative',
    overflow: 'hidden',
    // Action-tier emphasis: stronger shadow than utility cards.
    shadowColor: palette.clay,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardCompact: {
    marginTop: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  railWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  rail: {
    flex: 1,
    backgroundColor: palette.clay,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 16,
  },
  primaryCta: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaAdded: {
    backgroundColor: palette.mossDeep,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondary: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
    textDecorationLine: 'underline',
  },
});
