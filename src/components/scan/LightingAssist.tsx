/**
 * LightingAssist — v19.11 front-camera screen ring-light overlay.
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
 *   • Expo Go safe — no native modules. The brightness comes from
 *     the screen's existing backlight.
 *
 * Optional brightness boost: when `expo-brightness` is available
 * (development builds), we ALSO push the system brightness to ~1.0
 * while the assist is on, then restore the previous value when the
 * scan screen unmounts or the user toggles off. In Expo Go where
 * `expo-brightness` is unavailable, we fall back to the overlay
 * alone, which still materially improves illumination.
 */

import React, { useEffect, useRef } from 'react';
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

/**
 * Optional dynamic import of expo-brightness so the component is
 * still safe to render in Expo Go (where the module may resolve
 * but throw on first call). We swallow any error and fall back to
 * the overlay-only path, which is still effective.
 */
type BrightnessModule = {
  getBrightnessAsync: () => Promise<number>;
  setBrightnessAsync: (n: number) => Promise<void>;
};

let _brightness: BrightnessModule | null | undefined;
async function tryGetBrightnessModule(): Promise<BrightnessModule | null> {
  if (_brightness !== undefined) return _brightness;
  try {
    // Avoid bundler resolution failure when the package isn't installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-brightness') as BrightnessModule;
    if (
      mod &&
      typeof mod.getBrightnessAsync === 'function' &&
      typeof mod.setBrightnessAsync === 'function'
    ) {
      _brightness = mod;
      return mod;
    }
  } catch {
    /* not installed or not available — fall back to overlay only */
  }
  _brightness = null;
  return null;
}

export function LightingAssist({ enabled }: LightingAssistProps) {
  const opacity = useSharedValue(0);
  const previousBrightness = useRef<number | null>(null);

  useEffect(() => {
    opacity.value = withTiming(enabled ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [enabled, opacity]);

  // Optional: push system brightness to max while enabled, restore on
  // disable / unmount. Best-effort. Never throws into the scan flow.
  useEffect(() => {
    let cancelled = false;
    if (enabled) {
      void (async () => {
        const mod = await tryGetBrightnessModule();
        if (!mod || cancelled) return;
        try {
          if (previousBrightness.current === null) {
            previousBrightness.current = await mod.getBrightnessAsync();
          }
          await mod.setBrightnessAsync(1.0);
        } catch {
          /* graceful: overlay alone is still effective */
        }
      })();
    } else if (previousBrightness.current !== null) {
      void (async () => {
        const mod = await tryGetBrightnessModule();
        if (!mod || cancelled) return;
        try {
          await mod.setBrightnessAsync(previousBrightness.current ?? 0.5);
        } catch {
          /* nothing to do */
        }
        previousBrightness.current = null;
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Final unmount safety: restore brightness if we're still elevated.
  useEffect(() => {
    return () => {
      if (previousBrightness.current !== null) {
        void (async () => {
          const mod = await tryGetBrightnessModule();
          if (!mod) return;
          try {
            await mod.setBrightnessAsync(previousBrightness.current ?? 0.5);
          } catch {
            /* shrug */
          }
        })();
      }
    };
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!enabled && opacity.value === 0) return null;

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
