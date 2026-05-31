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
import { CornflowerArc } from '@/components/scan/CornflowerArc';

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
  // v35 Pass-1 — State 2 "The Breath". Idle face mode adds a single
  // terracotta dot below the face oval that pulses on a 3.5s inhale/
  // exhale rhythm. Sets the ceremony's tempo BEFORE the user knows
  // they're being scanned — invitation to slow down. Initial pick
  // implementation: dot is added, oval stays. Pass 2 may push further
  // by removing instruction copy and reducing oval opacity if the
  // breath dot proves to be sufficient anchor on its own.
  const breathPulse = useSharedValue(0);

  // Continuous gentle pulse on the reticle border opacity (idle state).
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.5;
      scanLine.value = 0;
      breathPulse.value = 0.7;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    breathPulse.value = withRepeat(
      withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(breathPulse);
    };
  }, [reduceMotion, pulse, scanLine, breathPulse]);

  // v35 Pass-1 — the old `sheen` shared value drove the moss halo
  // pulse during `preparing`. CornflowerArc now owns the preparing
  // state's animation entirely (its own internal sweep + ember
  // timing). The sheen value, its useEffect, and its style are
  // intentionally removed.

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

  // The Breath dot — inhale: dot grows + brightens. Exhale: recedes
  // + softens. Drives both opacity and scale on the same 3.5s phase.
  const breathDotStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + 0.46 * breathPulse.value,
    transform: [{ scale: 0.82 + 0.28 * breathPulse.value }],
  }));

  // Tone preset: only face mode flips between idle and preparing;
  // product and barcode keep the clean clay stroke at all times
  // (those modes never enter a countdown).
  //
  // v35 Pass-1 — preparing state is now THE signature moment. The
  // moss halo + sheen treatment is retired in favor of CornflowerArc
  // (see ../CornflowerArc.tsx for the full design spec). The oval
  // itself recedes (cornflower at 18% opacity, 1pt) so the arc leads
  // the eye. Idle stays untouched — clay stroke + gentle pulse.
  const isFacePreparing = mode === 'face' && frameState === 'preparing';
  const tonePreset = {
    borderColor: isFacePreparing
      ? 'rgba(124, 176, 255, 0.18)' // cornflower @ 18% — oval recedes, arc leads
      : palette.clay,
    borderWidth: isFacePreparing ? 1 : STROKE,
  };

  // v11.9 — face oval scales to its container with a fixed 1.3:1
  // height:width aspect ratio (matches a natural portrait face). The
  // oval is sized so it fits comfortably within the parent container
  // even on small phones where the camera region is short.
  //
  // ScanOverlay v11.9 wraps the reticle in a CAMERA REGION rect
  // (height = window height - top bar - bottom panel) so the oval
  // never overlaps the bottom dock chrome.
  const faceW = Math.min(
    Math.round(screenWidth * 0.78),
    Math.round(screenHeight * 0.7)
  );
  const faceH = Math.round(faceW * 1.3);

  // Product frame: similar scaling, slightly squarer aspect.
  const prodW = Math.min(
    Math.round(screenWidth * 0.82),
    Math.round(screenHeight * 0.85)
  );
  const prodH = Math.round(prodW * 1.05);

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
          {/* v35 Pass-1 — CornflowerArc replaces the moss halo for
              the preparing state. The signature instrument: 1.5pt
              cornflower stroke sweeping 270° around the oval over
              1.8s, releasing a terracotta ember at completion. */}
          {isFacePreparing ? (
            <CornflowerArc
              ovalWidth={faceW}
              ovalHeight={faceH}
              active={isFacePreparing}
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

          {/* v35 Pass-1 — "The Breath" idle dot. Only renders in the
              IDLE state (preparing has its own signature instrument).
              Positioned below the oval, terracotta, pulses on a 3.5s
              breath rhythm. Sets the ceremony's tempo without saying
              a word. */}
          {!isFacePreparing ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.breathDot,
                { top: faceH / 2 + 32 },
                breathDotStyle,
              ]}
            />
          ) : null}
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
  // v35 Pass-1 — the old `halo` style supported the moss-halo
  // sheen during `preparing`. CornflowerArc owns that role now.
  // "The Breath" idle dot — terracotta, soft warm glow, sits
  // centered below the face oval.
  breathDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C97A5A', // terracotta — Pura's brand warmth
    shadowColor: '#C97A5A',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
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
