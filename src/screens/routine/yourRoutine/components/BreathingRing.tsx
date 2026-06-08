/**
 * BreathingRing — the absorb timer, reimagined as breathing, not counting.
 *
 * A thin ring fills slowly over `absorbSeconds` (no number, no ticking), so
 * waiting for a product to settle feels like a held breath rather than a
 * deadline. Pausable and resumable. `CardBreath` is the paired near-invisible
 * card breath (scale 1.0→1.012→1.0 over 4s) so the whole step breathes with it.
 *
 * Reduced motion: the ring renders calm and full, and completion is offered as
 * a tap — never a forced animated wait.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BreathingRingProps {
  size: number;
  absorbSeconds: number;
  color: string;
  trackColor: string;
  running: boolean;
  reduceMotion: boolean;
  onComplete?: () => void;
}

export function BreathingRing({
  size,
  absorbSeconds,
  color,
  trackColor,
  running,
  reduceMotion,
  onComplete,
}: BreathingRingProps) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    if (!running) {
      cancelAnimation(progress); // freeze where it is (pause)
      return;
    }
    const remaining = Math.max(0.2, absorbSeconds * (1 - progress.value));
    progress.value = withTiming(
      1,
      { duration: remaining * 1000, easing: Easing.inOut(Easing.ease) },
      (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      },
    );
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduceMotion, absorbSeconds]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={animatedProps}
          // start at 12 o'clock, fill clockwise
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

/** A near-invisible breath on a step card — the wait feels like breathing. */
export function CardBreath({
  reduceMotion,
  children,
  style,
}: {
  reduceMotion: boolean;
  children: React.ReactNode;
  style?: object;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion, t]);
  const breath = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.012 }] }));
  return <Animated.View style={[style, breath]}>{children}</Animated.View>;
}

export const ringStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
