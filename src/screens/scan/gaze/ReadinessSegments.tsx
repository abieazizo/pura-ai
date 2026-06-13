/**
 * ReadinessSegments — the quiet progress read.
 *
 * Four slim segments that fill ONLY when the engine's real booleans
 * pass. They answer "how close am I?" (how many checks are met) while
 * the guidance line answers "what's next?" (the one thing to fix) —
 * two genuinely different reads, not a restatement. No labels: on a
 * camera screen you GLANCE, you don't read; four filling bars say
 * "progress" at a glance and the guidance line carries the words. No
 * pills, no points, no checkmark theatre. A soft haptic marks each
 * newly earned pass.
 *
 *   Face    = faceDetected && facePoseOk   (the gaze truly meets you)
 *   Framing = faceDistanceOk && faceCentered
 *   Light   = lightOk
 *   Sharp   = sharpnessOk                  (focus + stillness)
 *
 * Decorative: the strip is inside a pointerEvents='none' overlay, so
 * per-segment a11y labels would be unreachable (illusory). The spoken
 * coaching + capture beat live in ScanCaptureScreen's announcements;
 * this strip is hidden from the AT tree. React.memo'd on the four
 * booleans so it reconciles only when a check flips, not at 15Hz.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import type { ScanQualitySignals } from '@/scanQuality/types';
import { gaze } from './gazeTokens';

const SEG_W = 40;
const SEG_H = 3;

/** The four segments carry the aurora left→right: violet → cyan. */
const SEG_RAMP = [
  'rgba(186, 170, 240, 1)',
  'rgba(158, 176, 238, 1)',
  'rgba(150, 198, 234, 1)',
  'rgba(150, 214, 232, 1)',
] as const;

function Segment({ passed, rampColor }: { passed: boolean; rampColor: string }) {
  const fill = useSharedValue(passed ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(passed ? 1 : 0, { duration: 360 });
  }, [passed, fill]);
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
    opacity: 0.5 + 0.5 * fill.value,
  }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { backgroundColor: rampColor }, fillStyle]} />
    </View>
  );
}

interface Passes {
  face: boolean;
  framing: boolean;
  light: boolean;
  sharp: boolean;
}

function ReadinessSegmentsImpl({ passes }: { passes: Passes }) {
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
  }, [passes]);

  return (
    <View
      style={styles.row}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Segment passed={passes.face} rampColor={SEG_RAMP[0]} />
      <Segment passed={passes.framing} rampColor={SEG_RAMP[1]} />
      <Segment passed={passes.light} rampColor={SEG_RAMP[2]} />
      <Segment passed={passes.sharp} rampColor={SEG_RAMP[3]} />
    </View>
  );
}

const MemoSegments = React.memo(
  ReadinessSegmentsImpl,
  (a, b) =>
    a.passes.face === b.passes.face &&
    a.passes.framing === b.passes.framing &&
    a.passes.light === b.passes.light &&
    a.passes.sharp === b.passes.sharp
);

/** Public wrapper: derives the four booleans, then the memo gate stops
 *  the 15Hz score churn from reconciling the strip. */
export function ReadinessSegments({ signals }: { signals: ScanQualitySignals }) {
  return (
    <MemoSegments
      passes={{
        face: signals.faceDetected && signals.facePoseOk,
        framing: signals.faceDistanceOk && signals.faceCentered,
        light: signals.lightOk,
        sharp: signals.sharpnessOk,
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
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
});
