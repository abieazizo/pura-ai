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
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
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
  /** Previous scan's score, rendered as a small notch on the arc so the
   *  current value visually shows its movement. Null = no notch drawn. */
  previousValue?: number | null;
  /** Optional delta caption shown inside the dial under the tier label —
   *  e.g. "+4 since last scan" / "first reading". */
  deltaCaption?: string | null;
  /** Fires once when the count-up animation settles on its final value.
   *  Lets callers (e.g. ScanResult) land a haptic at the reveal moment. */
  onRevealComplete?: () => void;
}

const GAP_DEG = 120; // opens a 120° gap at the bottom — dial is 240° visible

export function SkinScoreDial({
  value,
  size = 220,
  showTier = true,
  delay = 120,
  previousValue = null,
  deltaCaption = null,
  onRevealComplete,
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

  // v10.1 — idle breath. After the initial reveal settles, the glow opacity
  // drifts 1.0 → 0.86 → 1.0 over 4.2s in a gentle sine. Keeps the hero
  // object alive at rest without demanding attention. Respects reduce-motion.
  const reduceMotion = useReduceMotion();
  const breath = useSharedValue(1);

  useEffect(() => {
    progress.value = 0;
    displayValue.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    );
    displayValue.value = withDelay(
      delay,
      withTiming(
        value,
        { duration: 900, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished && onRevealComplete) {
            runOnJS(onRevealComplete)();
          }
        }
      )
    );
    if (reduceMotion) {
      breath.value = 1;
      return;
    }
    // Breath begins after the reveal fully settles (delay + 1100ms).
    breath.value = withDelay(
      delay + 1200,
      withRepeat(
        withSequence(
          withTiming(0.86, {
            duration: 2100,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, {
            duration: 2100,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        false
      )
    );
  }, [value, delay, progress, displayValue, breath, reduceMotion, onRevealComplete]);

  const glowBreathStyle = useAnimatedStyle(() => ({
    opacity: breath.value,
  }));

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
      {/* Glow — behind everything, tier-keyed. v10.1: opacity drifts
          (breath) after the reveal settles so the dial reads as alive. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { left: -size * 0.175, top: -size * 0.175, width: size * 1.35, height: size * 1.35 },
          glowBreathStyle,
        ]}
        pointerEvents="none"
      >
        <Svg width={size * 1.35} height={size * 1.35}>
          <Defs>
            <RadialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor={glowColor} stopOpacity={glowOpacity} />
              <Stop offset="0.55" stopColor={glowColor} stopOpacity={glowOpacity * 0.35} />
              <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50%" cy="50%" r="50%" fill={`url(#${glowId})`} />
        </Svg>
      </Animated.View>

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
        {/* Tier tick marks — tiny radial ticks at tier boundaries (55, 70,
            85) along the outside of the arc. Faint; you notice them when
            looking, they don't dominate the composition. */}
        {[55, 70, 85].map((boundary) => (
          <TierTick
            key={boundary}
            cx={CX}
            cy={CY}
            R={R}
            strokeWidth={strokeWidth}
            boundary={boundary}
            visibleArcDeg={360 - GAP_DEG}
            startAngleDeg={rotation}
          />
        ))}
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
        {/* Previous-scan notch — a small dot on the arc showing where you
            moved from. Only drawn if previousValue is within 0..100 and
            different from value. */}
        {previousValue !== null &&
        previousValue !== undefined &&
        previousValue >= 0 &&
        previousValue <= 100 &&
        Math.abs(previousValue - value) >= 1 ? (
          <PreviousNotch
            cx={CX}
            cy={CY}
            R={R}
            value={previousValue}
            visibleArcDeg={360 - GAP_DEG}
            startAngleDeg={rotation}
            strokeWidth={strokeWidth}
          />
        ) : null}
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
          {deltaCaption ? (
            <Text
              style={[
                styles.deltaCaption,
                {
                  fontSize: Math.round(size * 0.048),
                  marginTop: Math.round(size * 0.018),
                },
              ]}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {deltaCaption}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Arc decorations (tick marks + previous-scan notch)
// ============================================================================

/**
 * Converts an SVG "rotate(deg, cx, cy) then parametric t on a circle"
 * position into absolute (x, y) coordinates. `t` is the visible-arc
 * fraction [0..1]: 0 = start of arc, 1 = end.
 */
function polarOnArc(
  cx: number,
  cy: number,
  R: number,
  startAngleDeg: number,
  visibleArcDeg: number,
  t: number
) {
  // After `rotate(startAngleDeg, cx, cy)`, the arc's 0° sits at the rotated
  // position. Moving along the arc = rotating around (cx, cy) by (t *
  // visibleArcDeg). Combined angle from the +x axis = startAngleDeg + t *
  // visibleArcDeg (in rotate's reference where 0° is right, clockwise).
  // SVG rotate() uses clockwise degrees from +x axis.
  const angle = startAngleDeg + t * visibleArcDeg;
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + R * Math.cos(rad),
    y: cy + R * Math.sin(rad),
  };
}

function TierTick({
  cx,
  cy,
  R,
  strokeWidth,
  boundary,
  visibleArcDeg,
  startAngleDeg,
}: {
  cx: number;
  cy: number;
  R: number;
  strokeWidth: number;
  boundary: number;
  visibleArcDeg: number;
  startAngleDeg: number;
}) {
  // Translate `boundary` (0..100) to arc fraction.
  const t = boundary / 100;
  const inner = polarOnArc(cx, cy, R - strokeWidth * 0.75, startAngleDeg, visibleArcDeg, t);
  const outer = polarOnArc(cx, cy, R + strokeWidth * 0.55, startAngleDeg, visibleArcDeg, t);
  return (
    <Circle
      cx={outer.x}
      cy={outer.y}
      r={2}
      fill={palette.inkTertiary}
      fillOpacity={0.4}
    />
  );
  // Using a small dot instead of a line: reads as a premium marker at
  // small dial sizes where a tick line would visually clutter.
  // (The `inner` anchor is calculated for future line-variant work.)
  void inner;
}

function PreviousNotch({
  cx,
  cy,
  R,
  value,
  visibleArcDeg,
  startAngleDeg,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  R: number;
  value: number;
  visibleArcDeg: number;
  startAngleDeg: number;
  strokeWidth: number;
}) {
  const t = Math.max(0, Math.min(1, value / 100));
  const pt = polarOnArc(cx, cy, R, startAngleDeg, visibleArcDeg, t);
  // Double-stroked pip: inkInverse halo (so it reads over any tier color)
  // + ink core.
  return (
    <>
      <Circle
        cx={pt.x}
        cy={pt.y}
        r={strokeWidth * 0.55}
        fill={palette.inkInverse}
      />
      <Circle
        cx={pt.x}
        cy={pt.y}
        r={strokeWidth * 0.26}
        fill={palette.inkSecondary}
      />
    </>
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
  deltaCaption: {
    fontFamily: 'Inter-Medium',
    color: palette.inkTertiary,
    letterSpacing: 0.1,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
