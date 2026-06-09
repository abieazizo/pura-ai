import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

const HANDLE_SIZE = 40;

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
          transition={220}
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
            transition={220}
          />
        </Animated.View>

        {/* Cycle 12 — soft top + bottom scrims so the corner labels stay AA+
            legible over any face photo, and the portrait gains editorial depth
            instead of sitting as a raw rectangle. Scrims sit beneath the
            divider so the drag handle still reads crisply on top. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,10,15,0.34)', 'rgba(8,10,15,0)']}
          style={styles.scrimTop}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,10,15,0)', 'rgba(8,10,15,0.30)']}
          style={styles.scrimBottom}
        />

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

        {/* Inner hairline frame — the brand "every image is framed" rule, drawn
            on top so it rides above both photos and the scrims. */}
        <View pointerEvents="none" style={styles.innerFrame} />
      </View>
    </GestureDetector>
  );
}

// v9.7 — chrome aligned with v9 visual language. Label pills use paper bg
// with ink text. Cycle 12 — glassy ink label pills + dual scrims + an inner
// hairline so the comparison reads as a framed editorial portrait pair, and a
// slightly larger handle for a more premium, grabbable divider.
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
  scrimTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 96,
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
  },
  innerFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
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
    backgroundColor: 'rgba(248,250,252,0.95)',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 7,
  },
  handleArrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.ink,
  },
  handleArrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.ink,
  },
  // Cycle 12 — labels sit as glassy ink pills with light text so they stay
  // legible on bright skin tones while reading as part of the framed photo.
  pillLabel: {
    position: 'absolute',
    top: space.md,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(8,10,15,0.46)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  labelLeft: {
    left: space.md,
  },
  labelRight: {
    right: space.md,
  },
  pillLabelText: {
    ...typography.micro,
    fontSize: 9.5,
    letterSpacing: 1.3,
    color: colors.inkInverse,
  },
});
