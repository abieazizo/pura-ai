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
import type { OverlayTone } from '@/screens/scan/hooks/useFaceScanState';

export type ReticleMode = 'face' | 'product' | 'barcode';
export type { OverlayTone };

export interface ReticleProps {
  mode: ReticleMode;
  screenWidth: number;
  screenHeight: number;
  /**
   * v11.5 — overlay tone derived from the face-scan state machine.
   *   neutral    — quiet stroke, gentle pulse (NO_FACE / boot)
   *   warning    — sand stroke, slightly stronger (any FACE_OFF_*,
   *                FACE_PARTIAL, FACE_TOO_*, FACE_LOW_LIGHT,
   *                FACE_UNSTABLE)
   *   ready      — moss-tinted ring + slow sheen sweep + halo
   *                (FACE_READY)
   *   committing — strong moss + glow + thick stroke
   *                (FACE_COUNTDOWN, FACE_CAPTURING, FACE_ANALYZING)
   */
  overlayTone?: OverlayTone;
}

const CORNER_EXT = 16;
const CORNER_LEN = 22;
const STROKE = 1;

export function Reticle({
  mode,
  screenWidth,
  screenHeight,
  overlayTone = 'neutral',
}: ReticleProps) {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);
  const scanLine = useSharedValue(0);
  const sheen = useSharedValue(0);

  // Continuous gentle pulse on the reticle border opacity.
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.5;
      scanLine.value = 0;
      sheen.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse, scanLine, sheen]);

  // v11.5 — sheen pulse only animates on ready/committing. Slow
  // 1.6s sweep that travels across the oval rim by mapping into
  // a halo ring opacity.
  useEffect(() => {
    if (overlayTone !== 'ready' && overlayTone !== 'committing') {
      cancelAnimation(sheen);
      sheen.value = 0;
      return;
    }
    if (reduceMotion) {
      sheen.value = 1;
      return;
    }
    sheen.value = 0;
    sheen.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(sheen);
  }, [overlayTone, reduceMotion, sheen]);

  // Barcode scan line.
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

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.55 * sheen.value,
    transform: [{ scale: 1.0 + 0.04 * sheen.value }],
  }));

  // ────────────────────────────────────────────────────────────────
  // Tone → stroke + halo presets. Single source of truth for the
  // four overlay states.
  // ────────────────────────────────────────────────────────────────
  const tonePreset = (() => {
    if (mode !== 'face') {
      return {
        borderColor: palette.clay,
        borderWidth: STROKE,
        haloEnabled: false,
        haloColor: palette.clay,
      };
    }
    switch (overlayTone) {
      case 'committing':
        return {
          borderColor: palette.mossDeep,
          borderWidth: 3,
          haloEnabled: true,
          haloColor: palette.mossDeep,
          haloIntensity: 0.65,
        };
      case 'ready':
        return {
          borderColor: palette.mossDeep,
          borderWidth: 2,
          haloEnabled: true,
          haloColor: palette.mossDeep,
          haloIntensity: 0.4,
        };
      case 'warning':
        // Subtle amber/sand. Visible without screaming.
        return {
          borderColor: palette.amber,
          borderWidth: 1.5,
          haloEnabled: false,
          haloColor: palette.amber,
        };
      case 'neutral':
      default:
        return {
          borderColor: palette.clay,
          borderWidth: STROKE,
          haloEnabled: false,
          haloColor: palette.clay,
        };
    }
  })();

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
          {/* v11.5 — soft outer halo only on ready / committing. The
              halo sits BEHIND the oval and grows with the sheen
              pulse so the ready moment reads as expensive premium
              light, not a neon outline. */}
          {tonePreset.haloEnabled ? (
            <Animated.View
              style={[
                styles.halo,
                {
                  width: faceW + 24,
                  height: faceH + 24,
                  borderRadius: (faceW + 24) / 2,
                  shadowColor: tonePreset.haloColor,
                  shadowOpacity:
                    tonePreset.haloIntensity ?? 0.4,
                  shadowRadius:
                    overlayTone === 'committing' ? 24 : 14,
                  elevation: overlayTone === 'committing' ? 14 : 8,
                  borderColor: tonePreset.haloColor,
                  borderWidth: 1,
                },
                sheenStyle,
              ]}
            />
          ) : null}
          <View
            style={{
              width: faceW,
              height: faceH,
              borderRadius: faceW / 2,
              borderWidth: tonePreset.borderWidth,
              borderColor: tonePreset.borderColor,
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
  // v11.5 — halo behind the oval. Position absolute so its size
  // doesn't push the oval. Inherits sheen scale from sheenStyle.
  halo: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
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
