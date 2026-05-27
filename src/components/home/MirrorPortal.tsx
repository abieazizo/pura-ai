/**
 * MirrorPortal — v26.3 emotional centerpiece of the redesigned Home.
 *
 * Reads as a softly illuminated vertical oval — a hand mirror catching
 * warm room light — not a face scanner, not a sci-fi glow ring. The
 * reflection is built from a single SVG with layered radial gradients,
 * a separate fog veil that clears on entrance, two highlight ellipses
 * that drift slowly as if the room light is shifting, and a barely-
 * visible vertical "presence" line that suggests reflection without
 * being literal.
 *
 * Motion choreography:
 *   - Mount: fog veil fades from 1 → 0 over 1100ms while the portal
 *     opacity rises (a true "clearing" rather than a flat fade).
 *   - Idle: a 6.4s breath cycle + 10s/13s drift on the two highlights.
 *   - Press: gathered warmth wells up under the finger; scale 0.985
 *     with the gather radial intensifying.
 *
 * Architecture notes:
 *   - One core SVG holds the base + drifting highlights + presence.
 *   - The fog veil is a separate Animated.View overlay so its alpha
 *     can be driven by Reanimated independently of SVG composition.
 *   - Gradient ids are scoped per instance via `useId()` so two
 *     MirrorPortals on the same screen never collide on web.
 *   - Every color reads from `pura26`; no inline hex / rgba.
 *
 * Accessibility: one Pressable with a single descriptive label. The
 * label text is decorative and hidden from the screen reader.
 */

import React, { useEffect, useId, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { pura26 } from '@/screens/home/homeTokens';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export interface MirrorPortalProps {
  /** Action label rendered as an italic inscription inside the portal. */
  label: string;
  /** Single screen-reader sentence describing the action. */
  accessibilityLabel: string;
  onPress: () => void;
  /**
   * Whether to play the misted-clearing entrance. Caller can set this
   * to false when the portal is nested inside another reveal sequence.
   */
  animateOnMount?: boolean;
}

const W = 268;
const H = 296;
const CX = W / 2;
const CY = H / 2;
const RX = W / 2;
const RY = H / 2;

export function MirrorPortal({
  label,
  accessibilityLabel,
  onPress,
  animateOnMount = true,
}: MirrorPortalProps) {
  const reduceMotion = useReduceMotion();
  const instanceId = useId();
  const ids = useMemo(
    () => ({
      base: `mirror-base-${instanceId}`,
      gather: `mirror-gather-${instanceId}`,
      upper: `mirror-upper-${instanceId}`,
      side: `mirror-side-${instanceId}`,
      fog: `mirror-fog-${instanceId}`,
    }),
    [instanceId]
  );

  // Shared values
  const mist = useSharedValue(animateOnMount ? 0 : 1);
  const fog = useSharedValue(animateOnMount ? 1 : 0);
  const breath = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const pressGather = useSharedValue(0);
  // Drift values — used to animate highlight cx/cy slowly. Driven as a
  // single normalized phase per highlight to keep cost low.
  const upperDrift = useSharedValue(0);
  const sideDrift = useSharedValue(0);

  useEffect(() => {
    if (!animateOnMount) {
      mist.value = 1;
      fog.value = 0;
      return;
    }
    if (reduceMotion) {
      mist.value = withTiming(1, { duration: 180 });
      fog.value = withTiming(0, { duration: 180 });
      return;
    }
    // The fog veil clears slightly faster than the portal opacity
    // rises — so the user sees the mirror brighten as the mist lifts,
    // not as a single flat fade.
    fog.value = withTiming(0, {
      duration: 1300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    mist.value = withTiming(1, {
      duration: 1100,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    const arrival = setTimeout(() => {
      hapt.assistantReply();
    }, 1100);
    return () => clearTimeout(arrival);
  }, [animateOnMount, reduceMotion, mist, fog]);

  useEffect(() => {
    if (reduceMotion) return;
    // Quiet breath (Reduce Motion turns this off).
    breath.value = withDelay(
      1100,
      withRepeat(
        withSequence(
          withTiming(1.012, {
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1.0, {
            duration: 3200,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        false
      )
    );
    // Slow drift on the two highlights — as if the room light is
    // shifting. Different period per light so they never align into a
    // single artificial pulse.
    upperDrift.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
    sideDrift.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 13000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 13000,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(upperDrift);
      cancelAnimation(sideDrift);
    };
  }, [reduceMotion, breath, upperDrift, sideDrift]);

  // Driven SVG props for the drifting highlights. Each highlight's
  // center (cx, cy) shifts by ±3px so the light feels alive without
  // ever being noticed.
  const upperCx = useDerivedValue(() =>
    interpolate(upperDrift.value, [0, 1], [CX * 0.7 - 3, CX * 0.7 + 3])
  );
  const upperCy = useDerivedValue(() =>
    interpolate(upperDrift.value, [0, 1], [CY * 0.44 - 2, CY * 0.44 + 2])
  );
  const sideCx = useDerivedValue(() =>
    interpolate(sideDrift.value, [0, 1], [CX * 1.48 - 2, CX * 1.48 + 2])
  );
  const sideCy = useDerivedValue(() =>
    interpolate(sideDrift.value, [0, 1], [CY * 1.28 - 3, CY * 1.28 + 3])
  );

  const upperAnimatedProps = useAnimatedProps(() => ({
    cx: upperCx.value,
    cy: upperCy.value,
  }));
  const sideAnimatedProps = useAnimatedProps(() => ({
    cx: sideCx.value,
    cy: sideCy.value,
  }));

  const portalStyle = useAnimatedStyle(() => ({
    opacity: mist.value,
    transform: [{ scale: pressScale.value * breath.value }],
  }));
  const fogStyle = useAnimatedStyle(() => ({
    opacity: fog.value,
  }));
  const gatherStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pressGather.value * 0.4,
    transform: [{ scale: 0.82 + pressGather.value * 0.12 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: mist.value,
  }));

  const handlePressIn = () => {
    if (reduceMotion) return;
    pressScale.value = withTiming(0.985, { duration: 140 });
    pressGather.value = withTiming(1, { duration: 240 });
  };
  const handlePressOut = () => {
    if (reduceMotion) return;
    pressScale.value = withTiming(1.0, { duration: 260 });
    pressGather.value = withTiming(0, { duration: 360 });
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          hapt.tap();
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={14}
        style={styles.pressable}
      >
        <Animated.View style={[styles.portal, portalStyle]}>
          <View style={styles.auraOuter} />
          <View style={styles.auraInner} />

          {/* Core mirror — base reflection + drifting highlights + the
              vertical presence line. */}
          <Svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={StyleSheet.absoluteFillObject}
          >
            <Defs>
              <RadialGradient id={ids.base} cx="0.4" cy="0.36" rx="0.7" ry="0.78">
                <Stop offset="0" stopColor={pura26.mirrorHot} stopOpacity={1} />
                <Stop offset="0.35" stopColor={pura26.mirrorWarm} stopOpacity={1} />
                <Stop offset="0.7" stopColor={pura26.mirrorHollow} stopOpacity={1} />
                <Stop offset="1" stopColor={pura26.mirrorEdge} stopOpacity={1} />
              </RadialGradient>
              <RadialGradient id={ids.upper} cx="0.35" cy="0.22" rx="0.4" ry="0.18">
                <Stop offset="0" stopColor={pura26.highlightStrong} />
                <Stop offset="0.6" stopColor={pura26.highlightFaint} />
                <Stop offset="1" stopColor={pura26.highlightOff} />
              </RadialGradient>
              <RadialGradient id={ids.side} cx="0.74" cy="0.64" rx="0.24" ry="0.18">
                <Stop offset="0" stopColor={pura26.highlightSoft} />
                <Stop offset="1" stopColor={pura26.highlightOff} />
              </RadialGradient>
            </Defs>

            <Ellipse cx={CX} cy={CY} rx={RX - 0.5} ry={RY - 0.5} fill={`url(#${ids.base})`} />
            {/* Drifting upper-curve highlight. */}
            <AnimatedEllipse
              animatedProps={upperAnimatedProps}
              rx={W * 0.4}
              ry={H * 0.18}
              fill={pura26.highlightFaint}
            />
            {/* Drifting mid-right highlight. */}
            <AnimatedEllipse
              animatedProps={sideAnimatedProps}
              rx={W * 0.18}
              ry={H * 0.13}
              fill={pura26.highlightFaint}
            />
            {/* Soft "presence" line — a barely-visible vertical
                hairline through the upper third, like a faint trace of
                someone standing in front of the mirror without
                showing a literal face. */}
            <Rect
              x={CX - 0.5}
              y={H * 0.18}
              width={1}
              height={H * 0.34}
              fill={pura26.terracottaText}
              opacity={0.08}
            />
            {/* Pura signature crescent — a single soft arc tracing the
                inner upper-left curve of the oval. Ownable visual that
                makes the portal recognizable at a glance even at
                thumbnail scale. The arc lives just inside the rim so
                it reads as the mirror's own catching of warm light,
                not as decoration. */}
            <Path
              d={`M ${CX - RX * 0.78} ${CY - RY * 0.15} A ${RX * 0.85} ${RY * 0.78} 0 0 1 ${CX + RX * 0.12} ${CY - RY * 0.84}`}
              stroke={pura26.terracotta}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
              opacity={0.22}
            />
            <Ellipse
              cx={CX}
              cy={CY}
              rx={RX - 1}
              ry={RY - 1}
              fill="none"
              stroke={pura26.mirrorRim}
              strokeWidth={1}
            />
          </Svg>

          {/* Press-driven gather overlay. */}
          <Animated.View style={[styles.absFill, gatherStyle]}>
            <Svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={StyleSheet.absoluteFillObject}
            >
              <Defs>
                <RadialGradient id={ids.gather} cx="0.5" cy="0.52" rx="0.5" ry="0.55">
                  <Stop offset="0" stopColor={pura26.highlightStrong} />
                  <Stop offset="0.55" stopColor={pura26.mirrorGather} stopOpacity={0.4} />
                  <Stop offset="1" stopColor={pura26.mirrorHollow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={CX}
                cy={CY}
                rx={RX - 0.5}
                ry={RY - 0.5}
                fill={`url(#${ids.gather})`}
              />
            </Svg>
          </Animated.View>

          {/* Fog veil — sits on top of the SVG and clears during the
              entrance. Independent of portal opacity so the user
              perceives "mist lifting", not just "fade in". */}
          <Animated.View style={[styles.absFill, fogStyle]}>
            <Svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={StyleSheet.absoluteFillObject}
            >
              <Defs>
                <RadialGradient id={ids.fog} cx="0.5" cy="0.5" rx="0.7" ry="0.78">
                  <Stop offset="0" stopColor={pura26.surface} stopOpacity={0.85} />
                  <Stop offset="0.7" stopColor={pura26.surface} stopOpacity={0.7} />
                  <Stop offset="1" stopColor={pura26.surface} stopOpacity={0.55} />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={CX}
                cy={CY}
                rx={RX - 0.5}
                ry={RY - 0.5}
                fill={`url(#${ids.fog})`}
              />
            </Svg>
          </Animated.View>

          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.labelWrap, labelStyle]}
          >
            <Text style={styles.label} maxFontSizeMultiplier={1.15}>
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pressable: {
    borderRadius: Math.max(W, H),
  },
  portal: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraOuter: {
    position: 'absolute',
    top: -36,
    left: -36,
    right: -36,
    bottom: -36,
    borderRadius: Math.max(W, H),
    backgroundColor: pura26.mirrorAuraOuter,
    opacity: 0.6,
    shadowColor: pura26.terracottaText,
    shadowOpacity: 0.12,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 18 },
    elevation: 9,
    pointerEvents: 'none',
  },
  auraInner: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: Math.max(W, H),
    backgroundColor: pura26.mirrorAuraInner,
    pointerEvents: 'none',
  },
  absFill: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  labelWrap: {
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  label: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.2,
    color: pura26.terracottaText,
    textAlign: 'center',
  },
});
