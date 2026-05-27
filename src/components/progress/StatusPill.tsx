/**
 * StatusPill — production-visible status indicator for Progress / Routine.
 *
 * Replaces the dev-only `AISourceBadge` ("IDLE" / "AI") with five named,
 * human-readable states sourced from the canonical ProgressRoutineInsight
 * adapter. Never leaks raw enum / dev jargon.
 *
 * States:
 *   • Updated today  — analysis is fresh (< 24h)
 *   • AI read ready  — analysis exists but is older than 24h
 *   • Analyzing      — fetch in flight; renders a pulse dot + subline
 *   • Scan needed    — no scan yet
 *   • Low confidence — image quality flagged as low
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { StatusLabel } from '@/state/progressRoutineInsight';

interface StatusPillProps {
  label: StatusLabel;
  /** Optional one-line subline (e.g. when Analyzing). */
  subline?: string | null;
}

export function StatusPill({ label, subline }: StatusPillProps) {
  const tone = toneFor(label);
  const pulse = useSharedValue(1);

  // The pulse dot is animated only when `label === 'Analyzing'`. Every
  // other state holds the dot at full opacity.
  useEffect(() => {
    if (label === 'Analyzing') {
      pulse.value = withRepeat(
        withTiming(0.35, {
          duration: 700,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 180 });
    }
  }, [label, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: tone.bg }]}>
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: tone.dot },
            label === 'Analyzing' ? dotStyle : undefined,
          ]}
        />
        <Text
          style={[styles.label, { color: tone.label }]}
          maxFontSizeMultiplier={1.15}
        >
          {label}
        </Text>
      </View>
      {subline && subline.trim().length > 0 ? (
        <Text style={styles.subline} maxFontSizeMultiplier={1.2}>
          {subline}
        </Text>
      ) : null}
    </View>
  );
}

function toneFor(label: StatusLabel): {
  bg: string;
  dot: string;
  label: string;
} {
  switch (label) {
    case 'Updated today':
      return {
        bg: palette.mossLight,
        dot: palette.mossDeep,
        label: palette.mossDeep,
      };
    case 'AI read ready':
      return {
        bg: palette.clayPaper,
        dot: palette.clay,
        label: palette.clayDeep,
      };
    case 'Analyzing':
      return {
        bg: palette.clayPaper,
        dot: palette.clay,
        label: palette.clayDeep,
      };
    case 'Scan needed':
      return {
        bg: palette.bgDeep,
        dot: palette.inkTertiary,
        label: palette.inkSecondary,
      };
    case 'Low confidence':
      return {
        bg: palette.amberLight,
        dot: palette.amberDeep,
        label: palette.amberDeep,
      };
  }
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  subline: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 12,
    letterSpacing: -0.1,
    color: palette.inkTertiary,
    maxWidth: 220,
    textAlign: 'right',
  },
});
