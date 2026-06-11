/**
 * NextStepCard — the single focal point of Home.
 *
 * One card, one action: the REAL next-product packshot (resolved through the
 * shop catalog, offline-safe), the step name, a small spec line naming the
 * product to pick up, and one clear Start — a Pura-Blue circle. The whole
 * card is the button; the circle is the cue.
 *
 * The scan / setup variants (no routine yet) keep the same shape so the eye
 * always lands in the same place: title, spec, blue circle.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ArrowRight } from 'phosphor-react-native';
import {
  dsElevation,
  dsRadius,
  dsSpace,
  dsType,
  puraAssist,
} from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { resolveRoutineProductImage } from '@/screens/routine/pura/companion/productImage';
import type { DailyHomeFocus } from './dailyHomeModel';

const PACKSHOT = 68;
const CIRCLE = 52;

export function NextStepCard({
  focus,
  onStart,
}: {
  focus: DailyHomeFocus;
  onStart: () => void;
}) {
  const source =
    focus.kind === 'step'
      ? resolveRoutineProductImage(focus.product ?? undefined)
      : undefined;

  // Press response — a soft settle under the finger, on the UI thread.
  // Reduce Motion keeps the card still (the press still works).
  const reduce = useReduceMotion();
  const press = useSharedValue(0);
  const onPressIn = useCallback(() => {
    if (!reduce) press.value = withSpring(1, { damping: 22, stiffness: 360 });
  }, [reduce, press]);
  const onPressOut = useCallback(() => {
    if (!reduce) press.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, [reduce, press]);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.018 }],
  }));

  return (
    <Animated.View style={pressStyle}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Start. ${focus.title}. ${focus.spec}`}
      onPress={onStart}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.card}
    >
      {source ? (
        <View style={styles.shotWrap}>
          <View pointerEvents="none" style={styles.contact} />
          <Image
            source={source}
            style={styles.shot}
            contentFit="contain"
            transition={180}
          />
        </View>
      ) : null}

      <View style={styles.copy}>
        <Text style={styles.title}>{focus.title}</Text>
        <Text style={styles.spec} numberOfLines={2}>
          {focus.spec}
        </Text>
      </View>

      <View style={styles.start}>
        <ArrowRight size={22} color={puraAssist.onBlue} weight="bold" />
      </View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.base,
    backgroundColor: puraAssist.surface,
    borderRadius: dsRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraAssist.border,
    padding: dsSpace.lg,
    ...dsElevation.e2,
  },
  shotWrap: {
    width: PACKSHOT,
    height: PACKSHOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shot: { width: PACKSHOT, height: PACKSHOT },
  // Soft contact shadow so the packshot rests on the card instead of floating.
  contact: {
    position: 'absolute',
    bottom: 2,
    width: PACKSHOT * 0.62,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 26, 47, 0.12)',
    transform: [{ scaleX: 1.4 }],
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    ...dsType.subhead,
    color: puraAssist.ink,
  },
  spec: {
    ...dsType.caption,
    color: puraAssist.muted,
    marginTop: 3,
  },
  start: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: puraAssist.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
