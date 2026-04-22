import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { tierFor, tierLabel, type SkinScoreTier } from '@/utils/skinScore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * SkinScoreDial — the Skin Score as an iconic product object.
 *
 * A 240° arc gauge with the score number centered inside. Arc color is
 * tier-aware (strong/good → brand azure, fair → amber, needs-work →
 * rust). A subtle radial glow behind the dial keys its visual weight to
 * the tier: strong reads the brightest.
 *
 * On mount, two animations run in parallel:
 *   1. The arc fills from 0 → `value` over 1100ms, ease-out cubic
 *   2. The displayed number ticks 0 → `value` over 900ms, synced to the
 *      arc via useAnimatedReaction
 *
 * Sizes: pass `size` in px (outer dial width/height). A compact 160pt
 * works on Home; Progress uses 240pt for the full hero. Typography
 * inside the dial scales proportionally to `size`.
 */

export interface SkinScoreDialProps {
  /** 0..100 */
  value: number;
  /** Outer diameter in pixels. Default 220. */
  size?: number;
  /** Show the tier label below the number inside the dial. Default true. */
  showTier?: boolean;
  /** Delay before the fill animation begins, in ms. */
  delay?: number;
}

const GAP_DEG = 120; // opens a 120° gap at the bottom — dial is 240° visible

export function SkinScoreDial({
  value,
  size = 220,
  showTier = true,
  delay = 120,
}: SkinScoreDialProps) {
  const strokeWidth = Math.max(6, Math.round(size * 0.042));
  // The rendered SVG viewport uses a padded radius so the stroke doesn't clip.
  const R = size / 2 - strokeWidth;
  const CX = size / 2;
  const CY = size / 2;
  const circumference = 2 * Math.PI * R;
  const visibleArc = circumference * ((360 - GAP_DEG) / 360);
  const gapArc = circumference - visibleArc;

  // Rotation: place the gap at the bottom. With our dasharray setup the arc
  // starts from 3 o'clock and runs clockwise, so we rotate by (90 +
  // GAP_DEG/2) to bring the start point to the bottom-left of the visible
  // arc.
  const rotation = 90 + GAP_DEG / 2;

  const tier = tierFor(value);
  const arcColor = colorForTier(tier);
  const glowColor = glowForTier(tier);
  const glowOpacity = glowOpacityForTier(tier);

  const progress = useSharedValue(0);
  const displayValue = useSharedValue(0);
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    progress.value = 0;
    displayValue.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    );
    displayValue.value = withDelay(
      delay,
      withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [value, delay, progress, displayValue]);

  useAnimatedReaction(
    () => Math.round(displayValue.value),
    (next, prev) => {
      if (next !== prev) runOnJS(setDisplay)(next);
    },
    [displayValue]
  );

  const progressProps = useAnimatedProps(() => {
    const fill = (value / 100) * visibleArc * progress.value;
    return {
      strokeDasharray: `${fill} ${circumference - fill}`,
    };
  });

  const glowId = useMemo(() => `dial-glow-${Math.round(Math.random() * 1e6)}`, []);

  const numberSize = Math.round(size * 0.38);
  const tierSize = Math.round(size * 0.055);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow — behind everything, tier-keyed */}
      <Svg
        width={size * 1.35}
        height={size * 1.35}
        style={[StyleSheet.absoluteFillObject, { left: -size * 0.175, top: -size * 0.175 }]}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={glowColor} stopOpacity={glowOpacity} />
            <Stop offset="0.55" stopColor={glowColor} stopOpacity={glowOpacity * 0.35} />
            <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="50%" r="50%" fill={`url(#${glowId})`} />
      </Svg>

      <Svg width={size} height={size}>
        {/* Track — muted ring, full visible arc */}
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          stroke={palette.hairline}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${visibleArc} ${gapArc}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${CX} ${CY})`}
        />
        {/* Progress — tier-colored, animated fill */}
        <AnimatedCircle
          cx={CX}
          cy={CY}
          r={R}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(${rotation} ${CX} ${CY})`}
          animatedProps={progressProps}
        />
      </Svg>

      {/* Centered text overlay */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.centerWrap}>
          <Text
            style={[
              styles.valueText,
              {
                fontSize: numberSize,
                lineHeight: numberSize,
              },
            ]}
            maxFontSizeMultiplier={1.1}
            allowFontScaling
          >
            {display}
          </Text>
          {showTier ? (
            <Text
              style={[
                styles.tierText,
                {
                  fontSize: tierSize,
                  marginTop: Math.round(size * 0.025),
                },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {tierLabel(tier).toUpperCase()}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ============================================================================

function colorForTier(t: SkinScoreTier): string {
  switch (t) {
    case 'strong':
      return palette.moss;
    case 'good':
      return palette.clay;
    case 'fair':
      return palette.amber;
    case 'needs-work':
      return palette.rust;
  }
}

function glowForTier(t: SkinScoreTier): string {
  // Glow tint mirrors the arc, so the dial reads as a unified object.
  return colorForTier(t);
}

function glowOpacityForTier(t: SkinScoreTier): number {
  switch (t) {
    case 'strong':
      return 0.45;
    case 'good':
      return 0.38;
    case 'fair':
      return 0.30;
    case 'needs-work':
      return 0.26;
  }
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    letterSpacing: -3,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  tierText: {
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.6,
    color: palette.inkSecondary,
  },
});
