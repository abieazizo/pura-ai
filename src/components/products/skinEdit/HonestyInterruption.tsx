/**
 * HonestyInterruption — the "Excellent later. Not first." card.
 *
 * This is the trust-building moment. It tells the user that Pura is
 * willing to withhold a popular product because it isn't right for
 * tonight's priority.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { Recommendation } from '@/state/skinEdit';
import { ProductStage } from './ProductStage';

interface HonestyInterruptionProps {
  recommendation: Recommendation;
  onSaveForLater: () => void;
  onCompare: () => void;
  onPressDetail: () => void;
}

export function HonestyInterruption({
  recommendation,
  onSaveForLater,
  onCompare,
  onPressDetail,
}: HonestyInterruptionProps) {
  const { product, shortReason } = recommendation;
  return (
    <View style={styles.card}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        You may have expected this instead.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`See why Pura defers ${product.brand} ${product.name}`}
        onPress={onPressDetail}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.96 }]}
      >
        <View style={styles.stageCol}>
          <ProductStage product={product} imageUrl={product.imageUrl} size="tile" />
        </View>
        <View style={styles.copyCol}>
          <Text style={styles.brand} maxFontSizeMultiplier={1.2}>
            {product.brand}
          </Text>
          <Text style={styles.name} maxFontSizeMultiplier={1.2} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.price} maxFontSizeMultiplier={1.1}>
            ${product.price}
          </Text>
          <View style={styles.stateChip}>
            <Text style={styles.stateChipText} maxFontSizeMultiplier={1.1}>
              {shortReason}
            </Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.explanation} maxFontSizeMultiplier={1.3}>
        Save this for when the active areas settle. Adding it now would address the aftermath before the immediate concern.
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save for phase two"
          onPress={onSaveForLater}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        >
          <Text style={styles.primaryBtnLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            Save for phase two
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compare products"
          onPress={onCompare}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
        >
          <Text style={styles.secondaryBtnLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            Compare products
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  heading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 14,
  },
  body: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  stageCol: {
    width: 96,
  },
  copyCol: {
    flex: 1,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.1,
    color: palette.ink,
    marginBottom: 6,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    color: palette.inkSecondary,
    marginBottom: 8,
  },
  stateChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: '#EBCFC5',
  },
  stateChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: palette.clayDeep,
  },
  explanation: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkSecondary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    backgroundColor: palette.clay,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: palette.clayDeep,
  },
  primaryBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.inkInverse,
    letterSpacing: -0.05,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: palette.bgDeep,
  },
  secondaryBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
    letterSpacing: -0.05,
  },
});
