import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette, radius } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface FaceGuideProps {
  width: number;
  height: number;
  pulsing?: boolean;
  active?: boolean;
  mode?: 'face' | 'product';
  style?: StyleProp<ViewStyle>;
}

/**
 * v5 patch §3.5 — one confident hairline reticle. Face = single oval.
 * Product = single rounded rect + 4 corner brackets (no inner rectangle).
 * Pulse is opacity-only (0.4 → 0.6 → 0.4 over 2.2s). No double-stroke,
 * no extra barcode line, no filled brackets.
 */
export function FaceGuide({
  width,
  height,
  pulsing = true,
  active = false,
  mode = 'face',
  style,
}: FaceGuideProps) {
  const pulse = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (pulsing && !reduceMotion) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = reduceMotion ? 0.5 : 0;
    }
    return () => cancelAnimation(pulse);
  }, [pulsing, reduceMotion, pulse]);

  // Opacity 0.4 → 0.6 → 0.4 per spec
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.2 * pulse.value,
  }));

  const strokeColor = active ? palette.clay : palette.clay;
  const shapeRadius = mode === 'face' ? width * 0.5 : radius.xl;

  return (
    <View
      style={[styles.container, { width, height }, style]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.guide,
          {
            width,
            height,
            borderRadius: shapeRadius,
            borderColor: strokeColor,
          },
          pulseStyle,
        ]}
      />

      {mode === 'product' ? (
        <>
          <View style={[styles.corner, styles.cornerTL, { borderColor: strokeColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: strokeColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: strokeColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: strokeColor }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    position: 'absolute',
    borderWidth: 1,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  cornerTL: {
    top: 4,
    left: 4,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderTopLeftRadius: radius.md,
  },
  cornerTR: {
    top: 4,
    right: 4,
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
    borderTopRightRadius: radius.md,
  },
  cornerBL: {
    bottom: 4,
    left: 4,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: radius.md,
  },
  cornerBR: {
    bottom: 4,
    right: 4,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderBottomRightRadius: radius.md,
  },
});
