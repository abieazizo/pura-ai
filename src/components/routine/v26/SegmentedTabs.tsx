import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import { V26, V26_MOTION, V26_TYPE } from './tokens';
import { useReducedMotion } from './primitives';

export type RoutineTabKey = 'today' | 'progress';

interface SegmentedTabsProps {
  active: RoutineTabKey;
  onChange: (next: RoutineTabKey) => void;
}

/**
 * v26 — restrained segmented control.
 *
 * No filled pill, no white card background. A single terracotta
 * underline glides under the active label. Inactive labels sit in
 * `inkMuted`. Designed to feel like a quiet wayfinder, not a chrome.
 */
export function SegmentedTabs({ active, onChange }: SegmentedTabsProps) {
  const reduced = useReducedMotion();
  const indicator = useSharedValue(active === 'today' ? 0 : 1);

  React.useEffect(() => {
    indicator.value = withTiming(
      active === 'today' ? 0 : 1,
      reduced ? { duration: 0 } : V26_MOTION.segment,
    );
  }, [active, indicator, reduced]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: `${indicator.value * 100}%` }],
  }));

  return (
    <View style={s.row}>
      {(['today', 'progress'] as const).map((key) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => {
              if (isActive) return;
              hapt.select();
              onChange(key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={key === 'today' ? 'Today' : 'Progress'}
            style={s.tab}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={[s.label, isActive && s.labelOn]}
            >
              {key === 'today' ? 'Today' : 'Progress'}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View pointerEvents="none" style={[s.indicatorWrap, animated]}>
        <View style={s.indicator} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: V26.border,
    position: 'relative',
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 13.5,
    letterSpacing: 0.2,
    color: V26.inkMuted,
  },
  labelOn: {
    color: V26.ink,
  },
  indicatorWrap: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    width: '50%',
    alignItems: 'center',
  },
  indicator: {
    width: 32,
    height: 2,
    borderRadius: 2,
    backgroundColor: V26.terracotta,
  },
});
