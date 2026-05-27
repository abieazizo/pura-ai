/**
 * NightlyMirrorOrb — the layered ritual artifact at the centre of
 * Home pre-scan.
 *
 * Per the v29 spec, this must NOT look like a plain pink circle. It
 * is constructed from layered material:
 *   1. ambient halo (outer warm bloom)
 *   2. translucent outer disc (warm paper)
 *   3. inner fogged surface (slightly cooler paper)
 *   4. subtle reflected highlight (top-left)
 *   5. faint ScanConcernContour in ritual mode (inside the orb)
 *   6. centred "Begin check-in" label
 *
 * Interaction: a tap navigates to Scan. Press scales 0.986; glow
 * tightens; central surface clarifies. Idle: imperceptible breath
 * pulse on the ambient halo (reduced motion disables).
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { puraColors, puraMotion, puraShadow, puraType } from '@/design/puraTokens';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { ScanConcernContour } from './ScanConcernContour';
import type { ConcernZone } from '@/state/tonightObservation';

interface NightlyMirrorOrbProps {
  size: number;
  /** Optional zone for the embedded contour. */
  zone?: ConcernZone;
  /** Label rendered centrally inside the orb. */
  label: string;
  /** Optional second-line label below the main label (e.g. "30 seconds"). */
  hint?: string;
  /** Tap handler — typically navigation to Scan. */
  onPress: () => void;
  /** Accessibility label. */
  accessibilityLabel: string;
  /** Quiet ambient pulse on the halo; respects reduced motion. */
  breathing?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NightlyMirrorOrb({
  size,
  zone = 'chin',
  label,
  hint,
  onPress,
  accessibilityLabel,
  breathing = true,
}: NightlyMirrorOrbProps) {
  const reduceMotion = useReduceMotion();

  const ambient = useSharedValue(1);
  const press = useSharedValue(1);
  const inner = useSharedValue(0);

  useEffect(() => {
    if (!breathing || reduceMotion) {
      ambient.value = 1;
      return;
    }
    ambient.value = withRepeat(
      withSequence(
        withTiming(1.06, {
          duration: puraMotion.orbBreathMs,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, {
          duration: puraMotion.orbBreathMs,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
    return () => cancelAnimation(ambient);
  }, [breathing, reduceMotion, ambient]);

  const handlePressIn = () => {
    press.value = withSpring(0.986, puraMotion.springPress);
    inner.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
  };
  const handlePressOut = () => {
    press.value = withSpring(1, puraMotion.springPress);
    inner.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  };
  const handlePress = () => {
    hapt.select();
    onPress();
  };

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ambient.value }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));
  const clarityStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + inner.value * 0.15,
  }));

  const haloSize = size * 1.34;
  const outerSize = size;
  const innerSize = size * 0.78;
  const contourSize = size * 0.62;

  return (
    <View style={[styles.wrap, { width: haloSize, height: haloSize }]}>
      {/* 1. Ambient halo — warm bloom that breathes. */}
      <Animated.View
        style={[
          styles.haloLayer,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
          },
          haloStyle,
          puraShadow.orbAmbient,
        ]}
      >
        <Svg width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id="orbHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={puraColors.clay} stopOpacity={0.18} />
              <Stop offset="0.55" stopColor={puraColors.clay} stopOpacity={0.06} />
              <Stop offset="1" stopColor={puraColors.clay} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#orbHalo)" />
        </Svg>
      </Animated.View>

      {/* 2 + 3 + 4 + 5 + 6. The actual touchable orb. */}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens the nightly scan"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.orb,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
          },
          pressStyle,
        ]}
      >
        {/* Outer disc — warm linear paper. */}
        <LinearGradient
          colors={[puraColors.surface, puraColors.canvasWarm, puraColors.surfaceQuiet]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: outerSize / 2 },
          ]}
        />
        {/* Inner fogged surface — slightly recessed core. */}
        <Animated.View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
            clarityStyle,
          ]}
        >
          <LinearGradient
            colors={[puraColors.surfaceRaised, puraColors.canvas]}
            start={{ x: 0.3, y: 0.0 }}
            end={{ x: 0.7, y: 1.0 }}
            style={[
              StyleSheet.absoluteFillObject,
              { borderRadius: innerSize / 2 },
            ]}
          />
          {/* Reflected highlight — soft top-left bloom. */}
          <View
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                width: innerSize * 0.5,
                height: innerSize * 0.4,
                top: innerSize * 0.08,
                left: innerSize * 0.12,
                borderRadius: innerSize / 2,
              },
            ]}
          />
          {/* 5. Faint contour, ritual mode. */}
          <View
            pointerEvents="none"
            style={{ width: contourSize, opacity: 0.55 }}
          >
            <ScanConcernContour
              zone={zone}
              size={contourSize < 100 ? 'small' : 'medium'}
              mode="ritual"
            />
          </View>
          {/* 6. Centred label + hint. */}
          <View pointerEvents="none" style={styles.labels}>
            <Text style={styles.label} maxFontSizeMultiplier={1.15}>
              {label}
            </Text>
            {hint ? (
              <Text style={styles.hint} maxFontSizeMultiplier={1.15}>
                {hint}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloLayer: {
    position: 'absolute',
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 252, 248, 0.35)',
    transform: [{ scale: 1.2 }],
  },
  labels: {
    position: 'absolute',
    alignItems: 'center',
    bottom: '22%',
  },
  label: {
    ...puraType.eyebrowClay,
    fontSize: 12,
    letterSpacing: 2.4,
  },
  hint: {
    ...puraType.micro,
    fontSize: 11,
    marginTop: 6,
    color: puraColors.muted,
  },
});
