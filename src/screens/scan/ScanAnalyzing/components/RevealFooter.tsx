/**
 * Beat 7 reveal. Anchored to the compressed photo's bottom + 24pt gap so
 * it lands device-independent (no hard-coded y pixel).
 *
 * Entry animation:
 *   headline row  — 400ms fade + 12pt rise from mount
 *   CTA block     — same, delayed 200ms so the eye reads headline → score
 *                    → CTA in sequence rather than all at once.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight } from 'phosphor-react-native';
import { analysisMarkers, palette, scanTypography } from '@/theme';
import { hapt } from '@/utils/haptics';
import {
  PHOTO_HEIGHT_REVEAL,
  PHOTO_MARGIN_H,
  PHOTO_Y_REVEAL,
} from '../constants';
import type { ScanFinding } from '@/types';

export interface RevealFooterProps {
  overallScore: number;
  findings: ScanFinding[];
  onPrimary: () => void;
  onSecondary: () => void;
  bottomInset: number;
  reduceMotion: boolean;
}

export function RevealFooter({
  overallScore,
  findings,
  onPrimary,
  onSecondary,
  bottomInset,
  reduceMotion,
}: RevealFooterProps) {
  const headlineOpacity = useSharedValue(0);
  const headlineTY = useSharedValue(12);
  const ctaOpacity = useSharedValue(0);
  const ctaTY = useSharedValue(8);

  useEffect(() => {
    if (reduceMotion) {
      headlineOpacity.value = 1;
      headlineTY.value = 0;
      ctaOpacity.value = 1;
      ctaTY.value = 0;
      return;
    }
    headlineOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    headlineTY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    ctaOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    ctaTY.value = withDelay(
      200,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [reduceMotion, headlineOpacity, headlineTY, ctaOpacity, ctaTY]);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTY.value }],
  }));

  const handlePrimary = () => {
    hapt.medium();
    onPrimary();
  };
  const handleSecondary = () => {
    hapt.select();
    onSecondary();
  };

  return (
    <View style={[styles.root, { paddingBottom: bottomInset + 24 }]}>
      <Animated.View style={[styles.headlineRow, headlineStyle]}>
        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Your reading{'\n'}is ready.
        </Text>
        <View style={styles.overallBadge}>
          <Text style={styles.overallKicker} maxFontSizeMultiplier={1.1}>
            OVERALL
          </Text>
          <Text
            style={styles.overallNumber}
            maxFontSizeMultiplier={1.15}
            allowFontScaling
          >
            {overallScore}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.separator} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText} maxFontSizeMultiplier={1.2}>
          {findings.length} findings
        </Text>
        <View style={styles.summaryDots}>
          {findings.slice(0, 4).map((f, i) => (
            <View
              key={i}
              style={[
                styles.summaryDot,
                { backgroundColor: analysisMarkers[f.type] },
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View style={ctaStyle}>
        <Pressable
          onPress={handlePrimary}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`See your results. Overall score ${overallScore}.`}
        >
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            See your results
          </Text>
          <ArrowRight size={18} weight="duotone" color={palette.bg} />
        </Pressable>

        <Pressable
          onPress={handleSecondary}
          style={({ pressed }) => [
            styles.secondaryLink,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Take another scan"
          hitSlop={8}
        >
          <Text style={styles.secondaryLinkText} maxFontSizeMultiplier={1.15}>
            Take another scan
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Photo compressed bottom = PHOTO_Y_REVEAL + PHOTO_HEIGHT_REVEAL;
// leave a 24pt breath then begin the reveal stack.
const TOP_OFFSET = PHOTO_Y_REVEAL + PHOTO_HEIGHT_REVEAL + 24;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: TOP_OFFSET,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: PHOTO_MARGIN_H,
  },
  headlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headline: {
    ...scanTypography.revealHeadline,
    color: palette.ink,
    flex: 1,
    marginRight: 16,
  },
  overallBadge: {
    alignItems: 'flex-end',
  },
  overallKicker: {
    ...scanTypography.revealOverallKicker,
    color: palette.inkTertiary,
    marginBottom: 2,
  },
  overallNumber: {
    ...scanTypography.revealOverallNumber,
    color: palette.clay,
  },
  separator: {
    height: 1,
    backgroundColor: palette.hairline,
    marginVertical: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  summaryText: {
    ...scanTypography.revealSummary,
    color: palette.inkSecondary,
  },
  summaryDots: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  primaryCta: {
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: palette.clay,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: palette.bg,
  },
  secondaryLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    height: 32,
  },
  secondaryLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkTertiary,
    textDecorationLine: 'underline',
  },
});
