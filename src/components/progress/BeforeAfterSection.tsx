/**
 * BeforeAfterSection — gated comparison slider with honest empty state.
 *
 * Renders the polished comparison only when both photos exist (the
 * adapter computes that gate). Otherwise renders an intentional empty
 * card — never a blank gray panel or fake slider.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Camera, Lock } from 'phosphor-react-native';
import { CompareSlider } from '@/components/CompareSlider';
import { palette, space } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

interface Props {
  comparison: ProgressRoutineInsight['comparison'];
  /** Day number to render in the right-hand label. */
  latestDayNumber: number;
  compareHeight?: number;
  /** v23.3 — fired when the empty-state user taps "Take comparison scan". */
  onTakeScan?: () => void;
  /** v23.3 — fired when the user taps "How to get consistent photos". */
  onShowTips?: () => void;
}

export function BeforeAfterSection({
  comparison,
  latestDayNumber,
  compareHeight = 420,
  onTakeScan,
  onShowTips,
}: Props) {
  const { width } = useWindowDimensions();

  if (
    !comparison.canShowImages ||
    !comparison.beforeUri ||
    !comparison.afterUri
  ) {
    // v23.3 — reward-framed empty state. Two placeholder frames,
    // motivating headline, real CTAs. No more flat gray panel.
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyKicker} maxFontSizeMultiplier={1.1}>
          BEFORE & AFTER
        </Text>
        <Text style={styles.emptyHeadline} maxFontSizeMultiplier={1.15}>
          Take one more consistent scan to unlock your first comparison.
        </Text>
        <Text style={styles.emptyBody} maxFontSizeMultiplier={1.2}>
          Pura will align your scans so you can compare real changes — not
          lighting tricks.
        </Text>

        <View style={styles.framesRow}>
          <View style={styles.frame}>
            <Lock size={14} color={palette.inkTertiary} weight="duotone" />
            <Text style={styles.frameLabel} maxFontSizeMultiplier={1.1}>
              DAY 1
            </Text>
          </View>
          <View style={styles.frame}>
            <Lock size={14} color={palette.inkTertiary} weight="duotone" />
            <Text style={styles.frameLabel} maxFontSizeMultiplier={1.1}>
              NEXT SCAN
            </Text>
          </View>
        </View>

        {onTakeScan ? (
          <Pressable
            onPress={() => {
              hapt.tap();
              onTakeScan();
            }}
            accessibilityRole="button"
            accessibilityLabel="Take comparison scan"
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Camera size={14} color={palette.inkInverse} weight="duotone" />
            <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
              Take comparison scan
            </Text>
          </Pressable>
        ) : null}
        {onShowTips ? (
          <Pressable
            onPress={() => {
              hapt.select();
              onShowTips();
            }}
            accessibilityRole="button"
            accessibilityLabel="How to get consistent photos"
            hitSlop={6}
            style={({ pressed }) => [
              styles.secondaryLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.secondaryLinkText} maxFontSizeMultiplier={1.15}>
              How to get consistent photos
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          BEFORE & AFTER
        </Text>
        <Text style={styles.dates} maxFontSizeMultiplier={1.1}>
          {`Day 1 → Day ${latestDayNumber}`}
        </Text>
      </View>
      <View style={[styles.fullBleed, { marginHorizontal: -space.lg }]}>
        <CompareSlider
          leftUri={comparison.beforeUri}
          rightUri={comparison.afterUri}
          leftLabel="DAY 1"
          rightLabel={`DAY ${latestDayNumber}`}
          width={width}
          height={compareHeight}
        />
      </View>
      <Text style={styles.caption} maxFontSizeMultiplier={1.15}>
        {comparison.caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: space.xxl,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.md,
    paddingHorizontal: space.lg,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  dates: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: palette.clayDeep,
    fontVariant: ['tabular-nums'],
  },
  fullBleed: {
    marginTop: 4,
  },
  caption: {
    marginTop: 12,
    marginHorizontal: space.lg,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
  },
  empty: {
    marginTop: space.xxl,
    marginHorizontal: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  emptyKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyHeadline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 16,
  },
  // v23.3 — two soft locked frames so the empty state reads as a
  // reward waiting to unlock, not a disabled feature.
  framesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  frame: {
    flex: 1,
    aspectRatio: 0.78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderStyle: 'dashed',
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  frameLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  primaryCta: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryLink: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
    textDecorationLine: 'underline',
  },
});
