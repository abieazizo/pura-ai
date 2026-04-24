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

  useEffect(() => {
    if (reduceMotion) {
      entranceOpacity.value = 1;
      entranceScale.value = 1;
      return;
    }
    entranceOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    entranceScale.value = withSpring(1, { damping: 22, stiffness: 140 });
  }, [entranceOpacity, entranceScale, reduceMotion]);

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
  wrapper: {
    width: '100%',
    height: '100%',
    borderRadius: PHOTO_RADIUS,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    // Warm shadow — paper-hued, not gray.
    shadowColor: palette.clay,
    shadowOpacity: 0.08,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  processTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(198,93,72,0.05)', // palette.clay @ 5%
  },
});

export { PHOTO_WIDTH };
