/**
 * AM/PM segmented toggle — Zone 1's time-of-day switch.
 *
 * A two-segment control (Morning · Evening) with a single Pura Blue
 * highlight that slides between segments over 200ms. Selected reads
 * white SemiBold; unselected reads Pura Blue Medium on a near-invisible
 * gray track. Presentational: the host owns the selected value.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { RoutineTimeOfDay } from '@/types/routine';
import { hapt } from '@/utils/haptics';
import { CC, companionMotion, companionType } from './companionTokens';

const PAD = 4;
const SEGMENTS: ReadonlyArray<{ key: RoutineTimeOfDay; label: string }> = [
  { key: 'morning', label: 'Morning' },
  { key: 'evening', label: 'Evening' },
];

export interface AmPmToggleProps {
  value: RoutineTimeOfDay;
  onChange: (next: RoutineTimeOfDay) => void;
}

export function AmPmToggle({ value, onChange }: AmPmToggleProps) {
  const [width, setWidth] = React.useState(0);
  const idx = value === 'evening' ? 1 : 0;
  const pos = useSharedValue(idx);

  React.useEffect(() => {
    pos.value = withTiming(idx, {
      duration: 200,
      easing: companionMotion.entrance,
    });
  }, [idx, pos]);

  const segW = width > 0 ? (width - PAD * 2) / 2 : 0;
  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PAD + pos.value * segW }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {segW > 0 ? (
        <Animated.View style={[styles.highlight, { width: segW }, highlightStyle]} />
      ) : null}
      {SEGMENTS.map((seg) => {
        const selected = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            style={styles.segment}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              hapt.select();
              onChange(seg.key);
            }}
          >
            <Text
              style={
                selected
                  ? companionType.toggleSelected
                  : [companionType.toggle, styles.unselected]
              }
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(110, 110, 115, 0.06)',
    borderRadius: 14,
    padding: PAD,
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: 0,
    borderRadius: 10,
    backgroundColor: CC.blue,
  },
  segment: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  unselected: {
    color: CC.blue,
  },
});
