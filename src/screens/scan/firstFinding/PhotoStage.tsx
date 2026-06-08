/**
 * PhotoStage — the SINGLE persistent photo, as a FILL component. The screen
 * wraps it in one animated-size box that reflows from 78%→62% width at the
 * pivot, so the SAME photo resizes as a shared element and the lower third
 * genuinely opens (no screen swap, no overlap). The captured selfie is NEVER
 * retouched — only gently muted (~6% desaturated, ~8% dimmed) while analyzing so
 * the additive glows read as ADDED light, then it lifts as the photo comes alive.
 *
 * The glow overlay is passed as `children` so it lives INSIDE the clipped frame.
 */

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { LAYOUT } from './motion';
import type { ThemeTokens } from './motion';

const SATURATION_BLEND = { mixBlendMode: 'saturation' } as unknown as ViewStyle;

export interface PhotoStageProps {
  photoUri: string;
  tokens: ThemeTokens;
  /** 1 = fully muted (analyzing) · 0 = lifted. */
  mute: SharedValue<number>;
  reduceTransparency: boolean;
  radius: number;
  children?: React.ReactNode;
}

export function PhotoStage({
  photoUri,
  tokens,
  mute,
  reduceTransparency,
  radius,
  children,
}: PhotoStageProps) {
  const dimStyle = useAnimatedStyle(() => ({
    opacity: LAYOUT.analyzingDim * interpolate(mute.value, [0, 1], [0.35, 1]),
  }));
  const desatStyle = useAnimatedStyle(() => ({
    opacity: LAYOUT.analyzingDesaturate * interpolate(mute.value, [0, 1], [0.35, 1]),
  }));

  return (
    <View
      style={[
        styles.frame,
        { borderRadius: radius, borderColor: tokens.frameHairline, backgroundColor: tokens.frame },
      ]}
    >
      {/* The truth — never retouched. */}
      <Image
        source={photoUri}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
        accessibilityLabel="Your selfie"
      />

      {!reduceTransparency && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.desat, SATURATION_BLEND, desatStyle]}
          pointerEvents="none"
        />
      )}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}
        pointerEvents="none"
      />

      {/* Additive glow field — inside the clipped frame. */}
      {children}

      {/* Top-lit inner highlight. */}
      <LinearGradient
        colors={[tokens.depth.innerHighlight, 'transparent']}
        style={styles.innerHighlight}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  desat: { backgroundColor: '#808080' },
  dim: { backgroundColor: '#000000' },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
});
