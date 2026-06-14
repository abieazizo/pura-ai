/**
 * AtmosphericLight — the BACK plane. A soft cool-blue radial near top-center
 * that breathes slowly (scale 1↔1.06, ~6s) + a faint bottom vignette. The
 * screen is LIT, not flat-filled. Drifts slowest on scroll (bounded). Worklet /
 * rAF only — never setTimeout. Stills under reduce-motion.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { edit, motion } from './tokens';

export function AtmosphericLight({
  scrollY,
  reduceMotion,
}: {
  scrollY: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motion.atmosphere.halfMs, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: motion.atmosphere.halfMs, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      breath.value = 0;
    };
  }, [reduceMotion, breath]);

  const lightStyle = useAnimatedStyle(() => {
    const s =
      motion.atmosphere.scaleMin +
      breath.value * (motion.atmosphere.scaleMax - motion.atmosphere.scaleMin);
    // Drifts slowest: ease up a little as you scroll, then hold (bounded).
    const drift = -Math.min(scrollY.value * motion.backDrift, motion.backDriftMaxPx);
    return { transform: [{ translateY: drift }, { scale: s }] };
  });

  // The radial is sized generously so its soft edge always feathers off-screen.
  const w = width * 1.6;
  const h = height * 1.1;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -h * 0.32,
            left: (width - w) / 2,
            width: w,
            height: h,
          },
          lightStyle,
        ]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="edit-light" cx="50%" cy="38%" r="60%">
              <Stop offset="0%" stopColor={edit.blue} stopOpacity={0.05} />
              <Stop offset="55%" stopColor={edit.blue} stopOpacity={0.018} />
              <Stop offset="100%" stopColor={edit.blue} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#edit-light)" />
        </Svg>
      </Animated.View>

      {/* Bottom vignette — the screen sits in soft light, grounded below. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.34 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="edit-vignette" cx="50%" cy="120%" r="90%">
              <Stop offset="0%" stopColor={edit.ink} stopOpacity={0.03} />
              <Stop offset="70%" stopColor={edit.ink} stopOpacity={0.012} />
              <Stop offset="100%" stopColor={edit.ink} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#edit-vignette)" />
        </Svg>
      </View>
    </View>
  );
}
