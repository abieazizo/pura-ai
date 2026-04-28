import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette, radius } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export type ReticleMode = 'face' | 'product' | 'barcode';

/**
 * v11.4 — honest readiness states. expo-camera v17 ships no face
 * detection in Expo Go, so we don't pretend we're seeing the user's
 * face. Instead readiness is tied to user intent + capture
 * preparation:
 *
 *   • seeking   — default. Clay border, gentle pulse. Caption rotates
 *                 through live framing tips.
 *   • preparing — fired when the user TAPS the capture button. We
 *                 enter a 2-second hold-steady countdown with a
 *                 strong moss-green ring + glow + thicker stroke
 *                 before the photo actually fires. Reads as a real
 *                 commit moment instead of a fake "we see you" lie.
 *
 * This replaces the v11.3 timer-based "ready" state which silently
 * promoted to green after 2.5s regardless of what was on camera —
 * and never reset, because there was no signal to reset on.
 */
export type ReticleFrameState = 'seeking' | 'preparing';

export interface ReticleProps {
  mode: ReticleMode;
  screenWidth: number;
  screenHeight: number;
  /** Default: 'seeking'. */
  frameState?: ReticleFrameState;
}

const CORNER_EXT = 16;
const CORNER_LEN = 22;
const STROKE = 1;

/**
 * §2.3 — single confident hairline reticle. One stroke, opacity pulses
 * 0.4 → 0.6 → 0.4 over 2.2s. Face = oval. Product = rounded rect + corner
 * brackets extending 16px beyond each corner. Barcode = narrow horizontal
 * rect + corner brackets + a scan line that translates top→bottom over 2s.
 *
 * Mode cross-fades are driven at the wrapper level (§2.3 spec calls for
 * 180ms). We expose three render blocks and let the parent swap them with
 * opacity transitions.
 */
export function Reticle({
  mode,
  screenWidth,
  screenHeight,
  frameState = 'seeking',
}: ReticleProps) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);
  const scanLine = useSharedValue(0);
  // v11.4 — strong moss-green commit treatment during the
  // pre-capture hold-steady countdown. Only `face` mode triggers
  // this; `product` and `barcode` keep clay throughout.
  const isPreparing = mode === 'face' && frameState === 'preparing';
  const borderColor = isPreparing ? palette.mossDeep : palette.clay;
  const borderWidth = isPreparing ? 3 : STROKE;

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.5;
      scanLine.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse, scanLine]);

  useEffect(() => {
    if (mode !== 'barcode' || reduceMotion) {
      cancelAnimation(scanLine);
      scanLine.value = 0;
      return;
    }
    scanLine.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
    return () => cancelAnimation(scanLine);
  }, [mode, reduceMotion, scanLine]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.2 * pulse.value,
  }));

  // Face oval: 75% width × 50% height, centered
  const faceW = Math.round(screenWidth * 0.75);
  const faceH = Math.round(screenHeight * 0.5);

  // Product frame: 80% width × 45% height, centered
  const prodW = Math.round(screenWidth * 0.8);
  const prodH = Math.round(screenHeight * 0.45);

  // Barcode frame: 80% width, 120pt tall, centered vertically
  const barW = Math.round(screenWidth * 0.8);
  const barH = 120;

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLine.value * (barH - 2) }],
    opacity: 0.6,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {mode === 'face' ? (
        <Animated.View style={[styles.center, pulseStyle]}>
          <View
            style={[
              {
                width: faceW,
                height: faceH,
                borderRadius: faceW / 2,
                borderWidth,
                borderColor,
              },
              // v11.4 — premium glow halo around the moss-green ring
              // during the pre-capture countdown. Reads as "we're
              // committing to this capture now" — far stronger than
              // a 1pt → 2pt stroke shift.
              isPreparing && {
                shadowColor: palette.mossDeep,
                shadowOpacity: 0.45,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
                elevation: 10,
              },
            ]}
          />
        </Animated.View>
      ) : null}

      {mode === 'product' ? (
        <Animated.View style={[styles.center, pulseStyle]}>
          <View
            style={{
              width: prodW,
              height: prodH,
              borderRadius: radius.xl,
              borderWidth: STROKE,
              borderColor: palette.clay,
            }}
          />
          <Corners width={prodW} height={prodH} extend={CORNER_EXT} />
        </Animated.View>
      ) : null}

      {mode === 'barcode' ? (
        <Animated.View style={[styles.center, pulseStyle]}>
          <View
            style={{
              width: barW,
              height: barH,
              borderRadius: radius.md,
              borderWidth: STROKE,
              borderColor: palette.clay,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                styles.scanLine,
                {
                  width: barW - 2,
                  backgroundColor: palette.clay,
                },
                scanLineStyle,
              ]}
            />
          </View>
          <Corners width={barW} height={barH} extend={CORNER_EXT} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Four corner brackets extending `extend`pt beyond each corner of a frame.
 * They attach at the outer edges of the reticle.
 */
function Corners({
  width,
  height,
  extend,
}: {
  width: number;
  height: number;
  extend: number;
}) {
  const common = {
    position: 'absolute' as const,
    width: CORNER_LEN,
    height: CORNER_LEN,
  };
  return (
    <>
      <View
        style={[
          common,
          styles.cornerTL,
          { top: -extend, left: -extend, borderColor: palette.clay },
        ]}
      />
      <View
        style={[
          common,
          styles.cornerTR,
          { top: -extend, right: -extend, borderColor: palette.clay },
        ]}
      />
      <View
        style={[
          common,
          styles.cornerBL,
          { bottom: -extend, left: -extend, borderColor: palette.clay },
        ]}
      />
      <View
        style={[
          common,
          styles.cornerBR,
          { bottom: -extend, right: -extend, borderColor: palette.clay },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 1,
    height: 1.5,
  },
  cornerTL: {
    borderLeftWidth: STROKE,
    borderTopWidth: STROKE,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    borderRightWidth: STROKE,
    borderTopWidth: STROKE,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    borderLeftWidth: STROKE,
    borderBottomWidth: STROKE,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    borderRightWidth: STROKE,
    borderBottomWidth: STROKE,
    borderBottomRightRadius: 4,
  },
});
