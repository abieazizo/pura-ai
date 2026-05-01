/**
 * Beat 5 visual — a luminous horizontal sweep that travels down the
 * face while the AI is "measuring."
 *
 * v10.17 — fills the Beat 5 ("score") seam created when v10.16 removed
 * the per-zone numeric bubbles. A caption alone ("Preparing your
 * result.") left 1.2s of visual silence; the sweep restores a sense of
 * arrival without reintroducing numbers on the face.
 *
 * Design rules:
 *   • One sweep, top → bottom, over ~900ms (well within the 1200ms beat).
 *   • Thin rounded rect, ~1.5pt tall with a soft radial-style bloom above
 *     and below the line.
 *   • Clay-tinted so it reads as part of the Pura palette, not a cold
 *     "processing" blue.
 *   • Fades in over the first 12% of its travel, fades out over the
 *     last 15%, so the line never hard-edges in or out.
 *   • No numbers, no labels, no geometry on top of the line. The sweep
 *     is the whole visual event.
 *
 * Reduce-motion: the sweep does not render (caption already announces
 * the beat for VoiceOver).
 */

import React, { useEffect } from 'react';
import { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface MeasuringSweepProps {
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
  /** Beat 5 window in ms. The sweep scales to fit inside this window
   *  with a small safety margin so it never gets cut mid-travel when
   *  the user is on compressed or minimal pacing. */
  durationMs: number;
}

const BAND_HEIGHT_RATIO = 0.36; // visible bloom band height relative to photo
const LINE_THICKNESS = 1.5;

/** Clamp the sweep duration so it always fits within Beat 5, with a
 *  90% safety factor. Cap at 900ms so the first-scan full cadence
 *  doesn't feel slow. */
function resolveSweepDuration(beatDurationMs: number): number {
  const CAP = 900;
  const safety = beatDurationMs * 0.9;
  return Math.max(220, Math.min(CAP, safety));
}

export function MeasuringSweep({
  size,
  beat,
  reduceMotion,
  durationMs,
}: MeasuringSweepProps) {
  const sweepDuration = resolveSweepDuration(durationMs);
  // Opacity curve inside the sweep: fast ramp in, hold, gentle ramp out.
  // Scaled proportionally so the hold is always the middle ~55%.
  const rampIn = Math.max(120, Math.round(sweepDuration * 0.2));
  const rampOut = Math.max(180, Math.round(sweepDuration * 0.27));
  const hold = Math.max(0, sweepDuration - rampIn - rampOut);
  // progress is 0..1 where 0 = band centered just above the photo top edge
  // (so the top bloom is off-screen) and 1 = band centered just below the
  // photo bottom edge.
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0;
      progress.value = 0;
      return;
    }
    if (beat === 'score') {
      // Reset and start the travel.
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: sweepDuration,
        easing: Easing.inOut(Easing.quad),
      });
      opacity.value = 0;
      opacity.value = withSequence(
        withTiming(1, { duration: rampIn, easing: Easing.out(Easing.cubic) }),
        withDelay(
          hold,
          withTiming(0, { duration: rampOut, easing: Easing.in(Easing.cubic) })
        )
      );
    } else {
      opacity.value = withTiming(0, { duration: 160 });
    }
  }, [beat, reduceMotion, opacity, progress, sweepDuration, rampIn, rampOut, hold]);

  // Band geometry — a tall soft-edged rectangle painted with a vertical
  // linear gradient: transparent at top, peak at center, transparent at
  // bottom. We move the band's Y based on `progress`.
  const bandHeight = size.h * BAND_HEIGHT_RATIO;
  const halfBand = bandHeight / 2;

  const bandAnimatedProps = useAnimatedProps(() => {
    const centerY = -halfBand + progress.value * (size.h + bandHeight);
    return {
      y: centerY - halfBand,
      opacity: opacity.value * 0.55,
    };
  });

  const lineAnimatedProps = useAnimatedProps(() => {
    const centerY = -halfBand + progress.value * (size.h + bandHeight);
    return {
      y: centerY - LINE_THICKNESS / 2,
      opacity: opacity.value * 0.9,
    };
  });

  return (
    <>
      {/* v18.4 — sweep retinted from clay (warm) to pearl/cyan
          (#7CB0FF). On the deep ink backdrop this reads as a luxe
          beauty-tech scan band rather than a warm marketing tint. */}
      <Defs>
        <LinearGradient id="sweepBloom" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7CB0FF" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#A8C7FF" stopOpacity={1} />
          <Stop offset="1" stopColor="#7CB0FF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <AnimatedRect
        x={0}
        width={size.w}
        height={bandHeight}
        fill="url(#sweepBloom)"
        animatedProps={bandAnimatedProps}
      />

      <AnimatedRect
        x={0}
        width={size.w}
        height={LINE_THICKNESS}
        fill="#A8C7FF"
        animatedProps={lineAnimatedProps}
      />
    </>
  );
}
