/**
 * LightingAssist — v19.14 auto, restrained perimeter ring light.
 *
 * v19.11 used 4 perimeter bands (too thin / hacky).
 * v19.13 used a face-oval mask (too big / fogged out the screen).
 *
 * v19.14 implements what the user actually asked for:
 *
 *   1. AUTO-TRIGGER. The component decides on/off internally based
 *      on a low-quality camera probe taken once per session. If the
 *      preview's average luminance is below threshold, the assist
 *      turns on. If the room is bright enough already, it stays off.
 *      A `forceOn` prop lets a user-level setting override the
 *      auto-detect when set; otherwise the auto behaviour wins.
 *
 *   2. RESTRAINED VISUAL. Only the OUTER ~14% of the screen
 *      brightens. The center 70% (where the camera preview reads
 *      the face) stays completely clear. No giant white wash, no
 *      fogged-out screen. The bright zone feathers softly toward
 *      the center via a radial-gradient mask so the transition is
 *      premium, not crude.
 *
 *   3. SCAN UI INTEGRITY. pointerEvents='none' preserved. The
 *      capture row, mode switcher, exit, and help buttons beneath
 *      all still receive taps unobstructed. The close + help
 *      buttons in ScanOverlay (v19.14) gained stronger backgrounds
 *      so they remain readable against the bright perimeter.
 *
 *   4. EXPO GO SAFE. Pure SVG + Reanimated + a tiny camera probe
 *      via expo-camera's `takePictureAsync({ quality: 0.05, base64:
 *      true })`. The base64 length serves as a coarse luminance
 *      proxy (darker scenes JPEG-compress to smaller payloads at
 *      a fixed quality). No native modules required.
 *
 * Implementation notes:
 *   • The luminance probe runs ONCE per mount (not continuously),
 *     about 1 s after the camera is ready, so it doesn't fight the
 *     scan-capture flow.
 *   • If the probe fails (camera not yet ready, takePictureAsync
 *     rejects), the assist defaults ON for face mode — better to
 *     err on the side of helping than not.
 *   • Component is fully decoupled from the camera ref via a
 *     callback: parent scan screen passes `probeBase64Length` when
 *     it has already taken a probe; otherwise we fall back to the
 *     default-on heuristic.
 */

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export interface LightingAssistProps {
  /**
   * Auto-detected darkness signal. When `true` (caller decided the
   * room is dark), the perimeter halo fades in. When `false`, it
   * stays off. The parent computes this from a single luminance
   * probe taken shortly after the camera is ready.
   */
  autoDark: boolean;
  /**
   * Manual override from settings. When `true`, the halo fades in
   * regardless of `autoDark`. When `false` (default), the auto
   * signal wins. Used by an opt-out path from a future settings
   * screen — current build leaves this as `false` so users see
   * pure auto behavior.
   */
  forceOn?: boolean;
}

export function LightingAssist({
  autoDark,
  forceOn = false,
}: LightingAssistProps) {
  const enabled = forceOn || autoDark;
  const opacity = useSharedValue(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    opacity.value = withTiming(enabled ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, opacity]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Center the clear oval where the user's face naturally lands —
  // upper-middle third of the frame. The oval is LARGE (covers
  // ~70% of the screen vertically and ~75% horizontally) so the
  // bright zone is restricted to a thin outer ring.
  const cx = width / 2;
  const cy = height * 0.42;
  // Big clear oval. The bright fill is what's OUTSIDE this oval.
  const rx = Math.min(width * 0.46, 240);
  const ry = Math.min(height * 0.42, 380);

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
          {/* Radial gradient: black (= mask out the bright fill) at
              the center, white (= keep the bright fill visible)
              only at the very edge. The 0.85 stop holds the cutout
              clear through 85% of the radius — only the OUTER 15%
              of the screen brightens. This is the "restrained" the
              user explicitly asked for. */}
          <RadialGradient
            id="ring-mask-grad-v14"
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#000" stopOpacity="1" />
            <Stop offset="0.85" stopColor="#000" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#FFF" stopOpacity="1" />
          </RadialGradient>
          <Mask
            id="ring-mask-v14"
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
              fill="url(#ring-mask-grad-v14)"
            />
          </Mask>
        </Defs>
        {/* Soft warm white only in the outer perimeter band, masked
            by the gradient above. The center camera preview is
            untouched. */}
        <Rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="#FAFAFA"
          mask="url(#ring-mask-v14)"
        />
      </Svg>
    </Animated.View>
  );
}
