import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { palette, shadow } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * PuraMark — v8 cool-system rebuild.
 *
 * A single-weight teardrop silhouette, monochrome, tintable via the `color`
 * prop. No gradients, no glass effects, no multi-color splits — those are
 * all anti-patterns for the "premium, restrained, clinical-luxurious"
 * direction. The mark reads crisply from 14pt (inline bullet) to 160pt
 * (splash hero).
 *
 * API preserved from v7 — every existing call site (HomeHeader, splash,
 * ProductsScreen header, tab bar, etc.) continues to work unchanged.
 *
 * Variants
 *   idle        — imperceptible breathing (scale 1 → 1.012 → 1, 4s loop)
 *   scanning    — two concentric rings expand outward, 500ms apart
 *   complete    — one-shot: gentle scale-flash (1 → 1.08 → 1) + brief glow
 *   thinking    — slow tempo-breathing at half speed
 *   achievement — one-shot: soft shimmer sweep left → right
 *
 * Reduce Motion halts every animation and renders the static silhouette.
 */

export type MarkVariant =
  | 'idle'
  | 'scanning'
  | 'complete'
  | 'thinking'
  | 'achievement';

export type MarkSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<MarkSize, number> = {
  xs: 18,
  sm: 26,
  md: 38,
  lg: 72,
  hero: 152,
};

// Drop path — authored in a 40×52 viewbox, scales cleanly.
// Sharp apex at (20, 2), rounded belly between y=34 and y=50.
// Two cubic curves meet at the top to produce a clean point.
const DROP_PATH =
  'M 20 2 C 20 2 35 22 35 34 C 35 44 28 50 20 50 C 12 50 5 44 5 34 C 5 22 20 2 20 2 Z';

const VIEWBOX_W = 40;
const VIEWBOX_H = 52;

export interface PuraMarkProps {
  variant?: MarkVariant;
  size?: MarkSize | number;
  /** Fill color. Defaults to brand azure. */
  color?: string;
  /** If true, renders an azure glow halo behind the mark. */
  glow?: boolean;
  /** Outline variant — 1.5pt stroke, no fill. Handy for header placements. */
  outlined?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PuraMark({
  variant = 'idle',
  size = 'sm',
  color = palette.clay,
  glow = false,
  outlined = false,
  style,
}: PuraMarkProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const reduceMotion = useReduceMotion();

  const breath = useSharedValue(0);
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);
  const flashScale = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    const all = [breath, ripple1, ripple2, flashScale, shimmer];
    all.forEach(cancelAnimation);

    if (reduceMotion) {
      breath.value = 0.5;
      return;
    }

    if (variant === 'idle') {
      breath.value = withRepeat(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    if (variant === 'thinking') {
      breath.value = withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    if (variant === 'scanning') {
      const ringLoop = () =>
        withRepeat(
          withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
          -1,
          false
        );
      ripple1.value = ringLoop();
      ripple2.value = withDelay(500, ringLoop());
      breath.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    if (variant === 'complete') {
      flashScale.value = withSequence(
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
      );
    }

    if (variant === 'achievement') {
      shimmer.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
    }

    return () => {
      all.forEach(cancelAnimation);
    };
  }, [variant, reduceMotion, breath, ripple1, ripple2, flashScale, shimmer]);

  const bodyStyle = useAnimatedStyle(() => {
    const scaleFromBreath = 1 + 0.012 * breath.value;
    const scaleFromFlash = 1 + 0.08 * flashScale.value;
    return {
      transform: [{ scale: scaleFromBreath * scaleFromFlash }],
    };
  });

  const ripple1Style = useRippleStyle(ripple1);
  const ripple2Style = useRippleStyle(ripple2);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - Math.abs(0.5 - shimmer.value) * 2),
    transform: [{ translateX: (shimmer.value - 0.5) * px * 1.4 }],
  }));

  // Complete-variant halo — briefly brighter glow behind the drop.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: flashScale.value * 0.6,
  }));

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="image"
      accessibilityLabel="Pura"
    >
      {variant === 'scanning' ? (
        <>
          <Animated.View style={[styles.rippleWrap, ripple1Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
          <Animated.View style={[styles.rippleWrap, ripple2Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
        </>
      ) : null}

      {variant === 'complete' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.haloDisc,
            {
              width: px * 1.6,
              height: px * 1.6 * (VIEWBOX_H / VIEWBOX_W),
              backgroundColor: color,
              opacity: 0.25,
            },
            haloStyle,
          ]}
        />
      ) : null}

      <Animated.View style={[styles.drop, bodyStyle]}>
        <DropShape
          size={px}
          color={color}
          glow={glow}
          outlined={outlined}
        />

        {variant === 'achievement' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBand,
              {
                width: px * 0.4,
                height: px * 2,
                backgroundColor: palette.inkInverse,
              },
              shimmerStyle,
            ]}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

function DropShape({
  size,
  color,
  glow,
  outlined,
}: {
  size: number;
  color: string;
  glow: boolean;
  outlined: boolean;
}) {
  const w = size;
  const h = size * (VIEWBOX_H / VIEWBOX_W);
  return (
    <Svg
      width={w}
      height={h}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      style={glow ? shadow.mark.outer : undefined}
    >
      <Path
        d={DROP_PATH}
        fill={outlined ? 'none' : color}
        stroke={outlined ? color : 'none'}
        strokeWidth={outlined ? 1.5 : 0}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RippleRing({ size, color }: { size: number; color: string }) {
  return (
    <Svg
      width={size * 2}
      height={size * 2}
      viewBox="0 0 100 100"
    >
      <Circle
        cx="50"
        cy="52"
        r="42"
        stroke={color}
        strokeOpacity={0.38}
        strokeWidth={1.25}
        fill="transparent"
      />
    </Svg>
  );
}

function useRippleStyle(v: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: 1 - v.value,
    transform: [{ scale: 0.4 + v.value * 1.15 }],
  }));
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  drop: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  rippleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloDisc: {
    ...StyleSheet.absoluteFillObject,
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: 999,
  },
  shimmerBand: {
    position: 'absolute',
    top: '-30%',
    left: '-40%',
    transform: [{ rotate: '18deg' }],
    opacity: 0.4,
  },
});
