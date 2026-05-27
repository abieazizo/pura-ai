/**
 * CapturedFaceFrame — the rounded photo card used by the loading slide
 * and the skin-map slide.
 *
 * Two visual modes:
 *   • `scanning` true  — a thin warm scan beam sweeps top→bottom over
 *     the photo while a soft coral halo breathes behind it. Used on
 *     the analyzing screen.
 *   • `scanning` false — overlays draw via FaceOverlayCanvas. Used on
 *     the skin-map slide.
 *
 * The photo itself fades + scales in on first mount so the analyzing
 * screen never feels static.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type {
  FaceLandmarkResult,
  ImageRenderTransform,
  VisibleFinding,
} from '@/types/scanResults';
import { buildImageRenderTransform } from '@/services/scanResults/imageTransform';
import { scanColors, scanRadius, scanShadows } from '@/theme/scanResultsTokens';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { FaceOverlayCanvas } from './FaceOverlayCanvas';

export interface CapturedFaceFrameProps {
  photoUri: string;
  width: number;
  height: number;
  resizeMode?: 'cover' | 'contain';
  geometry?: FaceLandmarkResult | null;
  visibleFindings?: VisibleFinding[];
  selectedFindingId?: string | null;
  scanning?: boolean;
  /** Soft coral halo that breathes behind the photo. */
  glow?: boolean;
  /** Optional landmark dot reveal — fades in once geometry is ready
   *  to signal "mapping". Only used during scanning mode. */
  showLandmarkDots?: boolean;
  /** When provided, tapping the photo reports the nearest concern's id
   *  (or null if the tap was outside any zone). Forwarded to
   *  `FaceOverlayCanvas.onZonePress`. */
  onZonePress?(findingId: string | null): void;
}

export function CapturedFaceFrame({
  photoUri,
  width,
  height,
  resizeMode = 'cover',
  geometry = null,
  visibleFindings = [],
  selectedFindingId = null,
  scanning = false,
  glow = false,
  showLandmarkDots = false,
  onZonePress,
}: CapturedFaceFrameProps) {
  const reduceMotion = useReduceMotion();

  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!photoUri) return;
    RNImage.getSize(
      photoUri,
      (w, h) => {
        if (cancelled) return;
        if (w > 0 && h > 0) setNaturalSize({ width: w, height: h });
      },
      () => {
        if (!cancelled) setNaturalSize({ width: 3, height: 4 });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  const transform = useMemo<ImageRenderTransform | null>(() => {
    if (!naturalSize) return null;
    return buildImageRenderTransform({
      sourceWidth: naturalSize.width,
      sourceHeight: naturalSize.height,
      renderedWidth: width,
      renderedHeight: height,
      resizeMode,
      mirrored: false,
    });
  }, [naturalSize, width, height, resizeMode]);

  // ---- Animation: photo entrance ----
  const enterOpacity = useSharedValue(0);
  const enterScale = useSharedValue(0.985);
  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    enterScale.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [enterOpacity, enterScale]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ scale: enterScale.value }],
  }));

  // ---- Animation: scan beam (loops while `scanning` is true) ----
  const beamProgress = useSharedValue(0);
  useEffect(() => {
    if (!scanning || reduceMotion) {
      cancelAnimation(beamProgress);
      beamProgress.value = 0;
      return;
    }
    beamProgress.value = 0;
    beamProgress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false
    );
    return () => cancelAnimation(beamProgress);
  }, [scanning, reduceMotion, beamProgress]);

  const beamStyle = useAnimatedStyle(() => {
    if (!scanning) return { opacity: 0 };
    const p = beamProgress.value;
    // Fade-in at start of sweep, fade-out at end, fully visible in the middle.
    const fade = p < 0.18 ? p / 0.18 : p > 0.82 ? (1 - p) / 0.18 : 1;
    return {
      transform: [{ translateY: p * (height - 10) }],
      opacity: 0.78 * Math.max(0, Math.min(1, fade)),
    };
  });

  // ---- Animation: ambient halo behind photo ----
  const haloScale = useSharedValue(1);
  useEffect(() => {
    if (!glow || reduceMotion) {
      cancelAnimation(haloScale);
      haloScale.value = 1;
      return;
    }
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(haloScale);
  }, [glow, reduceMotion, haloScale]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
  }));

  // ---- Animation: landmark dots fade-in ----
  const landmarkOpacity = useSharedValue(0);
  useEffect(() => {
    if (!showLandmarkDots) {
      landmarkOpacity.value = withTiming(0, { duration: 200 });
      return;
    }
    landmarkOpacity.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [showLandmarkDots, landmarkOpacity]);

  const landmarkStyle = useAnimatedStyle(() => ({
    opacity: landmarkOpacity.value,
  }));

  return (
    <View style={styles.outer}>
      {glow && (
        <Animated.View
          style={[
            styles.glow,
            { width: width * 1.18, height: height * 1.08 },
            haloStyle,
          ]}
          pointerEvents="none"
        />
      )}
      <Animated.View
        style={[
          styles.frame,
          { width, height, borderRadius: scanRadius.imageFrame },
          scanShadows.card,
          frameStyle,
        ]}
      >
        <ExpoImage
          source={{ uri: photoUri }}
          style={styles.image}
          contentFit={resizeMode}
          transition={120}
          cachePolicy="memory"
        />
        {scanning ? (
          <>
            <Animated.View style={[styles.scanBeam, beamStyle]} pointerEvents="none">
              <View style={styles.scanBeamCore} />
              <View style={styles.scanBeamHalo} />
            </Animated.View>
            {showLandmarkDots && transform && geometry?.usableForOverlay ? (
              <Animated.View
                style={[styles.landmarkLayer, landmarkStyle]}
                pointerEvents="none"
              >
                <LandmarkDots geometry={geometry} transform={transform} />
              </Animated.View>
            ) : null}
          </>
        ) : (
          <FaceOverlayCanvas
            width={width}
            height={height}
            geometry={geometry}
            transform={transform}
            visibleFindings={visibleFindings}
            selectedFindingId={selectedFindingId}
            onZonePress={onZonePress}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// LandmarkDots — sparse mapping anchors. No concern colors yet; this is
// purely a "we're looking" cue during analysis.
// ---------------------------------------------------------------------------

function LandmarkDots({
  geometry,
  transform,
}: {
  geometry: FaceLandmarkResult;
  transform: ImageRenderTransform;
}) {
  const points = useMemo(() => {
    const { landmarks: lm, faceBounds: fb } = geometry;
    return [
      lm.leftEye,
      lm.rightEye,
      lm.noseTip,
      lm.mouthCenter,
      lm.chin,
      lm.foreheadCenter,
      { x: fb.x + fb.width * 0.18, y: fb.y + fb.height * 0.45 },
      { x: fb.x + fb.width * 0.82, y: fb.y + fb.height * 0.45 },
    ].map((p) => ({
      x:
        p.x * transform.sourceWidth * transform.scale +
        transform.offsetX,
      y:
        p.y * transform.sourceHeight * transform.scale +
        transform.offsetY,
    }));
  }, [geometry, transform]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {points.map((p, i) => (
        <View
          key={i}
          style={[
            styles.landmarkDot,
            { left: p.x - 2.5, top: p.y - 2.5 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: scanColors.peachGlow,
    opacity: 0.42,
  },
  frame: {
    backgroundColor: scanColors.cardSoft,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
  },
  scanBeamCore: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 4,
    height: 1.4,
    backgroundColor: 'rgba(255, 240, 222, 0.95)',
    borderRadius: 1,
  },
  scanBeamHalo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 10,
    backgroundColor: 'rgba(255, 217, 204, 0.32)',
  },
  landmarkLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  landmarkDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 240, 222, 0.92)',
    shadowColor: '#E98973',
    shadowOpacity: 0.8,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
