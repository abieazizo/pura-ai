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
 * v11.3 — frame-confidence states. Only `face` mode uses these
 * today (the costly analyzeFaceScan path); `product` and `barcode`
 * leave it at the default `seeking`. The state changes the reticle
 * border colour and the captured-pulse cadence so the user gets
 * real-time confidence the camera is "seeing them" before they
 * commit to capture.
 */
export type ReticleFrameState = 'seeking' | 'ready';

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
  // v11.3 — colour the reticle moss-green when the user has held the
  // camera steady long enough to be a confident capture target. Only
  // the `face` mode promotes; `product` and `barcode` stay clay.
  const borderColor =
    mode === 'face' && frameState === 'ready' ? palette.mossDeep : palette.clay;

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
            style={{
              width: faceW,
              height: faceH,
              borderRadius: faceW / 2,
              borderWidth: frameState === 'ready' ? 2 : STROKE,
              borderColor,
            }}
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
