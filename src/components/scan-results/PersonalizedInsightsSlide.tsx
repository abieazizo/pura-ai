/**
 * PersonalizedInsightsSlide — slide 4 of 4.
 *
 * v30.3 — refined ending.
 *
 *   • Layered coral mark replaces the generic sparkle — feels more
 *     intentional and pura-branded.
 *   • Insights are numbered with a small leading index for hierarchy.
 *   • The CTA caption is its own block under the button so it stops
 *     getting buried.
 *   • Disabled CTA path (limited scan without eligibility) reads as
 *     "Retake for a complete plan" + secondary "Save limited results".
 */

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight } from 'phosphor-react-native';
import {
  scanColors,
  scanLayout,
  scanRadius,
  scanShadows,
  scanType,
} from '@/theme/scanResultsTokens';
import type {
  ScanAnalysisResponse,
  ScanInsight,
  VisibleFinding,
} from '@/types/scanResults';
import { MAX_INSIGHT_CARDS } from '@/types/scanResults';
import { canGenerateRoutineFromScan } from '@/services/scanResults/translateAnalysis';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { ResultsHeaderBar } from './ResultsHeaderBar';
import { LimitedScanBanner } from './LimitedScanBanner';

export interface PersonalizedInsightsSlideProps {
  analysis: ScanAnalysisResponse;
  visibleFindings: VisibleFinding[];
  supportedInsights: ScanInsight[];
  limitedScan: boolean;
  onBack(): void;
  onBuildRoutine(): void;
  onRetake(): void;
}

export function PersonalizedInsightsSlide({
  analysis,
  visibleFindings,
  supportedInsights,
  limitedScan,
  onBack,
  onBuildRoutine,
  onRetake,
}: PersonalizedInsightsSlideProps) {
  // Truth-first defensive: this slide must not render without supported
  // insights AND supported findings. The parent should never route here
  // in that state; if it slips through, render nothing.
  if (supportedInsights.length === 0 || visibleFindings.length === 0) {
    return null;
  }

  const insights = supportedInsights.slice(0, MAX_INSIGHT_CARDS);
  const canBuildRoutine = canGenerateRoutineFromScan(analysis, visibleFindings);
  const ctaA11y = canBuildRoutine
    ? `Build custom routine from ${visibleFindings.length} ${
        visibleFindings.length === 1 ? 'finding' : 'findings'
      }`
    : 'Retake for a complete plan';

  const handlePrimary = () => {
    hapt.tap();
    if (canBuildRoutine) onBuildRoutine();
    else onRetake();
  };

  const ctaLabel = canBuildRoutine
    ? 'Build custom routine'
    : 'Retake for a complete plan';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ResultsHeaderBar current={3} onBack={onBack} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <LimitedScanBanner
            visible={limitedScan}
            supportedCount={visibleFindings.length}
          />

          <View style={styles.sparkleWrap}>
            <CoralMark />
          </View>

          <View style={styles.titleBlock}>
            <Text style={scanType.editorialHeading} maxFontSizeMultiplier={1.1}>
              Personalized Insights
            </Text>
            <Text style={[scanType.body, styles.subtext]} maxFontSizeMultiplier={1.2}>
              Built from your visible scan findings.
            </Text>
          </View>

          <View style={styles.cards}>
            {insights.map((ins, idx) => (
              <View key={`${ins.title}-${idx}`} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightIndex} maxFontSizeMultiplier={1.1}>
                    {String(idx + 1).padStart(2, '0')}
                  </Text>
                  <View style={styles.insightTextCol}>
                    <Text style={styles.insightTitle} maxFontSizeMultiplier={1.1}>
                      {ins.title}
                    </Text>
                    <Text style={styles.insightBody} maxFontSizeMultiplier={1.2}>
                      {ins.text}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.ctaBlock}>
          <Pressable
            onPress={handlePrimary}
            accessibilityRole="button"
            accessibilityLabel={ctaA11y}
            style={({ pressed }) => [
              styles.cta,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.1}>
              {ctaLabel}
            </Text>
            <View style={styles.ctaArrow}>
              <ArrowRight size={16} weight="bold" color={scanColors.white} />
            </View>
          </Pressable>
          <Text style={styles.ctaCaption} maxFontSizeMultiplier={1.2}>
            {canBuildRoutine
              ? 'You will confirm your products before starting.'
              : 'A clearer scan is needed before creating a personalized routine.'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// CoralMark — layered breathing coral + ink sparkle.
// ---------------------------------------------------------------------------

function CoralMark() {
  const reduceMotion = useReduceMotion();
  const halo = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      halo.value = 1;
      return;
    }
    halo.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [reduceMotion, halo]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: halo.value }],
  }));

  const rays = useSharedValue(0);
  useEffect(() => {
    rays.value = withDelay(120, withTiming(1, { duration: 520 }));
  }, [rays]);
  const raysStyle = useAnimatedStyle(() => ({ opacity: rays.value }));

  return (
    <View style={markStyles.wrap}>
      <Animated.View style={[markStyles.haloOuter, haloStyle]} />
      <View style={markStyles.haloMid} />
      <Animated.View style={[markStyles.core, raysStyle]}>
        <View style={markStyles.coreInner} />
        <View style={[markStyles.ray, markStyles.rayN]} />
        <View style={[markStyles.ray, markStyles.rayE]} />
        <View style={[markStyles.ray, markStyles.rayS]} />
        <View style={[markStyles.ray, markStyles.rayW]} />
      </Animated.View>
    </View>
  );
}

const markStyles = StyleSheet.create({
  wrap: {
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloOuter: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: scanColors.peachGlow,
    opacity: 0.45,
  },
  haloMid: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: scanColors.coralWash,
  },
  core: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: scanColors.coralStrong,
    shadowColor: '#E98973',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  ray: {
    position: 'absolute',
    width: 3,
    height: 14,
    borderRadius: 1.5,
    backgroundColor: scanColors.coralStrong,
    opacity: 0.85,
  },
  rayN: { top: 0, left: 24.5 },
  rayE: { right: 0, top: 19, transform: [{ rotate: '90deg' }] },
  rayS: { bottom: 0, left: 24.5 },
  rayW: { left: 0, top: 19, transform: [{ rotate: '90deg' }] },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: scanLayout.pageHorizontalPadding,
    paddingTop: scanLayout.pageTopGutter,
  },
  scroll: {
    paddingBottom: 220,
    alignItems: 'stretch',
  },
  sparkleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  subtext: {
    marginTop: 6,
    textAlign: 'center',
  },
  cards: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: scanColors.card,
    borderRadius: scanRadius.largeCard,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    ...scanShadows.softLift,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIndex: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 26,
    color: scanColors.coralDark,
    letterSpacing: -0.5,
    minWidth: 28,
    marginTop: -2,
  },
  insightTextCol: {
    flex: 1,
  },
  insightTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: scanColors.ink,
    marginBottom: 4,
  },
  insightBody: {
    ...scanType.body,
  },
  ctaBlock: {
    position: 'absolute',
    left: scanLayout.pageHorizontalPadding,
    right: scanLayout.pageHorizontalPadding,
    bottom: 22,
    alignItems: 'stretch',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: scanColors.coralStrong,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: scanRadius.button,
    ...scanShadows.glow,
  },
  ctaLabel: {
    ...scanType.buttonLabel,
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: scanColors.coralDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCaption: {
    ...scanType.caption,
    marginTop: 12,
    textAlign: 'center',
  },
});
