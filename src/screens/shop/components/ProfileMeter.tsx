/**
 * ProfileMeter — small affordance under the SkinProfileStrip that
 * shows the user how complete their profile is and nudges them
 * to fill the gaps that will tighten the recommendation accuracy.
 *
 * The number isn't a vanity metric — it's literally the proportion
 * of personalization-relevant fields the user has filled. When
 * accuracy < 80%, the row becomes tappable and surfaces a coral
 * "Improve" pill that navigates to Scan (the highest-impact gap).
 *
 * When accuracy is already high (≥ 80%) the row stays present but
 * quietly congratulatory — never nags.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Sparkle } from 'phosphor-react-native';
import { puraShop, puraShopLayout, puraShopRadius } from '@/theme';

export interface ProfileMeterProps {
  /** 0..1 share of personalization-relevant fields filled. */
  accuracy: number;
  /** Tapping the improve pill jumps to the scan or profile flow. */
  onImprove?: () => void;
}

export function ProfileMeter({ accuracy, onImprove }: ProfileMeterProps) {
  const pct = Math.round(accuracy * 100);
  const high = pct >= 80;

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.max(8, pct)}%` }]} />
        </View>
        <Text style={styles.label} maxFontSizeMultiplier={1.2} numberOfLines={1}>
          <Text style={styles.labelStrong}>Match accuracy {pct}%</Text>
          {high
            ? '  ·  Personalized to your skin.'
            : '  ·  Scan to tighten this.'}
        </Text>
      </View>
      {!high && onImprove ? (
        <Pressable
          onPress={onImprove}
          accessibilityRole="button"
          accessibilityLabel={`Improve match accuracy. Currently ${pct} percent.`}
          hitSlop={6}
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.86, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Sparkle size={11} color={puraShop.coralDeep} weight="fill" />
          <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.15}>
            Improve
          </Text>
          <ArrowRight size={11} color={puraShop.coralDeep} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: puraShop.surfaceMuted,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    backgroundColor: puraShop.coral,
    borderRadius: 2,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: puraShop.inkMuted,
    letterSpacing: -0.05,
  },
  labelStrong: {
    fontFamily: 'Inter-SemiBold',
    color: puraShop.ink,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: puraShopRadius.chip,
    backgroundColor: puraShop.coralSoft,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: puraShop.coralDeep,
    letterSpacing: -0.1,
  },
});
