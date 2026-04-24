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
import { palette, scanTypography } from '@/theme';
import { hapt } from '@/utils/haptics';
import { tierFor, tierLabel } from '@/utils/skinScore';
import {
  PHOTO_HEIGHT_REVEAL,
  PHOTO_MARGIN_H,
  PHOTO_Y_REVEAL,
} from '../constants';
import type { ScanFinding } from '@/types';

export interface RevealFooterProps {
  overallScore: number;
  /** Previous scan's overall score; null when this is the user's first
   *  scan. Used to render the "Up N from your last scan." line. */
  previousScore: number | null;
  findings: ScanFinding[];
  onPrimary: () => void;
  onSecondary: () => void;
  bottomInset: number;
  reduceMotion: boolean;
}

/**
 * Beat 7 reveal footer.
 *
 * v10.16 — the old "OVERALL 73 / N findings · 4 dots" stack was both
 * duplicative (the result screen re-lists findings with full context)
 * and weak (a naked number with no delta or explanation). Rebuilt as
 * a single confident score readout: "Your reading is ready." + the
 * score in a tier-labelled row ("Good · 73"). The CTA carries the
 * move into the result screen, where the full medallion, hotspots,
 * and findings live.
 *
 * v10.17 — one italic-serif context line sits under the score row:
 * "Up 4 from your last scan." / "Down 2 from your last scan." /
 * "Your first reading." Same tone as the why-line on Home and the
 * result screen. Keeps the footer concise but removes the "why am I
 * seeing just a number?" moment.
 */
export function RevealFooter({
  overallScore,
  previousScore,
  findings: _findings,
  onPrimary,
  onSecondary,
  bottomInset,
  reduceMotion,
}: RevealFooterProps) {
  const tier = tierFor(overallScore);
  const deltaLine = buildDeltaLine(overallScore, previousScore);
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
      <Animated.View style={[styles.headlineBlock, headlineStyle]}>
        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Your reading is ready.
        </Text>
        <View style={styles.scoreRow}>
          <Text style={styles.tierLabel} maxFontSizeMultiplier={1.15}>
            {tierLabel(tier)}
          </Text>
          <View style={styles.scoreDivider} />
          <Text
            style={styles.scoreNumber}
            maxFontSizeMultiplier={1.15}
            allowFontScaling
          >
            {overallScore}
          </Text>
        </View>
        <Text
          style={styles.deltaLine}
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {deltaLine}
        </Text>
      </Animated.View>

      <Animated.View style={ctaStyle}>
        <Pressable
          onPress={handlePrimary}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`See your results. Skin Score ${overallScore}, ${tierLabel(tier)}. ${deltaLine}`}
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

/**
 * Build the single context line under the score row.
 *   • No previous scan         → "Your first reading."
 *   • Delta ≥ 1 vs. previous   → "Up N from your last scan."
 *   • Delta ≤ -1 vs. previous  → "Down N from your last scan."
 *   • Delta == 0               → "Holding steady since your last scan."
 *
 * The result screen loads immediately after and adds why-line detail
 * ("Breakouts calming. Hydration still needs work."); this footer line
 * is the one-beat-earlier preview that answers "is the number good?"
 */
function buildDeltaLine(current: number, previous: number | null): string {
  if (previous === null) {
    return 'Your first reading.';
  }
  const delta = Math.round(current - previous);
  if (delta > 0) return `Up ${delta} from your last scan.`;
  if (delta < 0) return `Down ${Math.abs(delta)} from your last scan.`;
  return 'Holding steady since your last scan.';
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
  headlineBlock: {
    marginBottom: 28,
  },
  headline: {
    ...scanTypography.revealHeadline,
    color: palette.ink,
  },
  scoreRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  tierLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.inkSecondary,
  },
  scoreDivider: {
    width: 1,
    height: 14,
    backgroundColor: palette.hairline,
    alignSelf: 'center',
  },
  scoreNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
  },
  deltaLine: {
    marginTop: 10,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSecondary,
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
