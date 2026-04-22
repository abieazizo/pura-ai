import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
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
import Svg, { Circle } from 'react-native-svg';
import { palette, shadow } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * PuraMark — v9 raster brand mark.
 *
 * The canonical brand asset is now the approved rendered PNG at
 * `assets/brand/pura-drop.png`. Previous SVG silhouette redraws are
 * retired. The image renders through `expo-image` for fast cache + cross-
 * platform pixel fidelity.
 *
 * API contract (preserved for ~20 call sites):
 *   variant?   — idle / scanning / complete / thinking / achievement
 *   size?      — MarkSize keyword or explicit pixels (number)
 *   color?     — deprecated no-op (the PNG carries its own hues; rasters
 *                can't be tinted meaningfully)
 *   glow?      — wraps the mark in the warm `shadow.mark` layered shadow
 *   outlined?  — deprecated no-op (SVG-only concept)
 *   onPress?   — when present, the whole mark is a Pressable
 *   style?     — merged onto the outer container
 *
 * Variants wrap motion AROUND the raster, never *of* the raster — a raster
 * is the truth; we never distort it. Ripples use SVG `Circle` in brand
 * azure; idle/breath/shimmer are overlays.
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

/**
 * The approved drop asset. Single source of truth — any other mark
 * elsewhere should be replaced with `<PuraMark />`.
 */
const DROP_ASSET = require('../../assets/brand/pura-drop.png');

export interface PuraMarkProps {
  variant?: MarkVariant;
  size?: MarkSize | number;
  /** @deprecated raster cannot be tinted; retained for API compatibility. */
  color?: string;
  /** Renders the layered `shadow.mark` glow behind the mark. */
  glow?: boolean;
  /** @deprecated SVG-only; raster has no outline variant. */
  outlined?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PuraMark({
  variant = 'idle',
  size = 'sm',
  glow = false,
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

  const haloStyle = useAnimatedStyle(() => ({
    opacity: flashScale.value * 0.6,
  }));

  // The asset is a square drop — `height === width` keeps proportions.
  const imgW = px;
  const imgH = px;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="image"
      accessibilityLabel="Pura"
    >
      {variant === 'scanning' ? (
        <>
          <Animated.View style={[styles.rippleWrap, ripple1Style]}>
            <RippleRing size={px} />
          </Animated.View>
          <Animated.View style={[styles.rippleWrap, ripple2Style]}>
            <RippleRing size={px} />
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
              height: px * 1.6,
              backgroundColor: palette.clay,
              opacity: 0.22,
            },
            haloStyle,
          ]}
        />
      ) : null}

      <Animated.View
        style={[styles.drop, bodyStyle, glow ? shadow.mark.outer : undefined]}
      >
        <Image
          source={DROP_ASSET}
          style={{ width: imgW, height: imgH }}
          contentFit="contain"
          transition={0}
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

function RippleRing({ size }: { size: number }) {
  return (
    <Svg width={size * 2} height={size * 2} viewBox="0 0 100 100">
      <Circle
        cx="50"
        cy="52"
        r="42"
        stroke={palette.clay}
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
