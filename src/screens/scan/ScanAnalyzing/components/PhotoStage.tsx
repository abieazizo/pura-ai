/**
 * The hero stage. Renders the captured photo + all overlay SVG children.
 * Exposes a ref so view-shot can composite the stage on Beat 6.
 *
 * Height / Y animate on enter-reveal via spring — photo compresses from
 * 460pt tall at y:92 to 380pt tall at y:72, clearing the bottom half of
 * the screen for the reveal footer.
 */

import React, { forwardRef, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { ScanResult, ScanZoneKey } from '@/types';
import {
  MARKER_POSITIONS,
  PHOTO_HEIGHT_ACTIVE,
  PHOTO_HEIGHT_REVEAL,
  PHOTO_MARGIN_H,
  PHOTO_RADIUS,
  PHOTO_Y_ACTIVE,
  PHOTO_Y_REVEAL,
  ZONE_RECTS,
  DEFAULT_FINDING_LABELS,
} from '../constants';
import type { Beat } from '../hooks/useAnalysisChoreography';
import { FaceOutline } from './FaceOutline';
import { LandmarkDots } from './LandmarkDots';
import { ZoneOverlay } from './ZoneOverlay';
import { DetectionMarker } from './DetectionMarker';
import { MeasuringSweep } from './MeasuringSweep';
import { AnalysisMesh } from './AnalysisMesh';

const WINDOW_W = Dimensions.get('window').width;
const PHOTO_WIDTH = WINDOW_W - PHOTO_MARGIN_H * 2;

const ZONE_ORDER: ScanZoneKey[] = ['forehead', 'tZone', 'chin', 'cheeks'];

export interface PhotoStageProps {
  photoUri: string;
  beat: Beat;
  revealMode: boolean;
  zonesVisible: [boolean, boolean, boolean, boolean];
  markersVisible: [boolean, boolean, boolean, boolean];
  reduceMotion: boolean;
  result: ScanResult | null;
  /** Beat 5 duration in ms (from the active BeatTiming). The measuring
   *  sweep scales itself to fit so compressed / minimal pacings don't
   *  cut the sweep mid-travel. */
  scoreBeatDuration: number;
}

export const PhotoStage = forwardRef<View, PhotoStageProps>(function PhotoStage(
  {
    photoUri,
    beat,
    revealMode,
    zonesVisible,
    markersVisible,
    reduceMotion,
    result,
    scoreBeatDuration,
  },
  ref
) {
  const heightSV = useSharedValue(PHOTO_HEIGHT_ACTIVE);
  const ySV = useSharedValue(PHOTO_Y_ACTIVE);
  const entranceOpacity = useSharedValue(0);
  const entranceScale = useSharedValue(1.04);

  // v35 Pass-1 — State 5 "The Ember Carry". The CornflowerArc on the
  // capture screen releases a terracotta ember at completion (6
  // o'clock terminus, drifts ~55% inward). The capture screen then
  // unmounts and PhotoStage mounts. To preserve the perception of a
  // single continuous gesture across the screen boundary, PhotoStage
  // re-materializes a matching terracotta ember at the bottom-center
  // of the photo and drifts it upward toward face-center over 700ms.
  // The user sees one ember crossing two screens; the perception of
  // continuity is what matters, not literal state hand-off.
  const emberOpacity = useSharedValue(0);
  const emberScale = useSharedValue(0.6);
  const emberDrift = useSharedValue(0); // 0 → 1 upward travel

  useEffect(() => {
    if (reduceMotion) {
      entranceOpacity.value = 1;
      entranceScale.value = 1;
      emberOpacity.value = 0; // skip the ember in reduce-motion mode
      return;
    }
    entranceOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    entranceScale.value = withSpring(1, { damping: 22, stiffness: 140 });

    // Ember carry — choreographed to start IMMEDIATELY on mount so the
    // perception is "the ember from the capture screen kept traveling."
    // 120ms ramp-in, 240ms hold visible, 340ms fade-out as it dissolves
    // into the analysis particles further up the face.
    emberOpacity.value = withTiming(1, {
      duration: 120,
      easing: Easing.out(Easing.cubic),
    });
    emberScale.value = withTiming(1.4, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    emberDrift.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    // Schedule fade-out as a separate timing so the dissolve into the
    // mesh reads as the ember "becoming" the analysis layer.
    const fadeTimer = setTimeout(() => {
      emberOpacity.value = withTiming(0, {
        duration: 340,
        easing: Easing.in(Easing.cubic),
      });
    }, 360);
    return () => clearTimeout(fadeTimer);
  }, [entranceOpacity, entranceScale, emberOpacity, emberScale, emberDrift, reduceMotion]);

  useEffect(() => {
    const targetH = revealMode ? PHOTO_HEIGHT_REVEAL : PHOTO_HEIGHT_ACTIVE;
    const targetY = revealMode ? PHOTO_Y_REVEAL : PHOTO_Y_ACTIVE;
    if (reduceMotion) {
      heightSV.value = targetH;
      ySV.value = targetY;
      return;
    }
    heightSV.value = withSpring(targetH, { damping: 22, stiffness: 140 });
    ySV.value = withSpring(targetY, { damping: 22, stiffness: 140 });
  }, [revealMode, heightSV, ySV, reduceMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: ySV.value,
    left: PHOTO_MARGIN_H,
    width: PHOTO_WIDTH,
    height: heightSV.value,
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  // Ember position: starts at the bottom-center (mirroring the
  // CornflowerArc's 6 o'clock terminus), drifts upward by ~60% of the
  // photo height toward face-center. Scale grows as it travels so the
  // ember reads as the seed of the analysis layer "blooming" into the
  // mesh, not a static pinpoint.
  const emberStyle = useAnimatedStyle(() => {
    const photoH = revealMode ? PHOTO_HEIGHT_REVEAL : PHOTO_HEIGHT_ACTIVE;
    const travelDistance = photoH * 0.6;
    return {
      position: 'absolute',
      left: PHOTO_WIDTH / 2 - 7,
      top: photoH - 18,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#C97A5A', // terracotta — Pura's brand warmth
      shadowColor: '#C97A5A',
      shadowOpacity: 0.7,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
      opacity: emberOpacity.value,
      transform: [
        { translateY: -travelDistance * emberDrift.value },
        { scale: emberScale.value },
      ],
    };
  });

  // SVG dimensions follow the non-animated "current" height so overlays lay
  // out cleanly — spring-interpolating the SVG viewBox every frame is
  // expensive and visually noisy. Snapping on beat change looks seamless
  // because the compress transition runs while the SVG is already
  // low-opacity (settle → reveal).
  const currentHeight = revealMode ? PHOTO_HEIGHT_REVEAL : PHOTO_HEIGHT_ACTIVE;

  return (
    <Animated.View ref={ref} style={containerStyle} collapsable={false}>
      <View style={styles.wrapper}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
        />
        {/* Warm tint wash — ~5% terracotta over the photo to key it to the
            analytical feel. Never a cold blue cyan. */}
        <View style={styles.processTint} pointerEvents="none" />

        {/* v35 Pass-1 — State 5 "The Ember Carry". Terracotta ember
            materializes at bottom-center mirroring the CornflowerArc's
            6 o'clock terminus, drifts upward and dissolves into the
            analysis layer. Reads as the same ember from the capture
            screen, continuing its travel across the screen boundary. */}
        <Animated.View pointerEvents="none" style={emberStyle} />

        <Svg
          width={PHOTO_WIDTH}
          height={currentHeight}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <FaceOutline
            size={{ w: PHOTO_WIDTH, h: currentHeight }}
            beat={beat}
            reduceMotion={reduceMotion}
          />

          {/* v11.9 — soft azure analysis mesh sitting between the
              face contour and the zone overlays. Fades in during
              PARTITION/DETECT so the screen reads as "the system is
              reasoning over the face" rather than a static portrait
              with regions stacked on top. */}
          <AnalysisMesh
            size={{ w: PHOTO_WIDTH, h: currentHeight }}
            beat={beat}
            reduceMotion={reduceMotion}
          />

          <LandmarkDots
            size={{ w: PHOTO_WIDTH, h: currentHeight }}
            beat={beat}
            reduceMotion={reduceMotion}
          />

          {ZONE_ORDER.map((zone, i) => (
            <ZoneOverlay
              key={zone}
              zone={zone}
              rects={ZONE_RECTS[zone]}
              photoSize={{ w: PHOTO_WIDTH, h: currentHeight }}
              visible={zonesVisible[i]}
              beat={beat}
              reduceMotion={reduceMotion}
            />
          ))}

          {MARKER_POSITIONS.map((pos, i) => {
            const finding = result?.findings[i];
            const label =
              finding?.label ?? DEFAULT_FINDING_LABELS[pos.type];
            return (
              <DetectionMarker
                key={i}
                cx={pos.x * PHOTO_WIDTH}
                cy={pos.y * currentHeight}
                type={pos.type}
                label={label}
                visible={markersVisible[i]}
                beat={beat}
                reduceMotion={reduceMotion}
                index={i}
                photoSize={{ w: PHOTO_WIDTH, h: currentHeight }}
              />
            );
          })}

          {/* v10.17 — Beat 5 measuring sweep. A luminous clay-tinted
              band travels top → bottom within the Beat 5 window while
              the caption reads "Preparing your result." Fills the
              visual seam left when v10.16 removed per-zone numeric
              bubbles, without reintroducing numbers on the face. The
              sweep scales itself to fit compressed / minimal pacings. */}
          <MeasuringSweep
            size={{ w: PHOTO_WIDTH, h: currentHeight }}
            beat={beat}
            reduceMotion={reduceMotion}
            durationMs={scoreBeatDuration}
          />
        </Svg>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // v18.4 — premium analyzing wrapper. Soft pearl/cyan glow shadow
  // sits behind the photo on the deep-ink backdrop so the photo
  // appears to float. Process tint switches from warm-clay to a
  // cool ~3% slate that keeps the captured face true-color while
  // signalling "in analysis" without yellowing the skin.
  wrapper: {
    width: '100%',
    height: '100%',
    borderRadius: PHOTO_RADIUS,
    overflow: 'hidden',
    backgroundColor: palette.bgInkElevated,
    shadowColor: '#7CB0FF',
    shadowOpacity: 0.18,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  processTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.12)',
  },
});

export { PHOTO_WIDTH };
