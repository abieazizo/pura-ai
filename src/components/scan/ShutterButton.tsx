/**
 * ShutterButton — readiness-aware capture control for the face scan.
 *
 * Replaces the old CaptureButton in face mode. Reflects the three
 * possible states the readiness machine puts us in:
 *
 *   • notReady — muted gray ring; tap shakes + nudges with copy
 *   • partial  — amber ring (lighting or framing is fixable); tap
 *                still captures, surface tells the user it's a
 *                partial scan
 *   • ready    — Pura blue ring with subtle breathing glow; tap
 *                fires the shutter with a ripple + flash
 *
 * The component is intentionally dumb — every state decision is
 * made upstream by `useScanReadiness`. The parent decides whether
 * a tap is allowed to fire `onCapture`. We only handle the visual
 * feedback.
 */

import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const OUTER = 78;
const INNER = 64;
const RING_R = (OUTER - 4) / 2;
const RING_C = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ShutterReadiness = 'not_ready' | 'partial' | 'ready';

export interface ShutterButtonProps {
  readiness: ShutterReadiness;
  /** Total seconds remaining during the post-tap countdown (null when not preparing). */
  countdown?: number | null;
  /** True while a capture is in flight; freezes the button. */
  capturing?: boolean;
  /** Called when the user taps. Always called — parent decides whether to fire. */
  onPress: () => void;
  /** Optional override label for accessibility. */
  accessibilityLabel?: string;
}

const TONE = {
  not_ready: {
    ring: 'rgba(155,174,197,0.55)',
    inner: '#F4F6FA',
    glow: 'transparent',
  },
  partial: {
    ring: '#F5B85C',
    inner: '#F4F6FA',
    glow: '#F5B85C',
  },
  ready: {
    ring: '#68D8FF',
    inner: '#F4F6FA',
    glow: '#1C8DFF',
  },
} as const;

export function ShutterButton({
  readiness,
  countdown = null,
  capturing = false,
  onPress,
  accessibilityLabel,
}: ShutterButtonProps) {
  const reduceMotion = useReduceMotion();
  const tone = TONE[readiness];
  const isPreparing = countdown !== null;

  // Idle scale shared across all states.
  const scale = useSharedValue(1);
  const innerScale = useSharedValue(1);

  // Countdown progress arc (post-tap "hold steady" beat).
  const countdownProgress = useSharedValue(0);
  useEffect(() => {
    if (isPreparing) {
      countdownProgress.value = 0;
      countdownProgress.value = withTiming(1, {
        duration: 2000,
        easing: Easing.linear,
      });
    } else {
      cancelAnimation(countdownProgress);
      countdownProgress.value = 0;
    }
  }, [isPreparing, countdownProgress]);
  const countdownArcProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - countdownProgress.value),
  }));

  // Ready-state breathing glow.
  const breathing = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || readiness !== 'ready' || isPreparing) {
      cancelAnimation(breathing);
      breathing.value = withTiming(0, { duration: 200 });
      return;
    }
    breathing.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      true
    );
    return () => cancelAnimation(breathing);
  }, [reduceMotion, readiness, isPreparing, breathing]);

  // Capture ripple — fires once on a successful ready tap.
  const ripple = useSharedValue(0);
  const flash = useSharedValue(0);
  const shake = useSharedValue(0);

  const triggerNotReady = useCallback(() => {
    // Soft press-down + sideways shake — no haptic.
    scale.value = withSequence(
      withTiming(0.94, { duration: 70 }),
      withTiming(1, { duration: 140 })
    );
    shake.value = withSequence(
      withTiming(-3, { duration: 60 }),
      withTiming(3, { duration: 60 }),
      withTiming(-2, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [scale, shake]);

  const triggerCapture = useCallback(() => {
    // Press-down + ripple + flash.
    scale.value = withSequence(
      withTiming(0.9, { duration: 70 }),
      withTiming(1, { duration: 140, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
    innerScale.value = withSequence(
      withTiming(0.86, { duration: 70 }),
      withTiming(1, { duration: 140 })
    );
    ripple.value = 0;
    ripple.value = withTiming(1, {
      duration: 340,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    flash.value = 0;
    flash.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.linear }),
      withTiming(0, { duration: 220, easing: Easing.linear })
    );
    hapt.tap();
  }, [scale, innerScale, ripple, flash]);

  const handlePress = useCallback(() => {
    if (capturing || isPreparing) return;
    if (readiness === 'not_ready') {
      triggerNotReady();
    } else {
      triggerCapture();
    }
    onPress();
  }, [capturing, isPreparing, readiness, triggerNotReady, triggerCapture, onPress]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
      { scale: scale.value * (1 + 0.035 * breathing.value) },
    ],
    opacity:
      readiness === 'not_ready'
        ? 0.85
        : 1,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      readiness === 'ready'
        ? 0.14 + 0.1 * breathing.value
        : readiness === 'partial'
        ? 0.16
        : 0,
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.38 * (1 - ripple.value),
    transform: [{ scale: 1 + 0.55 * ripple.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: 0.32 * flash.value,
  }));

  const a11y =
    accessibilityLabel ??
    (readiness === 'ready'
      ? 'Capture scan'
      : readiness === 'partial'
      ? 'Capture — partial scan possible'
      : 'Capture disabled — center your face first');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={handlePress}
      style={styles.touch}
      hitSlop={8}
      disabled={capturing || isPreparing}
    >
      {/* Outer glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            shadowColor: tone.glow,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            elevation: 12,
            borderRadius: OUTER / 2,
          },
          glowStyle,
        ]}
      />

      {/* Capture ripple — sits between the glow and the ring. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ripple,
          {
            borderColor: tone.ring,
            borderRadius: OUTER / 2,
          },
          rippleStyle,
        ]}
      />

      <Animated.View style={[styles.outer, outerStyle]}>
        <Svg width={OUTER} height={OUTER} style={StyleSheet.absoluteFillObject}>
          {/* Idle ring */}
          <Circle
            cx={OUTER / 2}
            cy={OUTER / 2}
            r={RING_R}
            stroke={tone.ring}
            strokeWidth={readiness === 'not_ready' ? 1.5 : 2.5}
            fill="transparent"
            opacity={1}
          />
          {/* Countdown overlay arc (only during preparing) */}
          {isPreparing ? (
            <AnimatedCircle
              cx={OUTER / 2}
              cy={OUTER / 2}
              r={RING_R}
              stroke="#68D8FF"
              strokeWidth={3}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${RING_C} ${RING_C}`}
              animatedProps={countdownArcProps}
              transform={`rotate(-90 ${OUTER / 2} ${OUTER / 2})`}
            />
          ) : null}
        </Svg>

        <Animated.View
          style={[
            styles.inner,
            {
              backgroundColor: tone.inner,
            },
            innerStyle,
          ]}
        >
          {countdown !== null ? (
            <Text style={styles.countdownText} allowFontScaling={false}>
              {countdown}
            </Text>
          ) : null}
        </Animated.View>

        {/* Capture flash overlay */}
        <Animated.View
          pointerEvents="none"
          style={[styles.flash, flashStyle]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: OUTER,
    height: OUTER,
    backgroundColor: 'transparent',
  },
  ripple: {
    position: 'absolute',
    width: OUTER,
    height: OUTER,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  outer: {
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    backgroundColor: '#FFFFFF',
  },
  countdownText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    color: '#0B1220',
    fontVariant: ['tabular-nums'],
  },
});
