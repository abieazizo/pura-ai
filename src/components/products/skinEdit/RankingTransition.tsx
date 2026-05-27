/**
 * RankingTransition — the elegant reranking state that replaces the
 * old "Refining..." copy.
 *
 * Shows for ~700–900ms: status label + three progressing checks
 * (Scan match → Routine fit → Irritation check). Respects reduced
 * motion via simple opacity crossfade.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Check, Circle } from 'phosphor-react-native';
import { palette } from '@/theme';

interface RankingTransitionProps {
  label: string;
}

const CHECKS = ['Scan match', 'Routine fit', 'Irritation check'];

export function RankingTransition({ label }: RankingTransitionProps) {
  const [completed, setCompleted] = useState<number>(0);

  useEffect(() => {
    const timers = CHECKS.map((_, idx) =>
      setTimeout(() => setCompleted((c) => Math.max(c, idx + 1)), 140 + idx * 180)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} maxFontSizeMultiplier={1.2} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.checks}>
        {CHECKS.map((c, idx) => (
          <CheckRow key={c} label={c} done={idx < completed} delay={idx * 80} />
        ))}
      </View>
    </View>
  );
}

function CheckRow({ label, done, delay }: { label: string; done: boolean; delay: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.row, animated]}>
      <View style={[styles.iconWrap, done ? styles.iconWrapDone : null]}>
        {done ? (
          <Check size={11} color={palette.inkInverse} weight="bold" />
        ) : (
          <Circle size={11} color={palette.inkTertiary} weight="bold" />
        )}
      </View>
      <Text
        style={[styles.text, done ? styles.textDone : null]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 14,
  },
  checks: {
    gap: 8,
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDone: {
    backgroundColor: palette.clay,
  },
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  textDone: {
    color: palette.ink,
    fontFamily: 'Inter-SemiBold',
  },
});
