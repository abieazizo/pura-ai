/**
 * TopFocusAreasSlide — slide 3 of 4.
 *
 * Short summary of the highest-priority findings (at most 3). Card
 * count and contents come directly from `visibleFindings` — no
 * placeholder cards, no fake macro photography.
 */

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  scanColors,
  scanLayout,
  scanRadius,
  scanType,
} from '@/theme/scanResultsTokens';
import type {
  FaceLandmarkResult,
  ScanSummary,
  VisibleFinding,
} from '@/types/scanResults';
import { MAX_FOCUS_CARDS } from '@/types/scanResults';
import { ResultsHeaderBar } from './ResultsHeaderBar';
import { ResultsContinueButton } from './ResultsContinueButton';
import { LimitedScanBanner } from './LimitedScanBanner';
import { FocusAreaResultCard } from './FocusAreaResultCard';

export interface TopFocusAreasSlideProps {
  photoUri: string;
  geometry: FaceLandmarkResult | null;
  visibleFindings: VisibleFinding[];
  summary: ScanSummary;
  onBack(): void;
  onContinue(): void;
  limitedScan: boolean;
}

function CardReveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const offset = useSharedValue(10);
  useEffect(() => {
    opacity.value = withDelay(
      index * 90,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    offset.value = withDelay(
      index * 90,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function TopFocusAreasSlide({
  photoUri,
  geometry,
  visibleFindings,
  summary,
  onBack,
  onContinue,
  limitedScan,
}: TopFocusAreasSlideProps) {
  // Truth-first defensive: this slide must not render when there are
  // no supported findings. The parent should never route here in that
  // case; if it slips through, render nothing rather than fake content.
  if (visibleFindings.length === 0) return null;

  const cards = visibleFindings.slice(0, MAX_FOCUS_CARDS);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <ResultsHeaderBar current={2} onBack={onBack} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <LimitedScanBanner
            visible={limitedScan}
            supportedCount={visibleFindings.length}
          />

          <View style={styles.titleBlock}>
            <Text style={scanType.editorialHeading} maxFontSizeMultiplier={1.1}>
              Top Focus Areas
            </Text>
            <Text style={[scanType.body, styles.subtext]} maxFontSizeMultiplier={1.2}>
              What stood out most in your scan.
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryDot} />
              <Text style={styles.summaryText} maxFontSizeMultiplier={1.15}>
                {summary.headline}
              </Text>
            </View>
          </View>

          <View style={styles.cards}>
            {cards.map((finding, idx) => (
              <CardReveal key={finding.id} index={idx}>
                <FocusAreaResultCard
                  finding={finding}
                  photoUri={photoUri}
                  geometry={geometry}
                  suppressCrop={limitedScan}
                />
              </CardReveal>
            ))}
          </View>
        </ScrollView>

        <View style={styles.continueRow}>
          <ResultsContinueButton
            onPress={onContinue}
            accessibilityLabel="Continue to personalized insights"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

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
    paddingBottom: 100,
  },
  titleBlock: {
    marginTop: 10,
    marginBottom: 16,
  },
  subtext: {
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: scanColors.coralWash,
    borderRadius: scanRadius.pill,
    alignSelf: 'flex-start',
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: scanColors.coralStrong,
  },
  summaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: scanColors.coralDark,
    letterSpacing: 0.2,
  },
  cards: {
    gap: 14,
  },
  continueRow: {
    position: 'absolute',
    right: scanLayout.pageHorizontalPadding,
    bottom: 18,
  },
});
