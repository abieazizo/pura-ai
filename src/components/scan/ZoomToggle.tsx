import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import { palette, spring } from '@/theme';

export type ZoomValue = '0.5' | '1';

export interface ZoomToggleProps {
  value: ZoomValue;
  onChange: (v: ZoomValue) => void;
}

const SEG_W = 40;
const HEIGHT = 36;

/**
 * 80×36 pill with two segments (.5× / 1×). Active segment is paper-filled
 * with ink text; inactive segments are transparent with white-70% text.
 * Thumb slides between segments via a spring.
 */
export function ZoomToggle({ value, onChange }: ZoomToggleProps) {
  const offset = useSharedValue(value === '1' ? 1 : 0);

  React.useEffect(() => {
    offset.value = withSpring(value === '1' ? 1 : 0, spring.default);
  }, [value, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * SEG_W }],
  }));

  const tap = (v: ZoomValue) => {
    hapt.select();
    onChange(v);
  };

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <Animated.View style={[styles.thumb, thumbStyle]} />
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: value === '0.5' }}
        onPress={() => tap('0.5')}
        style={styles.seg}
      >
        <Text
          style={[
            styles.label,
            value === '0.5' ? styles.labelActive : styles.labelInactive,
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {`.5\u00D7`}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: value === '1' }}
        onPress={() => tap('1')}
        style={styles.seg}
      >
        <Text
          style={[
            styles.label,
            value === '1' ? styles.labelActive : styles.labelInactive,
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {`1\u00D7`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SEG_W * 2,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: 'rgba(26,22,20,0.4)', // warm charcoal @ 40%
    flexDirection: 'row',
    padding: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: SEG_W - 4,
    height: HEIGHT - 4,
    borderRadius: (HEIGHT - 4) / 2,
    backgroundColor: palette.bg,
  },
  seg: {
    width: SEG_W,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  labelActive: { color: palette.ink },
  labelInactive: { color: 'rgba(255,255,255,0.7)' },
});
