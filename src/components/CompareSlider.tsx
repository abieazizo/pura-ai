import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, radius, space, type as typography } from '@/theme';

export interface CompareSliderProps {
  leftUri: string; // "before" — shown on the left of the divider
  rightUri: string; // "after" — shown on the right of the divider
  leftLabel: string;
  rightLabel: string;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

const HANDLE_SIZE = 36;

export function CompareSlider({
  leftUri,
  rightUri,
  leftLabel,
  rightLabel,
  width,
  height,
  style,
}: CompareSliderProps) {
  const position = useSharedValue(width * 0.5);

  const pan = Gesture.Pan()
    .onChange((e) => {
      position.value = clamp(position.value + e.changeX, 24, width - 24);
    })
    .onEnd(() => {
      position.value = withSpring(position.value, {
        damping: 22,
        stiffness: 240,
      });
    });

  const leftClip = useAnimatedStyle(() => ({
    width: position.value,
  }));

  const handlePosition = useAnimatedStyle(() => ({
    left: position.value - HANDLE_SIZE / 2,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityLabel="Compare scans by dragging"
        style={[
          styles.frame,
          { width, height, borderRadius: radius.xl },
          style,
        ]}
      >
        {/* Right image (after) fills the frame — visible on the right half. */}
        <Image
          source={rightUri}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius.xl }]}
          contentFit="cover"
        />
        {/* Left image (before) clipped to slider position from the left. */}
        <Animated.View
          style={[
            styles.leftClip,
            {
              borderTopLeftRadius: radius.xl,
              borderBottomLeftRadius: radius.xl,
            },
            leftClip,
          ]}
        >
          <Image
            source={leftUri}
            style={{ width, height }}
            contentFit="cover"
          />
        </Animated.View>

        <View style={[styles.pillLabel, styles.labelLeft]}>
          <Text style={styles.pillLabelText}>{leftLabel}</Text>
        </View>
        <View style={[styles.pillLabel, styles.labelRight]}>
          <Text style={styles.pillLabelText}>{rightLabel}</Text>
        </View>

        <Animated.View style={[styles.divider, handlePosition]} pointerEvents="none">
          <View style={styles.dividerLine} />
          <View style={styles.handle}>
            <View style={styles.handleArrowLeft} />
            <View style={styles.handleArrowRight} />
          </View>
          <View style={styles.dividerLine} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.bgSubtle,
  },
  leftClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.surface,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    shadowColor: colors.shadowTint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  handleArrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.textPrimary,
  },
  handleArrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.textPrimary,
  },
  pillLabel: {
    position: 'absolute',
    top: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,10,10,0.65)',
  },
  labelLeft: {
    left: space.md,
  },
  labelRight: {
    right: space.md,
  },
  pillLabelText: {
    ...typography.micro,
    color: colors.surface,
  },
});
