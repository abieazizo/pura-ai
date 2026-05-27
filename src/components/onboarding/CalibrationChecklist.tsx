import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Check, Circle } from 'phosphor-react-native';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface CalibrationItem {
  /** Stable id used for keys + telemetry. */
  id: string;
  /** Label rendered while the row is in flight. */
  label: string;
  /** Dynamic completion phrase, e.g. "Combination". */
  completion: string;
}

export interface CalibrationChecklistProps {
  items: CalibrationItem[];
  /** Fires when the final item is checked off. */
  onComplete: () => void;
  /** Per-row appearance interval (ms). Defaults to 450ms (spec). */
  staggerMs?: number;
  /** Delay between a row appearing and its tick animating (ms). */
  checkAfterMs?: number;
  /** Initial delay before the first row enters. */
  startDelayMs?: number;
  /** Tail delay after the last check before `onComplete` fires. */
  tailDelayMs?: number;
}

/**
 * v20.0 — calibration checklist.
 *
 * Renders a vertical stack of rows that animate in one by one. Each row
 * starts with a hollow circle + "Calibrating skin type…" style label;
 * once the row's check beat fires, the circle fills with a tick and the
 * label is replaced by the dynamic completion phrase.
 *
 * Reduced-motion: replaces the spring/slide with a simple fade and skips
 * the per-row delay scaffolding (still respects ordering for screen
 * readers but compresses total duration).
 */
export function CalibrationChecklist({
  items,
  onComplete,
  staggerMs = 450,
  checkAfterMs = 180,
  startDelayMs = 300,
  tailDelayMs = 500,
}: CalibrationChecklistProps) {
  const reduceMotion = useReduceMotion();
  const [doneCount, setDoneCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((_, i) => {
      const enterAt = startDelayMs + i * staggerMs;
      timers.push(
        setTimeout(
          () => setVisibleCount((v) => Math.max(v, i + 1)),
          enterAt
        )
      );
      timers.push(
        setTimeout(
          () => setDoneCount((v) => Math.max(v, i + 1)),
          enterAt + checkAfterMs
        )
      );
    });
    const totalMs =
      startDelayMs +
      (items.length - 1) * staggerMs +
      checkAfterMs +
      tailDelayMs;
    timers.push(setTimeout(onComplete, totalMs));
    return () => timers.forEach(clearTimeout);
  }, [items, startDelayMs, staggerMs, checkAfterMs, tailDelayMs, onComplete]);

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => (
        <ChecklistRow
          key={item.id}
          item={item}
          visible={i < visibleCount}
          done={i < doneCount}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

function ChecklistRow({
  item,
  visible,
  done,
  reduceMotion,
}: {
  item: CalibrationItem;
  visible: boolean;
  done: boolean;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(reduceMotion ? 0 : 8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      if (!reduceMotion) {
        y.value = withTiming(0, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
        });
      }
    }
  }, [visible, opacity, y, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[styles.row, style]}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.icon,
          done ? styles.iconDone : styles.iconIdle,
        ]}
      >
        {done ? (
          <Check size={14} color={palette.bg} weight="bold" />
        ) : (
          <Circle size={10} color={palette.inkTertiary} weight="fill" />
        )}
      </View>
      <View style={styles.textCol}>
        <Text
          style={[styles.label, done && styles.labelDone]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {done ? item.completion : item.label}
        </Text>
        <Text
          style={styles.kicker}
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
        >
          {done ? item.label : 'Calibrating…'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 28,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 14,
    gap: 14,
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIdle: {
    backgroundColor: palette.bgDeep,
  },
  iconDone: {
    backgroundColor: palette.clay,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  labelDone: {
    color: palette.ink,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
    marginTop: 4,
  },
});
