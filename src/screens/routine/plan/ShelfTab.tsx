/**
 * Shelf tab — "Build from what you already own."
 *
 * Empty state (no products):
 *   1. ShelfHero with Scan / Search / Add manually CTAs
 *   2. Trust line (in hero) + 4 category cards (all empty)
 *
 * With products:
 *   1. Compact summary row ("3 of 4 essentials added")
 *   2. Category cards (filled where applicable)
 *   3. Missing essentials list at the bottom
 *
 * Hard rules:
 *   - Use what user owns first; never imply product recs before scan.
 *   - "Scan product" + "Search product" CTAs route into the existing
 *     ScanModal / Products tab so we don't re-implement product input.
 *   - Category alias logic (toner→serum) lives in `planState`; this
 *     view only renders.
 */

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ShelfHero,
  ShelfCategoryCard,
  MissingEssentialsCard,
} from '@/components/plan';
import { plan as planTokens } from '@/components/plan/tokens';
import type { PlanState } from '@/state/planState';
import type { Product, ProductCategory } from '@/types';

export interface ShelfTabProps {
  state: PlanState;
  onScanProduct: () => void;
  onSearchProduct: () => void;
  onAddManually: () => void;
  onOpenProduct: (product: Product) => void;
  onAdd: (category: ProductCategory) => void;
}

const CATEGORY_PRIORITY: Record<ProductCategory, 'Highest' | 'High' | 'Medium' | 'Optional'> = {
  spf: 'Highest',
  moisturizer: 'High',
  serum: 'Medium',
  toner: 'Medium',
  cleanser: 'Optional',
  treatment: 'Optional',
  mask: 'Optional',
};

export function ShelfTab({
  state,
  onScanProduct,
  onSearchProduct,
  onAddManually,
  onOpenProduct,
  onAdd,
}: ShelfTabProps) {
  const insets = useSafeAreaInsets();
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [op, state.shelfSlots.length]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const bottomPad = insets.bottom + 56 + 60;
  const filledCount = state.shelfSlots.filter((s) => s.filled).length;
  const totalSlots = state.shelfSlots.length;
  const isEmptyShelf = filledCount === 0;

  return (
    <Animated.View style={[styles.flex, fadeStyle]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {isEmptyShelf ? (
          <ShelfHero
            onScanProduct={onScanProduct}
            onSearchProduct={onSearchProduct}
            onAddManually={onAddManually}
          />
        ) : (
          <View style={styles.summaryBlock}>
            <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
              YOUR SHELF
            </Text>
            <Text style={styles.summaryText} maxFontSizeMultiplier={1.15}>
              {filledCount} of {totalSlots} essentials added
            </Text>
            <Text style={styles.summarySub} maxFontSizeMultiplier={1.25}>
              Pura uses these in your routine first. Add the rest when you’re
              ready.
            </Text>
          </View>
        )}

        <View style={styles.gridSection}>
          <Text style={styles.sectionKicker} maxFontSizeMultiplier={1.1}>
            CATEGORIES
          </Text>
          <View style={styles.grid}>
            {state.shelfSlots.map((slot) => (
              <View key={slot.category} style={styles.gridItem}>
                <ShelfCategoryCard
                  category={slot.category}
                  label={slot.label}
                  priority={CATEGORY_PRIORITY[slot.category]}
                  product={slot.product}
                  onAdd={() => onAdd(slot.category)}
                  onOpen={
                    slot.product
                      ? () => onOpenProduct(slot.product!)
                      : undefined
                  }
                />
              </View>
            ))}
          </View>
        </View>

        <MissingEssentialsCard slots={state.shelfSlots} onFind={onAdd} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryBlock: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: planTokens.card,
    borderWidth: 1,
    borderColor: planTokens.border,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: planTokens.brand,
  },
  summaryText: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: planTokens.ink,
    marginTop: 6,
  },
  summarySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: planTokens.inkSecondary,
    marginTop: 6,
  },
  gridSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: planTokens.inkMuted,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    padding: 6,
  },
});
