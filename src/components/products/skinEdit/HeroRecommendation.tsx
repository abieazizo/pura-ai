/**
 * HeroRecommendation — the centerpiece of the Skin Edit landing.
 *
 * Full-bleed editorial module that fuses real product imagery with
 * a one-line judgement ("PURA'S NEXT STEP"), recommendation state,
 * reasoning, and routine placement.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { Recommendation } from '@/state/skinEdit';
import { ProductStage } from './ProductStage';
import { RoutinePathway } from './RoutinePathway';

interface HeroRecommendationProps {
  recommendation: Recommendation;
  onPressDetail: () => void;
  onPrimary: () => void;
  onSecondary: () => void;
}

export function HeroRecommendation({
  recommendation,
  onPressDetail,
  onPrimary,
  onSecondary,
}: HeroRecommendationProps) {
  const { product, state, judgmentExplanation, routinePathway, routinePathwayActiveIndex, cta } = recommendation;

  const stateLabel =
    state === 'treat_now'
      ? 'FOR ACTIVE-LOOKING BREAKOUTS FIRST'
      : state === 'add_next'
      ? 'EXCELLENT FOR THE NEXT PHASE'
      : state === 'gentle_support'
      ? 'GENTLE SUPPORT THROUGH THE ROUTINE'
      : state === 'already_covered'
      ? 'YOU ALREADY COVER THIS ROLE'
      : state === 'pause_for_now'
      ? 'PAUSE WHILE COMFORT RETURNS'
      : 'NOT FIRST FOR TONIGHT';

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`See why Pura chose ${product.brand} ${product.name}`}
        onPress={onPressDetail}
        style={({ pressed }) => [pressed && { opacity: 0.96 }]}
      >
        <Text style={styles.label} maxFontSizeMultiplier={1.1}>
          PURA’S NEXT STEP
        </Text>

        <View style={styles.stageWrap}>
          <ProductStage product={product} imageUrl={product.imageUrl} size="hero" />
        </View>

        <Text style={styles.brand} maxFontSizeMultiplier={1.2}>
          {product.brand}
        </Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.2} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.stateRow}>
          <Text style={styles.stateLabel} maxFontSizeMultiplier={1.1}>
            {stateLabel}
          </Text>
        </View>

        <Text style={styles.support} maxFontSizeMultiplier={1.2}>
          {recommendation.relevanceLabel} · {riskLabel(recommendation.irritationRisk)} sensitivity watch
        </Text>

        <Text style={styles.reasoning} maxFontSizeMultiplier={1.3}>
          {judgmentExplanation}
        </Text>

        <View style={styles.pathwayWrap}>
          <RoutinePathway steps={routinePathway} activeIndex={routinePathwayActiveIndex} variant="card" />
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.primaryLabel}
          onPress={onPrimary}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        >
          <Text style={styles.primaryBtnLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {cta.primaryLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.secondaryLabel}
          onPress={onSecondary}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
        >
          <Text style={styles.secondaryBtnLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            See why Pura chose this
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function riskLabel(r: Recommendation['irritationRisk']): string {
  switch (r) {
    case 'low':
      return 'Low';
    case 'low_medium':
      return 'Low–medium';
    case 'medium':
      return 'Medium';
    case 'high':
      return 'High';
  }
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: '#0A1A2F',
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: palette.clayDeep,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  stageWrap: {
    marginHorizontal: -6,
    marginBottom: 18,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    color: palette.inkSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 14,
  },
  stateRow: {
    marginBottom: 8,
  },
  stateLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  support: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkTertiary,
    marginBottom: 12,
  },
  reasoning: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 16,
  },
  pathwayWrap: {
    marginBottom: 16,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: palette.ink,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnPressed: {
    backgroundColor: '#0A0C12',
  },
  primaryBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.inkInverse,
    letterSpacing: -0.1,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
