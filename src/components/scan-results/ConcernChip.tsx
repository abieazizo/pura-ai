/**
 * ConcernChip — interactive concern pill.
 *
 * v30.3 — refined press state, animated active ring, haptic feedback,
 * 44pt minimum tap target.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  concernVisuals,
  scanColors,
  scanRadius,
  scanType,
} from '@/theme/scanResultsTokens';
import type { ConcernType } from '@/types/scanResults';
import { hapt } from '@/utils/haptics';

export interface ConcernChipProps {
  type: ConcernType;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function ConcernChip({
  type,
  label,
  active = false,
  onPress,
}: ConcernChipProps) {
  const visual = concernVisuals[type];

  // Animate fill, border, and ring as `active` changes.
  const activation = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    activation.value = withTiming(active ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, activation]);

  const chipStyle = useAnimatedStyle(() => ({
    borderWidth: 1,
    borderColor: `rgba(${hexToRgb(visual.border)}, ${activation.value})`,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: activation.value,
    transform: [{ scale: 0.92 + activation.value * 0.08 }],
  }));

  const handlePress = () => {
    if (!onPress) return;
    hapt.select();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${active ? ', selected' : ''}`}
      hitSlop={6}
      style={({ pressed }) => [
        styles.tapArea,
        pressed && onPress && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: active ? visual.wash : scanColors.cardSoft },
          chipStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.activeRing,
            { borderColor: visual.tint },
            ringStyle,
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.dot,
            {
              backgroundColor: visual.tint,
              opacity: active ? 1 : 0.65,
            },
          ]}
        />
        <Text
          style={[
            styles.label,
            { color: active ? visual.tint : scanColors.inkSoft },
          ]}
          maxFontSizeMultiplier={1.15}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function hexToRgb(s: string): string {
  // Accept rgb / rgba strings as-is via a quick passthrough.
  const m = /^rgba?\(([^)]+)\)$/i.exec(s.trim());
  if (m) {
    const parts = m[1].split(',').map((p) => p.trim());
    return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
  }
  const hex = s.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const styles = StyleSheet.create({
  tapArea: {
    minHeight: 36,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: scanRadius.pill,
    backgroundColor: scanColors.cardSoft,
    borderWidth: 1,
    borderColor: scanColors.line,
  },
  activeRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: scanRadius.pill,
    borderWidth: 1,
    opacity: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...scanType.chip,
  },
});
