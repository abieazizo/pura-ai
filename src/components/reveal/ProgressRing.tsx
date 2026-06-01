/**
 * ProgressRing — a circular progress ring drawn with static SVG props only.
 *
 * Progress is driven entirely by the `progress` prop (0..1): when the parent
 * re-renders with a new value the ring redraws. We deliberately do NOT use
 * animated SVG attributes (the `Animated.createAnimatedComponent(Circle)` +
 * `useAnimatedProps` pattern), which crashes in Expo Go. Smooth motion is the
 * parent's job — tween a state value and pass it down.
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface ProgressRingProps {
  size?: number;
  stroke?: number;
  /** 0..1 */
  progress: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function ProgressRing({
  size = 150,
  stroke = 8,
  progress,
  color,
  trackColor,
  children,
  style,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);
  const c = size / 2;

  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {/* Rotate the ring so 0% starts at 12 o'clock. The overlay children
          stay upright because they live outside the SVG. */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
