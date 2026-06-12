/**
 * ReadinessSegments — minimal, honest readiness.
 *
 * Four slim segments — Face · Framing · Light · Sharp — that fill
 * ONLY when the engine's real booleans pass. No pills, no points,
 * no checkmark theatre: a quiet instrument strip under the guidance
 * line. A soft haptic tick marks each newly earned pass.
 *
 *   Face    = faceDetected && facePoseOk   (the gaze truly meets you)
 *   Framing = faceDistanceOk && faceCentered
 *   Light   = lightOk
 *   Sharp   = sharpnessOk                  (focus + stillness)
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import type { ScanQualitySignals } from '@/scanQuality/types';
import { gaze } from './gazeTokens';

const SEG_W = 44;
const SEG_H = 3;

/** The four segments carry the aurora left→right: violet → cyan. */
const SEG_RAMP = [
  'rgba(186, 170, 240, 1)',
  'rgba(158, 176, 238, 1)',
  'rgba(150, 198, 234, 1)',
  'rgba(150, 214, 232, 1)',
] as const;

function Segment({
  label,
  passed,
  rampColor,
}: {
  label: string;
  passed: boolean;
  rampColor: string;
}) {
  const fill = useSharedValue(passed ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(passed ? 1 : 0, { duration: 340 });
  }, [passed, fill]);
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
    opacity: 0.55 + 0.45 * fill.value,
  }));
  return (
    <View
      style={styles.seg}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label} check ${passed ? 'passed' : 'not yet'}`}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: rampColor }, fillStyle]} />
      </View>
      <Text
        style={[styles.label, passed && styles.labelPassed]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </View>
  );
}

export function ReadinessSegments({ signals }: { signals: ScanQualitySignals }) {
  const passes = {
    face: signals.faceDetected && signals.facePoseOk,
    framing: signals.faceDistanceOk && signals.faceCentered,
    light: signals.lightOk,
    sharp: signals.sharpnessOk,
  };

  // One soft tick per newly earned pass — sparse, composed.
  const prevRef = useRef(passes);
  useEffect(() => {
    const prev = prevRef.current;
    if (
      (passes.face && !prev.face) ||
      (passes.framing && !prev.framing) ||
      (passes.light && !prev.light) ||
      (passes.sharp && !prev.sharp)
    ) {
      hapt.select();
    }
    prevRef.current = passes;
  }, [passes.face, passes.framing, passes.light, passes.sharp]);

  return (
    <View style={styles.row} pointerEvents="none">
      <Segment label="Face" passed={passes.face} rampColor={SEG_RAMP[0]} />
      <Segment label="Framing" passed={passes.framing} rampColor={SEG_RAMP[1]} />
      <Segment label="Light" passed={passes.light} rampColor={SEG_RAMP[2]} />
      <Segment label="Sharp" passed={passes.sharp} rampColor={SEG_RAMP[3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  seg: { alignItems: 'center', gap: 5 },
  track: {
    width: SEG_W,
    height: SEG_H,
    borderRadius: SEG_H / 2,
    backgroundColor: gaze.segmentTrack,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SEG_H / 2,
    transformOrigin: 'left',
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: gaze.segmentLabel,
  },
  labelPassed: { color: gaze.segmentLabelPassed },
});
