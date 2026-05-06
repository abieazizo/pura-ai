/**
 * LightingAssist — v19.13 front-camera screen ring-light overlay.
 *
 * v19.11 used 4 perimeter bands (top/bottom 18%, left/right 12%).
 * v19.13 redesigns this as a true ring-light: most of the screen is
 * bright (#FAFAFA), with a soft FACE-OVAL CUTOUT in the center
 * where the camera preview shows through. The user's face is now
 * physically surrounded by bright light from above, below, and
 * both sides — exactly like a Snapchat-style selfie assist.
 *
 * Implementation:
 *   • An SVG with a single bright rect filling the screen,
 *     masked by a face-shaped ellipse cutout in the upper-middle
 *     third (where front-camera selfie face composition naturally
 *     lands). The mask uses a radial gradient so the bright→clear
 *     transition feathers softly instead of slamming a hard edge.
 *   • The ellipse is sized so the face is comfortably framed and
 *     visible while ~70% of the screen remains bright illumination.
 *   • Color #FAFAFA (250 RGB) — slightly warmer than pure white so
 *     it's less harsh on the user's eyes.
 *
 * Design rules:
 *   • Premium, not crude. The feathered cutout is what makes this
 *     feel intentional rather than a flat white screen dump.
 *   • Pointer-events: 'none'. Capture row, mode switcher, and
 *     toggle pill underneath all receive taps unobstructed.
 *   • Renders only when `enabled` is true; fades in/out 220 ms.
 *   • Expo Go safe — pure SVG + Reanimated. No native modules.
 */

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export interface LightingAssistProps {
  enabled: boolean;
}

export function LightingAssist({ enabled }: LightingAssistProps) {
  const opacity = useSharedValue(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    opacity.value = withTiming(enabled ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, opacity]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Face oval — centered horizontally, slightly above vertical
  // center (front-camera selfie composition naturally lands the
  // face in the upper-middle third of the frame).
  const cx = width / 2;
  const cy = height * 0.42;
  // Oval slightly taller than wide — matches a real face shape.
  const rx = Math.min(width * 0.36, 180);
  const ry = Math.min(height * 0.26, 230);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, haloStyle]}
    >
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          {/* Radial gradient driving the mask: white (= keep the
              bright rect visible) at the perimeter, transparent
              (= cut out the bright rect, showing camera preview)
              at the face center. The 0.65 stop holds the bright
              area through ~65% of the radius before fading, so
              the perimeter reads as solid illumination. */}
          <RadialGradient
            id="ring-mask-grad"
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#000" stopOpacity="1" />
            <Stop offset="0.65" stopColor="#000" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#FFF" stopOpacity="1" />
          </RadialGradient>
          <Mask
            id="ring-mask"
            x="0"
            y="0"
            width={width}
            height={height}
            maskUnits="userSpaceOnUse"
          >
            <Rect
              x="0"
              y="0"
              width={width}
              height={height}
              fill="url(#ring-mask-grad)"
            />
          </Mask>
        </Defs>
        {/* The bright fill — soft warm white, masked so the face
            oval is left clear for the camera preview. */}
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="#FAFAFA"
          mask="url(#ring-mask)"
        />
        {/* Subtle inner ring — a soft glow around the face oval
            edge to make the assist feel intentional rather than a
            flat backdrop. Low opacity so it never reads as a
            crude outline. */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke="#FAFAFA"
          strokeOpacity={0.35}
          strokeWidth={6}
          fill="transparent"
        />
      </Svg>
      {/* Belt-and-braces extra brightness layer at the edges —
          some Android renderers feather the SVG mask less crisply
          than iOS, so a thin solid band on the very perimeter
          reinforces the ring-light effect everywhere. */}
      <View pointerEvents="none" style={styles.edgeReinforce} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edgeReinforce: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FAFAFA',
  },
});
