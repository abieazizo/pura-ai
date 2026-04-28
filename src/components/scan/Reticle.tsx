/**
 * Camera reticle (v11.7).
 *
 * The previous version (v11.5–v11.6) carried an `OverlayTone` vocabulary
 * — neutral / warning / ready / committing — that mirrored a 14-state
 * face-detection machine. That machine required real on-device face
 * detection, which Expo Go cannot provide. v11.7 collapses the vocabulary
 * back to two honest states:
 *
 *   • idle      — quiet clay stroke + gentle pulse. Default at all times.
 *   • preparing — moss-tinted halo + sheen pulse. Only flips ON during
 *                 the 2-second countdown after the user taps capture.
 *
 * No fake "ready" cue. No green ring claiming a face has been detected
 * — because we don't know, and saying we do would be a lie.
 *
 * Once the user has tapped the shutter, the moss halo is HONEST: it
 * tells them "I'm preparing to capture, hold steady." After capture,
 * the analyzing screen takes over and the camera unmounts.
 */

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
 * v11.7 — the only two states a reticle should claim about itself
 * when the platform can't actually see what's in the frame.
 */
export type FrameState = 'idle' | 'preparing';

export interface ReticleProps {
  mode: ReticleMode;
  screenWidth: number;
  screenHeight: number;
  /**
   * v11.7 — drives the visual state. `idle` is the default (clay
   * stroke, gentle pulse). `preparing` flips on for the 2-second
   * countdown after the user taps capture (moss halo + sheen).
   */
  frameState?: FrameState;
}

const CORNER_EXT = 16;
const CORNER_LEN = 22;
const STROKE = 1;

export function Reticle({
  mode,
  screenWidth,
  screenHeight,
  frameState = 'idle',
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

  // v11.7 — sheen pulse only animates while preparing. Slow 1.6s
  // sweep that travels across the oval rim by mapping into a halo
  // ring opacity.
  useEffect(() => {
    if (frameState !== 'preparing') {
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
  }, [frameState, reduceMotion, sheen]);

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

  // Tone preset: only face mode flips between idle and preparing;
  // product and barcode keep the clean clay stroke at all times
  // (those modes never enter a countdown).
  const isFacePreparing = mode === 'face' && frameState === 'preparing';
  const tonePreset = isFacePreparing
    ? {
        borderColor: palette.mossDeep,
        borderWidth: 2,
        haloEnabled: true,
        haloColor: palette.mossDeep,
        haloIntensity: 0.45,
      }
    : {
        borderColor: palette.clay,
        borderWidth: STROKE,
        haloEnabled: false,
        haloColor: palette.clay,
        haloIntensity: 0,
      };

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
          {/* Soft outer halo only when preparing. Sits BEHIND the oval
              and grows with the sheen pulse so the commit moment reads
              as expensive premium light, not a neon outline. */}
          {tonePreset.haloEnabled ? (
            <Animated.View
              style={[
                styles.halo,
                {
                  width: faceW + 24,
                  height: faceH + 24,
                  borderRadius: (faceW + 24) / 2,
                  shadowColor: tonePreset.haloColor,
                  shadowOpacity: tonePreset.haloIntensity,
                  shadowRadius: 16,
                  elevation: 10,
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
  // v11.7 — halo behind the oval. Position absolute so its size doesn't
  // push the oval. Inherits sheen scale from sheenStyle. Only renders
  // while preparing.
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
