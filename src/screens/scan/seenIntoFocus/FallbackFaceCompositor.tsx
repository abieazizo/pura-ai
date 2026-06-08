/**
 * FallbackFaceCompositor — the RN-only face composition that runs TODAY,
 * without Skia. It is the default the screen imports.
 *
 * What it faithfully reproduces:
 *   • soft → clarity resolve — a smooth UI-thread CROSSFADE from a statically
 *     pre-blurred copy of the photo to the sharp original (expo-image's
 *     `blurRadius` is set once, never recomputed per frame → 60fps, no jank).
 *   • warm directional key that TRACKS the gaze — a radial-gradient glow
 *     translated along the path, brightening where attention dwells.
 *   • a gentle brightness lift as the face resolves, plus a soft vignette.
 *
 * Honest limit (vs. Skia): there is no animated blur radius and no moving
 * LOCAL clarity mask, so the resolve is global rather than a sharp pool that
 * literally follows the eyes. The traveling warm key carries the "attention
 * moving across the face" read instead. Install Skia and swap in
 * SeenIntoFocusSkiaCompositor for the full effect. The photo is NEVER
 * retouched/smoothed — only blurred-then-revealed.
 *
 * All motion is Reanimated UI-thread opacity/transform.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { KEY_LIGHT, TOK } from './motion';
import type { FaceCompositorProps } from './types';

export function FallbackFaceCompositor({
  photoUri,
  frameW,
  frameH,
  blurR,
  baseBright,
  keyCenter,
  keyOpacity,
}: FaceCompositorProps) {
  const keyR = KEY_LIGHT.radiusMult * frameW;
  const keyD = keyR * 2;

  // Blurred copy fades out as the global blur envelope falls 7 → 0.
  const blurredStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, blurR.value / 7)),
  }));
  // baseBright < 1 → a black scrim that lifts to 0 as the face brightens.
  const dimStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - baseBright.value),
  }));
  // Warm key — translate so its center sits on keyCenter, opacity tracks env.
  const keyStyle = useAnimatedStyle(() => ({
    opacity: keyOpacity.value,
    transform: [
      { translateX: keyCenter.value.x - keyR },
      { translateY: keyCenter.value.y - keyR },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sharp original — the truth, never retouched. */}
      <Image
        source={photoUri}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />

      {/* Pre-blurred copy, crossfaded out as the face resolves. */}
      <Animated.View style={[StyleSheet.absoluteFill, blurredStyle]}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          blurRadius={22}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      {/* Brightness lift (dark scrim that recedes). */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />

      {/* Traveling warm key — appears to come from the companion above. */}
      <Animated.View style={[styles.key, { width: keyD, height: keyD }, keyStyle]}>
        <Svg width={keyD} height={keyD}>
          <Defs>
            <RadialGradient id="sif-key" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={KEY_LIGHT.core} />
              <Stop offset="0.45" stopColor={KEY_LIGHT.mid} />
              <Stop offset="1" stopColor={KEY_LIGHT.edge} />
            </RadialGradient>
          </Defs>
          <Circle cx={keyR} cy={keyR} r={keyR} fill="url(#sif-key)" />
        </Svg>
      </Animated.View>

      {/* Vignette — top + bottom, for depth. */}
      <LinearGradient
        colors={[TOK.vignetteTop, 'transparent']}
        style={[styles.vignetteTop, { height: frameH * 0.32 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', TOK.vignetteBottom]}
        style={[styles.vignetteBottom, { height: frameH * 0.4 }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: '#000000' },
  key: { position: 'absolute', top: 0, left: 0 },
  vignetteTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  vignetteBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
