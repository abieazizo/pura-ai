import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  User,
  Drop,
  Barcode,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette, spring } from '@/theme';
import type { ReticleMode } from './Reticle';

const WIDTH = 280;
const HEIGHT = 60;
const SEG_W = WIDTH / 3;

interface SegmentDef {
  value: ReticleMode;
  label: string;
  Icon: React.FC<PhosphorIconProps>;
}

const SEGMENTS: SegmentDef[] = [
  { value: 'face', label: 'Face', Icon: User as React.FC<PhosphorIconProps> },
  { value: 'product', label: 'Product', Icon: Drop as React.FC<PhosphorIconProps> },
  { value: 'barcode', label: 'Barcode', Icon: Barcode as React.FC<PhosphorIconProps> },
];

export interface ModeSelectorProps {
  mode: ReticleMode;
  onChange: (m: ReticleMode) => void;
}

/**
 * 280×60 three-segment selector (§2.3). Active segment: paper fill + ink
 * icon/label. Inactive: transparent + white-70%. Thumb slides with spring.
 */
export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const index = SEGMENTS.findIndex((s) => s.value === mode);
  const offset = useSharedValue(index < 0 ? 0 : index);

  React.useEffect(() => {
    offset.value = withSpring(index < 0 ? 0 : index, spring.default);
  }, [index, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * SEG_W }],
  }));

  return (
    <View
      style={styles.wrap}
      accessibilityRole="tablist"
      accessibilityLabel="Scan mode"
    >
      <Animated.View style={[styles.thumb, thumbStyle]} />
      {SEGMENTS.map((seg) => {
        const active = seg.value === mode;
        const Icon = seg.Icon;
        return (
          <Pressable
            key={seg.value}
            accessibilityRole="tab"
            accessibilityLabel={`${seg.label} scan`}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) hapt.select();
              onChange(seg.value);
            }}
            style={styles.seg}
            hitSlop={4}
          >
            <Icon
              size={18}
              weight={active ? 'duotone' : 'regular'}
              color={active ? palette.ink : 'rgba(255,255,255,0.7)'}
            />
            <Text
              style={[
                styles.label,
                active ? styles.labelActive : styles.labelInactive,
              ]}
              maxFontSizeMultiplier={1.1}
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
  wrap: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: 'rgba(26,22,20,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 0,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: SEG_W - 8,
    height: HEIGHT - 8,
    borderRadius: (HEIGHT - 8) / 2,
    backgroundColor: palette.bg,
  },
  seg: {
    width: SEG_W,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 16,
  },
  labelActive: { color: palette.ink },
  labelInactive: { color: 'rgba(255,255,255,0.7)' },
});
