import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { palette } from '@/theme';

export interface OnboardingProgressBarProps {
  current: number;
  total: number;
  visible: boolean;
  /**
   * v20.0 — short section label rendered above the bar, e.g.
   * "Skin profile". Combined with current/total it renders as
   * "Step 3 of 8 · Skin profile".
   */
  sectionLabel?: string;
}

const SPRING = { damping: 22, stiffness: 140, mass: 1 };

/**
 * v20.0 onboarding progress.
 *
 * Two-line indicator:
 *   STEP 3 OF 8 · SKIN PROFILE
 *   ━━━━━━━━━━━━━━━━━━━━ ░░░░░░░░░░
 *
 * Track + fill render at 4pt with rounded ends. When `sectionLabel` is
 * omitted the bar shows alone (legacy behavior preserved).
 */
export function OnboardingProgressBar({
  current,
  total,
  visible,
  sectionLabel,
}: OnboardingProgressBarProps) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = withSpring(ratio, SPRING);
  }, [ratio, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={
        sectionLabel
          ? `Step ${current} of ${total}, ${sectionLabel}`
          : `Step ${current} of ${total}`
      }
    >
      {sectionLabel ? (
        <Text
          style={styles.label}
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
        >
          {`Step ${current} of ${total}  ·  ${sectionLabel}`}
        </Text>
      ) : null}
      <View style={styles.bar}>
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
    marginBottom: 8,
    textAlign: 'left',
  },
  bar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.hairline,
    borderRadius: 2,
  },
  fill: {
    height: 4,
    backgroundColor: palette.clay,
    borderRadius: 2,
  },
});
