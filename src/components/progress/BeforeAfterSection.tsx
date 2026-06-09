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
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Lock, ArrowRight } from 'phosphor-react-native';
import { CompareSlider } from '@/components/CompareSlider';
import { palette, space, ds, dsElevation, dsRadius } from '@/theme';
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

        {/* Cycle 12 — two honest portrait placeholders in the same 4:5 frame
            language as the real comparison, with a soft blue wash + corner
            label, so the locked state reads as a reward waiting, not a broken
            image or a disabled box. */}
        <View style={styles.framesRow}>
          <PlaceholderFrame label="DAY 1" />
          <PlaceholderFrame label="NEXT SCAN" />
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
        <View style={styles.headText}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            BEFORE & AFTER
          </Text>
          <Text style={styles.headTitle} maxFontSizeMultiplier={1.1}>
            Your face, side by side
          </Text>
        </View>
        <View style={styles.datesPill}>
          <Text style={styles.datesText} maxFontSizeMultiplier={1.1}>
            {`Day 1`}
          </Text>
          <ArrowRight size={11} color={palette.clayDeep} weight="bold" />
          <Text style={styles.datesText} maxFontSizeMultiplier={1.1}>
            {`Day ${latestDayNumber}`}
          </Text>
        </View>
      </View>
      {/* Cycle 12 — the slider sits on a soft contact shadow so the framed
          portrait pair lifts off the porcelain as a single editorial object. */}
      <View style={[styles.fullBleed, { marginHorizontal: -space.lg }]}>
        <View style={styles.sliderLift}>
          <CompareSlider
            leftUri={comparison.beforeUri}
            rightUri={comparison.afterUri}
            leftLabel="DAY 1"
            rightLabel={`DAY ${latestDayNumber}`}
            width={width}
            height={compareHeight}
          />
        </View>
      </View>
      <Text style={styles.caption} maxFontSizeMultiplier={1.15}>
        {comparison.caption}
      </Text>
    </View>
  );
}

/** An honest 4:5 portrait placeholder for the locked before/after empty state. */
function PlaceholderFrame({ label }: { label: string }) {
  return (
    <View style={styles.frame}>
      <LinearGradient
        pointerEvents="none"
        colors={[palette.clayPaper, palette.bgDeep]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.frameLockBadge}>
        <Lock size={15} color={palette.clayDeep} weight="duotone" />
      </View>
      <Text style={styles.frameLabel} maxFontSizeMultiplier={1.1}>
        {label}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: space.md,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  headText: {
    flex: 1,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  headTitle: {
    // Cycle 12 — an editorial serif line so the section announces the imagery,
    // not just a tiny caps kicker over a raw slider.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    color: palette.ink,
    marginTop: 3,
  },
  datesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: dsRadius.pill,
    backgroundColor: palette.clayPaper,
  },
  datesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: palette.clayDeep,
    fontVariant: ['tabular-nums'],
  },
  fullBleed: {
    marginTop: 4,
  },
  // Soft contact shadow under the full-bleed slider so the framed portrait
  // pair lifts as one editorial object on the porcelain page.
  sliderLift: {
    borderRadius: dsRadius.xl,
    ...dsElevation.e3,
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
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
    ...dsElevation.e2,
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
    // Cycle 12 — a real 4:5 portrait frame (matches the live comparison ratio)
    // with a soft clay→ice wash + brand hairline, so the locked state reads as
    // a framed photo waiting to develop, not a dashed empty box.
    flex: 1,
    aspectRatio: 4 / 5,
    borderRadius: dsRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.clay,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...dsElevation.e1,
  },
  frameLockBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ds.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.clay,
  },
  frameLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.clayDeep,
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
