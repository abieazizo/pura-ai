/**
 * Vertical progress line — the companion's quiet spine.
 *
 * A 2px rail down the screen's left edge (inset 8px). A muted track runs
 * full height; a Pura Blue fill grows from the top in proportion to the
 * day's completion, easing over 800ms whenever a step is marked done. At
 * 100% a soft Pura Blue glow settles at the foot of the line.
 *
 * Presentational: it reads one number — the active time-of-day's
 * completion ratio — from the companion model and animates to it.
 */

import React from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CC, companionGeo, companionMotion, companionShadows } from './companionTokens';

export interface VerticalProgressLineProps {
  /** 0..1 completion ratio for the active time of day. */
  ratio: number;
}

export function VerticalProgressLine({ ratio }: VerticalProgressLineProps) {
  const [railHeight, setRailHeight] = React.useState(0);
  const fillHeight = useSharedValue(0);
  const clamped = ratio <= 0 ? 0 : ratio >= 1 ? 1 : ratio;
  const full = clamped >= 1;

  React.useEffect(() => {
    fillHeight.value = withTiming(clamped * railHeight, {
      duration: companionMotion.progressFill,
      easing: companionMotion.entrance,
    });
  }, [clamped, railHeight, fillHeight]);

  const fillStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    setRailHeight(e.nativeEvent.layout.height);
  }, []);

  return (
    <View pointerEvents="none" style={styles.rail} onLayout={onLayout}>
      <View style={styles.track} />
      <Animated.View style={[styles.fill, fillStyle]} />
      {full ? (
        <Animated.View
          entering={FadeIn.duration(320)}
          exiting={FadeOut.duration(180)}
          style={styles.glowCap}
        />
      ) : null}
    </View>
  );
}

const W = companionGeo.progressLineWidth;

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
