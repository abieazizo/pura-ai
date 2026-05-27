/**
 * SuggestedTonightStep — scan-aware Routine empty-state companion.
 *
 * Lives under the FirstRunRoutinePanel headline. Reads the canonical
 * `insight.bestMove` and renders it as a soft "Suggested tonight" card.
 *
 * When `bestMove === null` (no scan / low confidence), this component
 * renders nothing — the caller must check `bestMove` before mounting.
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
}

export function SuggestedTonightStep({ bestMove }: Props) {
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
      setTimeout(() => setAdded(false), 2400);
      return;
    }
    // @ts-expect-error nested stack nav from primary tab
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  };

  const onSecondary = () => {
    hapt.select();
    // @ts-expect-error nested stack nav from primary tab
    nav.navigate?.('Tabs', { screen: 'ProductsTab' });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.kickerRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          SUGGESTED TONIGHT
        </Text>
      </View>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
      >
        {bestMove.title.replace(/^Add\s+/i, '').replace(/\s+tonight$/i, '')}
      </Text>
      {/* v23.0 — 4 lines instead of 3 so the new concrete per-category
          instructions land complete (no trailing "…"). */}
      <Text
        style={styles.body}
        maxFontSizeMultiplier={1.2}
        numberOfLines={4}
      >
        {bestMove.body}
      </Text>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          accessibilityLabel={
            added ? 'Added to routine' : bestMove.ctaLabel
          }
          style={({ pressed }) => [
            styles.primaryCta,
            added && styles.primaryCtaAdded,
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          {added ? (
            <>
              <CheckCircle size={15} color={palette.inkInverse} weight="fill" />
              <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
                Added
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
                {bestMove.ctaLabel}
              </Text>
              <ArrowRight size={14} color={palette.inkInverse} weight="bold" />
            </>
          )}
        </Pressable>
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          accessibilityLabel="Choose from my matches"
          hitSlop={6}
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.secondaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Choose from my matches
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clay,
    shadowColor: palette.clay,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryCta: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  primaryCtaAdded: {
    backgroundColor: palette.mossDeep,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    flex: 1,
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
    textDecorationLine: 'underline',
  },
});
