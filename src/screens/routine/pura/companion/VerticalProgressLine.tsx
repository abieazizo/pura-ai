/**
 * Vertical progress line — the companion's quiet spine, now a ritual ladder.
 *
 * A 2px rail down the screen's left edge (inset 8px). A muted track runs
 * full height; a Pura Blue fill grows from the top in proportion to the
 * day's completion, easing over 800ms whenever a step is marked done.
 *
 * Cycle 6 turned the bare rail into a measured climb: one small node sits at
 * each step's landing point, and each node *lights precisely as the rising
 * fill passes it* (the lit state reads the live fill height on the UI thread,
 * so the blue never gets ahead of the bloom). At 100% the foot of the line
 * blooms once — a soft Pura Blue ring expands and fades — and a steady glow
 * settles beneath it.
 *
 * Presentational: it reads the active time-of-day's completion ratio plus the
 * step counts (total / done) from the companion model and animates to them.
 */

import React from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { CC, companionGeo, companionMotion, companionShadows } from './companionTokens';

export interface VerticalProgressLineProps {
  /** 0..1 completion ratio for the active time of day. */
  ratio: number;
  /**
   * Total steps for the active time of day (ladder rung count). Optional so
   * the empty-state spine can render at rest with no rungs (`total = 0`).
   */
  total?: number;
  /** Steps completed so far (drives accessibility + the bloom trigger). */
  done?: number;
}

export function VerticalProgressLine({
  ratio,
  total = 0,
  done = 0,
}: VerticalProgressLineProps) {
  const reduceMotion = useReduceMotion();
  const [railHeight, setRailHeight] = React.useState(0);
  const fillHeight = useSharedValue(0);
  const clamped = ratio <= 0 ? 0 : ratio >= 1 ? 1 : ratio;
  const full = clamped >= 1 && total > 0;

  React.useEffect(() => {
    const target = clamped * railHeight;
    if (reduceMotion) {
      cancelAnimation(fillHeight);
      fillHeight.value = target;
      return;
    }
    fillHeight.value = withTiming(target, {
      duration: companionMotion.progressFill,
      easing: companionMotion.entrance,
    });
  }, [clamped, railHeight, reduceMotion, fillHeight]);

  const fillStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    setRailHeight(e.nativeEvent.layout.height);
  }, []);

  // One node per step, at the point on the rail that step reaches when done.
  // The very top (0) needs no node; the last sits at the foot (where the
  // bloom lives), so we draw nodes 1..total-1 as interior rungs and let the
  // glow cap own the final landing.
  const nodes = React.useMemo(() => {
    if (railHeight <= 0 || total <= 1) return [] as number[];
    const out: number[] = [];
    for (let i = 1; i < total; i += 1) out.push((i / total) * railHeight);
    return out;
  }, [railHeight, total]);

  return (
    <View
      pointerEvents="none"
      style={styles.rail}
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: done }}
    >
      <View style={styles.track} />
      <Animated.View style={[styles.fill, fillStyle]} />
      {nodes.map((pos, i) => (
        <LadderNode key={i} pos={pos} fillHeight={fillHeight} />
      ))}
      {full ? <BloomCap reduceMotion={reduceMotion} /> : null}
    </View>
  );
}

/**
 * A single rung. Reads the live fill height on the UI thread and lights
 * (hollow gray ring → filled blue dot) the instant the fill passes it, so
 * the ladder illuminates in perfect lock-step with the rising line.
 */
function LadderNode({
  pos,
  fillHeight,
}: {
  pos: number;
  fillHeight: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const lit = fillHeight.value >= pos - 0.5;
    return {
      backgroundColor: lit ? CC.blue : CC.porcelain,
      borderColor: lit ? CC.blue : CC.lineTrack,
    };
  });
  return (
    <Animated.View style={[styles.node, { top: pos - NODE / 2 }, style]} />
  );
}

/** The 100% bloom — a soft ring that expands and fades once, then a steady glow. */
function BloomCap({ reduceMotion }: { reduceMotion: boolean }) {
  const ring = useSharedValue(0);
  React.useEffect(() => {
    if (reduceMotion) return;
    ring.value = 0;
    ring.value = withTiming(1, {
      duration: companionMotion.celebrationRingMs,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(ring);
  }, [reduceMotion, ring]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * 0.5,
    transform: [{ scale: 0.5 + ring.value * 2.4 }],
  }));

  return (
    <>
      {reduceMotion ? null : (
        <Animated.View pointerEvents="none" style={[styles.bloomRing, ringStyle]} />
      )}
      <Animated.View
        entering={FadeIn.duration(320)}
        exiting={FadeOut.duration(180)}
        style={styles.glowCap}
      />
    </>
  );
}

const W = companionGeo.progressLineWidth;
const NODE = companionGeo.progressNode;

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: companionGeo.progressLineInset,
    top: 0,
    bottom: 0,
    width: W,
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CC.lineTrack,
    borderRadius: W / 2,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    backgroundColor: CC.blue,
    borderRadius: W / 2,
  },
  node: {
    position: 'absolute',
    left: W / 2 - NODE / 2,
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 1.5,
  },
  bloomRing: {
    position: 'absolute',
    bottom: -7,
    left: W / 2 - 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: CC.blueRing,
  },
  glowCap: {
    position: 'absolute',
    bottom: 0,
    left: W / 2 - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CC.blue,
    ...companionShadows.blueGlow,
  },
});
