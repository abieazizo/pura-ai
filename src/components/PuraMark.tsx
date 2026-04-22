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
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { palette, shadow } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export type MarkVariant =
  | 'idle'
  | 'scanning'
  | 'complete'
  | 'thinking'
  | 'achievement';

export type MarkSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<MarkSize, number> = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 80,
  hero: 160,
};

export interface PuraMarkProps {
  variant?: MarkVariant;
  size?: MarkSize | number;
  color?: string;
  glow?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Pura signature. A coral droplet with five animated states. Rendered
 * top-left on every screen at `sm` size by default.
 *
 * State choreography
 *   idle        — gentle breathing (scale 1.0 → 1.015 over 4s)
 *   scanning    — three concentric ripples expand outward, 400ms apart
 *   complete    — one-shot: splits into 4 zone dots, rotates 15°, reforms
 *   thinking    — morphs toward a speech-bubble shape (subtle)
 *   achievement — one-shot: shimmer sweep left-to-right over the fill
 *
 * Respects AccessibilityInfo reduce-motion by falling back to a static render.
 */
export function PuraMark({
  variant = 'idle',
  size = 'sm',
  color = palette.clay,
  glow = false,
  onPress,
  style,
}: PuraMarkProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const reduceMotion = useReduceMotion();

  // Shared values
  const breath = useSharedValue(0); // 0..1
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);
  const ripple3 = useSharedValue(0);
  const rotate = useSharedValue(0);
  const splitProgress = useSharedValue(0); // 0..1 for complete variant
  const thinkMorph = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Cancel everything when variant changes
    [breath, ripple1, ripple2, ripple3, rotate, splitProgress, thinkMorph, shimmer].forEach(
      cancelAnimation
    );

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

    if (variant === 'scanning') {
      const loop = () =>
        withRepeat(
          withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),
          -1,
          false
        );
      ripple1.value = loop();
      ripple2.value = withDelay(400, loop());
      ripple3.value = withDelay(800, loop());
      breath.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    if (variant === 'complete') {
      splitProgress.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.cubic) })
      );
      rotate.value = withSequence(
        withTiming(15, { duration: 400 }),
        withTiming(0, { duration: 400 })
      );
    }

    if (variant === 'thinking') {
      thinkMorph.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }

    if (variant === 'achievement') {
      shimmer.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
    }

    return () => {
      [breath, ripple1, ripple2, ripple3, rotate, splitProgress, thinkMorph, shimmer].forEach(
        cancelAnimation
      );
    };
  }, [variant, reduceMotion, breath, ripple1, ripple2, ripple3, rotate, splitProgress, thinkMorph, shimmer]);

  const bodyAnimated = useAnimatedStyle(() => {
    const scale = 1 + 0.015 * breath.value;
    const skew = thinkMorph.value * 0.08; // lean toward bubble shape
    return {
      transform: [
        { scale },
        { rotate: `${rotate.value}deg` },
        { scaleX: 1 + skew },
      ],
    };
  });

  const ripple1Style = useAnimatedRippleStyle(ripple1, px);
  const ripple2Style = useAnimatedRippleStyle(ripple2, px);
  const ripple3Style = useAnimatedRippleStyle(ripple3, px);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - Math.abs(0.5 - shimmer.value) * 2),
    transform: [{ translateX: (shimmer.value - 0.5) * px * 1.4 }],
  }));

  const splitDotStyle = useAnimatedStyle(() => ({
    opacity: splitProgress.value,
  }));

  const droplet = (
    <Animated.View style={[styles.inner, bodyAnimated]}>
      <DropletShape size={px} color={color} glow={glow} />

      {/* Achievement shimmer sweep */}
      {variant === 'achievement' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerBand,
            { width: px * 0.4, height: px * 2, backgroundColor: palette.bg },
            shimmerStyle,
          ]}
        />
      )}

      {/* Complete: 4 zone dots that fan out and back */}
      {variant === 'complete' && (
        <SplitDots size={px} progress={splitProgress} style={splitDotStyle} />
      )}
    </Animated.View>
  );

  const body = onPress ? (
    <View style={[styles.container, style]} accessibilityRole="button" accessibilityLabel="Pura mark">
      {variant === 'scanning' && (
        <>
          <Animated.View style={[styles.ripple, ripple1Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
          <Animated.View style={[styles.ripple, ripple2Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
          <Animated.View style={[styles.ripple, ripple3Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
        </>
      )}
      {droplet}
    </View>
  ) : (
    <View style={[styles.container, style]}>
      {variant === 'scanning' && (
        <>
          <Animated.View style={[styles.ripple, ripple1Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
          <Animated.View style={[styles.ripple, ripple2Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
          <Animated.View style={[styles.ripple, ripple3Style]}>
            <RippleRing size={px} color={color} />
          </Animated.View>
        </>
      )}
      {droplet}
    </View>
  );

  return body;
}

/**
 * The droplet shape itself. Path data is a single asymmetric teardrop —
 * wider at the bottom, tapered at the top, with a subtle highlight that
 * gives it a sense of material.
 */
function DropletShape({
  size,
  color,
  glow,
}: {
  size: number;
  color: string;
  glow: boolean;
}) {
  // Path is authored in a 40×52 viewbox. Scales cleanly.
  const path =
    'M20 2 C 12 14, 4 22, 4 34 C 4 44, 11 50, 20 50 C 29 50, 36 44, 36 34 C 36 22, 28 14, 20 2 Z';
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 40 52" style={glow ? shadow.mark.outer : undefined}>
      <Defs>
        <LinearGradient id="dropletGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
        <LinearGradient id="dropletHighlight" x1="0.2" y1="0.1" x2="0.5" y2="0.6">
          <Stop offset="0" stopColor={palette.inkInverse} stopOpacity={0.35} />
          <Stop offset="1" stopColor={palette.inkInverse} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={path} fill="url(#dropletGradient)" />
      <Path d={path} fill="url(#dropletHighlight)" />
    </Svg>
  );
}

function RippleRing({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size * 2} height={size * 2} viewBox="0 0 100 100">
      <Circle
        cx="50"
        cy="50"
        r="44"
        stroke={color}
        strokeOpacity={0.5}
        strokeWidth={2}
        fill="transparent"
      />
    </Svg>
  );
}

const ZONE_ANGLES = [0, 90, 180, 270] as const;
const ZONE_COLORS = [palette.clay, palette.moss, palette.amber, palette.sand] as const;

function SplitDots({
  size,
  progress,
  style,
}: {
  size: number;
  progress: Animated.SharedValue<number>;
  style: any;
}) {
  const distance = size * 0.6;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {ZONE_ANGLES.map((angle, i) => (
        <SplitDot
          key={angle}
          angle={angle}
          color={ZONE_COLORS[i]}
          size={size}
          distance={distance}
          progress={progress}
        />
      ))}
    </Animated.View>
  );
}

function SplitDot({
  angle,
  color,
  size,
  distance,
  progress,
}: {
  angle: number;
  color: string;
  size: number;
  distance: number;
  progress: Animated.SharedValue<number>;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const r = progress.value * distance;
    return {
      transform: [
        { translateX: r * Math.cos((angle * Math.PI) / 180) },
        { translateY: r * Math.sin((angle * Math.PI) / 180) },
        { scale: progress.value },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.splitDot,
        {
          backgroundColor: color,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
        },
        dotStyle,
      ]}
    />
  );
}

function useAnimatedRippleStyle(v: Animated.SharedValue<number>, px: number) {
  return useAnimatedStyle(() => ({
    opacity: 1 - v.value,
    transform: [{ scale: 0.4 + v.value * 1.1 }],
  }));
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitDot: {
    position: 'absolute',
  },
  shimmerBand: {
    position: 'absolute',
    top: '-30%',
    left: '-40%',
    transform: [{ rotate: '18deg' }],
    opacity: 0.4,
  },
});
