/**
 * WhyExpander — smooth height-animated inline explanation panel.
 *
 * The "Why was this removed?" toggle on the post-scan home was a
 * mount/unmount snap. Designers reading the spec note that this is a
 * key moment of trust — Pura is opening up about a decision — so the
 * panel should *reveal*, not appear.
 *
 * Implementation: measure the child's natural height once, then drive
 * an animated container between 0 and that height with paired
 * opacity. Reduce Motion replaces the animation with an instant
 * mount/unmount.
 */

import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface WhyExpanderProps {
  open: boolean;
  children: React.ReactNode;
}

export function WhyExpander({ open, children }: WhyExpanderProps) {
  const reduceMotion = useReduceMotion();
  const [measured, setMeasured] = useState<number | null>(null);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== measured) setMeasured(h);
  };

  useEffect(() => {
    if (reduceMotion) {
      height.value = open && measured ? measured : 0;
      opacity.value = open ? 1 : 0;
      return;
    }
    if (open && measured) {
      height.value = withTiming(measured, {
        duration: 360,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
      opacity.value = withTiming(1, { duration: 360 });
    } else if (!open) {
      opacity.value = withTiming(0, { duration: 220 });
      height.value = withTiming(0, {
        duration: 320,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
  }, [open, measured, reduceMotion, height, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    height: measured == null ? undefined : height.value,
    opacity: opacity.value,
    overflow: 'hidden',
  }));

  // Hidden measurement pass — renders the children once off-screen to
  // capture the natural height, then drives the animated container.
  return (
    <View>
      {measured == null ? (
        <View style={styles.measure} onLayout={onLayout} pointerEvents="none">
          {children}
        </View>
      ) : null}
      <Animated.View style={containerStyle} accessibilityElementsHidden={!open}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  measure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
  },
});
