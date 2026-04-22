import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion, palette, type } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CycleRingProps {
  /** Current day in the cycle, 0..totalDays. */
  day: number;
  totalDays?: number;
  /** Outer diameter. */
  size?: number;
  /** Stroke width. */
  thickness?: number;
  /** Optional label (e.g. "DAY") above the number inside the ring. */
  eyebrow?: string;
  /** Tick marks at 0 / 21 / 42 / 63 / 84 positions. */
  showTicks?: boolean;
}

/**
 * Editorial progress ring for the Progress screen hero. Shows the current
 * day of the 84-day skin cycle as a clay stroke sweeping sand ticks.
 */
export function CycleRing({
  day,
  totalDays = 84,
  size = 280,
  thickness = 10,
  eyebrow,
  showTicks = true,
}: CycleRingProps) {
  const reduceMotion = useReduceMotion();
  const ratio = Math.max(0, Math.min(1, day / totalDays));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? ratio
      : withTiming(ratio, { duration: 900, easing: motion.numberSettle.easing });
  }, [ratio, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const ticks = [0, 21, 42, 63, 84];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.clay} />
            <Stop offset="1" stopColor={palette.clayDeep} />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={palette.hairline}
          strokeWidth={thickness}
          fill="transparent"
        />

        {/* Progress */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="url(#ring-grad)"
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {showTicks
          ? ticks.map((t) => {
              const angle = (t / totalDays) * 2 * Math.PI - Math.PI / 2;
              const tx = cx + Math.cos(angle) * (radius + thickness / 2 + 10);
              const ty = cy + Math.sin(angle) * (radius + thickness / 2 + 10);
              return (
                <Circle
                  key={t}
                  cx={tx}
                  cy={ty}
                  r={t === 84 ? 3 : 2}
                  fill={palette.sand}
                />
              );
            })
          : null}
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.dayNumber} maxFontSizeMultiplier={1.1}>
          {day}
        </Text>
        <Text style={styles.totalLabel}>of {totalDays}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...type.micro,
    color: palette.clay,
  },
  dayNumber: {
    ...type.dataDisplay,
    color: palette.ink,
    fontStyle: 'italic',
  },
  totalLabel: {
    ...type.caption,
    color: palette.inkTertiary,
    marginTop: -4,
  },
});
