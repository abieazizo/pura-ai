/**
 * ScoreBreakdownBars — five thin horizontal bars, one per dimension.
 *
 * Animated fill on mount: each bar fills 0 → value over 900ms with a
 * 70ms stagger.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { ScoreBreakdownV2 } from '@/types/scanResultV2';

const BAR_COLOR = '#5B7B9A';
const TRACK_COLOR = 'rgba(60,40,30,0.08)';

const LABEL_ORDER: Array<keyof ScoreBreakdownV2> = [
  'hydration',
  'texture',
  'tone',
  'clarity',
  'vitality',
];

// Title-case display names — more legible than ALL CAPS at 12px.
const LABEL_DISPLAY: Record<keyof ScoreBreakdownV2, string> = {
  hydration: 'Hydration',
  texture:   'Texture',
  tone:      'Tone',
  clarity:   'Clarity',
  vitality:  'Vitality',
};

export interface ScoreBreakdownBarsProps {
  breakdown: ScoreBreakdownV2;
}

export function ScoreBreakdownBars({ breakdown }: ScoreBreakdownBarsProps) {
  // Defensive: a stale persisted scan can have a partial
  // score_breakdown that's missing keys. `Math.min(100, undefined)`
  // returns NaN, which propagates into Reanimated and surfaces as a
  // crash on some platforms.
  const safe = (v: unknown): number => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  };
  return (
    <View style={styles.column}>
      {LABEL_ORDER.map((key, i) => (
        <BarRow
          key={key}
          label={LABEL_DISPLAY[key]}
          value={safe(breakdown?.[key])}
          delay={i * 70}
        />
      ))}
    </View>
  );
}

function BarRow({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(
      delay,
      withTiming(value / 100, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [fill, value, delay]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.label} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animStyle]} />
      </View>
      <Text style={styles.value} maxFontSizeMultiplier={1.2}>
        {Math.round(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    letterSpacing: 0.2,
    color: '#4A3D35',
    width: 78,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: TRACK_COLOR,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: BAR_COLOR,
    borderRadius: 2,
  },
  value: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#4A3D35',
    width: 28,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
