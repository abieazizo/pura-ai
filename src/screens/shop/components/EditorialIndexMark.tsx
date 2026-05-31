/**
 * EditorialIndexMark — round-2 Pass 8 animated rebuild.
 *
 * The save/add-to-routine glyph. Neither heart nor plus.
 *
 * Idle: hairline circle with a faint two-stroke plus (vertical +
 * horizontal). Saved: hairline circle with the horizontal stroke and
 * a small "filed" dot in the upper-right. On transition idle→saved
 * the dot animates in (scale-in spring) and the vertical stroke
 * fades out — gives the mark a "filed it" gesture.
 *
 * Sizing scales from a single `size` prop. Reduced-motion-aware.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { puraShop } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface EditorialIndexMarkProps {
  size?: number;
  saved?: boolean;
}

export function EditorialIndexMark({
  size = 22,
  saved = false,
}: EditorialIndexMarkProps) {
  const reduceMotion = useReduceMotion();
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = (s - 1) / 2;
  const armLen = s * 0.28;
  const strokeColor = saved ? puraShop.coralDeep : puraShop.ink;

  // Vertical-stroke opacity (1 when idle, 0 when saved) and filed-dot
  // scale (0 when idle, 1 when saved). Drive both with Reanimated.
  const vOpacity = useSharedValue(saved ? 0 : 1);
  const dotScale = useSharedValue(saved ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      vOpacity.value = saved ? 0 : 1;
      dotScale.value = saved ? 1 : 0;
      return;
    }
    if (saved) {
      vOpacity.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      dotScale.value = withSpring(1, {
        damping: 11,
        stiffness: 240,
        mass: 0.6,
      });
    } else {
      vOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      dotScale.value = withTiming(0, {
        duration: 140,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [saved, reduceMotion, vOpacity, dotScale]);

  const verticalProps = useAnimatedProps(() => ({
    opacity: vOpacity.value,
  }));
  const dotProps = useAnimatedProps(() => ({
    r: 1.4 * dotScale.value,
  }));

  return (
    <View style={{ width: s, height: s }} pointerEvents="none">
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={saved ? 0.9 : 0.32}
          strokeWidth={1}
        />
        {/* Horizontal stroke — present in both states */}
        <Path
          d={`M${cx - armLen} ${cy} L${cx + armLen} ${cy}`}
          stroke={strokeColor}
          strokeWidth={saved ? 1.4 : 1}
          strokeLinecap="round"
        />
        {/* Vertical stroke — fades out on save */}
        <AnimatedPath
          d={`M${cx} ${cy - armLen} L${cx} ${cy + armLen}`}
          stroke={strokeColor}
          strokeWidth={1}
          strokeLinecap="round"
          animatedProps={verticalProps}
        />
        {/* Filed dot — scales in on save */}
        <AnimatedCircle
          cx={cx + r * 0.5}
          cy={cy - r * 0.5}
          fill={strokeColor}
          animatedProps={dotProps}
        />
      </Svg>
    </View>
  );
}
