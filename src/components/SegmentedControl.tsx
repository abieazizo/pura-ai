import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, radius, type as typography } from '@/theme';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'dark',
  style,
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const segWidth = useSharedValue(0);
  const pos = useSharedValue(index);

  React.useEffect(() => {
    pos.value = withSpring(index, { damping: 20, stiffness: 260 });
  }, [index, pos]);

  const isDark = tone === 'dark';
  const thumbBg = isDark ? colors.surface : colors.textPrimary;
  const containerBg = isDark ? 'rgba(0,0,0,0.55)' : colors.bgSubtle;
  const inactiveColor = isDark ? 'rgba(255,255,255,0.7)' : colors.textSecondary;
  const activeColor = isDark ? colors.textPrimary : colors.surface;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * segWidth.value }],
    width: segWidth.value,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: containerBg },
        style,
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        segWidth.value = (w - 8) / options.length;
      }}
    >
      <Animated.View style={[styles.thumb, { backgroundColor: thumbBg }, thumbStyle]} />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(opt.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={styles.segment}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? activeColor : inactiveColor },
              ]}
            >
              {opt.label}
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
    alignItems: 'center',
    borderRadius: radius.pill,
    padding: 4,
    height: 40,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    ...typography.captionMed,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
