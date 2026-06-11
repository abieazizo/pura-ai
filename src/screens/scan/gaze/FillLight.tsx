/**
 * FillLight — the screen becomes a softbox.
 *
 * When the engine's live lightLevel says the room is dim (the
 * hysteresis decision arrives via `active`), warm light blooms in
 * from the screen edges to throw flattering fill on the face, and a
 * gentle lift brightens the whole preview. Eases in and out over
 * ~650ms — it should feel like someone quietly turning a lamp up,
 * never a flash. The center stays clear: the user still sees
 * themselves, now lit.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gaze } from './gazeTokens';
import { MOTION } from './gazeMotion';

const EDGE = 110;

export function FillLight({ active }: { active: boolean }) {
  const on = useSharedValue(0);
  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, {
      duration: MOTION.FILL_MS,
      easing: MOTION.easeInOut,
    });
  }, [active, on]);
  const style = useAnimatedStyle(() => ({ opacity: on.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* Whole-screen lift. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: gaze.fillLift }]} />
      {/* Warm edge blooms — top, bottom, left, right. */}
      <LinearGradient
        colors={[gaze.fillWarm, gaze.fillWarmSoft]}
        style={[styles.edge, { top: 0, left: 0, right: 0, height: EDGE }]}
      />
      <LinearGradient
        colors={[gaze.fillWarmSoft, gaze.fillWarm]}
        style={[styles.edge, { bottom: 0, left: 0, right: 0, height: EDGE }]}
      />
      <LinearGradient
        colors={[gaze.fillWarm, gaze.fillWarmSoft]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.edge, { top: 0, bottom: 0, left: 0, width: EDGE }]}
      />
      <LinearGradient
        colors={[gaze.fillWarmSoft, gaze.fillWarm]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.edge, { top: 0, bottom: 0, right: 0, width: EDGE }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute' },
});
