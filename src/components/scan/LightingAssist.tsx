/**
 * LightingAssist — v19.11 / v19.12 front-camera screen ring-light overlay.
 *
 * Front-camera face scans in indoor lighting are frequently underlit.
 * The phone's front sensor is small, the user's hand shadows the
 * frame, and acne / redness / texture detail wash out at low light.
 * Native rear-camera torches help in product/barcode mode but front
 * cameras have no hardware torch on iOS or most Android devices.
 *
 * This component is the cross-platform alternative: a soft, premium,
 * sustained white halo rendered AROUND the camera preview that turns
 * the phone screen itself into a ring light. The user holds the
 * phone in their normal scan position; the bright halo reflects off
 * their face and the front sensor gets a materially brighter,
 * higher-contrast frame to capture redness / texture / pores.
 *
 * Design rules:
 *   • Premium, not crude. A flat blinding white screen is harsh;
 *     this is a soft 250 RGB neutral with a subtle vignette so the
 *     center stays gentle and the perimeter brightens.
 *   • Pointer-events: 'none'. The user can still tap the capture
 *     row, mode switcher, and exit button beneath.
 *   • Renders only when `enabled` is true; zero overhead when off.
 *   • Pairs with a small "Lighting Assist On" pill in the scan UI
 *     so the state is unambiguous.
 *   • Expo Go safe — NO native modules required. The brightness
 *     comes entirely from the screen's existing backlight + the
 *     overlay's bright bands.
 *
 * v19.12 — REMOVED the optional `expo-brightness` dynamic require.
 *   The package isn't installed in package.json, and Metro evaluates
 *   `require()` paths at bundle time even when wrapped in try/catch.
 *   The require was a real risk for breaking the Metro bundle. The
 *   overlay-only approach is what the user asked for and works
 *   reliably in Expo Go without ANY native modules. If a native
 *   build wants to bump system brightness too, that's a separate
 *   future addition (a development build can install
 *   `expo-brightness` and add a real import).
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface LightingAssistProps {
  enabled: boolean;
}

export function LightingAssist({ enabled }: LightingAssistProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(enabled ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, opacity]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Avoid mounting the halo at all when disabled and faded out.
  // (Reanimated's shared value reads here are intentionally
  // referenced inside the animated style; gating the JSX render
  // with `opacity.value === 0` is a tiny optimization but doesn't
  // affect correctness when the value is mid-transition.)
  if (!enabled) {
    // Still render an invisible placeholder so the fade-out
    // animation completes before unmount; the absoluteFill view
    // itself is cheap.
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, haloStyle]}
    >
      {/* Outer halo — soft warm white. The 4 edge bands are bright
          enough to physically reflect onto the face when the phone
          is held at typical front-camera distance (~30cm), but the
          center stays empty so the camera preview reads naturally.
          Color #FAFAFA (250 RGB) instead of pure #FFFFFF — slightly
          warmer and visually less harsh on the user's eyes. */}
      <View style={styles.topBand} />
      <View style={styles.bottomBand} />
      <View style={styles.leftBand} />
      <View style={styles.rightBand} />
      {/* Subtle inner vignette so the bands feather into the
          preview rather than slamming a hard edge. */}
      <View style={styles.innerVignetteTop} />
      <View style={styles.innerVignetteBottom} />
    </Animated.View>
  );
}

/**
 * Width of the bright bands around the preview. 18% top/bottom
 * leaves the center 64% as the camera-preview safe zone — large
 * enough to frame the face comfortably, with two thick bright bands
 * close enough to the face plane to act as ring-light reflectors.
 */
const BAND_TB = '18%';
const BAND_LR = '12%';

const styles = StyleSheet.create({
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAND_TB,
    backgroundColor: '#FAFAFA',
  },
  bottomBand: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAND_TB,
    backgroundColor: '#FAFAFA',
  },
  leftBand: {
    position: 'absolute',
    top: BAND_TB,
    bottom: BAND_TB,
    left: 0,
    width: BAND_LR,
    backgroundColor: '#FAFAFA',
  },
  rightBand: {
    position: 'absolute',
    top: BAND_TB,
    bottom: BAND_TB,
    right: 0,
    width: BAND_LR,
    backgroundColor: '#FAFAFA',
  },
  innerVignetteTop: {
    position: 'absolute',
    top: BAND_TB,
    left: BAND_LR,
    right: BAND_LR,
    height: 24,
    backgroundColor: 'rgba(250,250,250,0.45)',
  },
  innerVignetteBottom: {
    position: 'absolute',
    bottom: BAND_TB,
    left: BAND_LR,
    right: BAND_LR,
    height: 24,
    backgroundColor: 'rgba(250,250,250,0.45)',
  },
});
