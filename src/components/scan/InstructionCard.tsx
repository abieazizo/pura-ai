/**
 * InstructionCard — the single coaching surface that every scan
 * mode renders beneath its guide. Reads from `ScanInstruction` so
 * the title, subtitle, and severity stay in lock-step with whatever
 * the controller decided.
 *
 * Visual goals (spec §15):
 *   • 70–78% screen width
 *   • Translucent dark blue glass with hairline border
 *   • Backdrop blur where available
 *   • Title 16–18 semibold, subtitle 13–14 medium, centered
 *   • Crossfade between copies (no jarring text flicker)
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ScanInstruction, Severity } from '@/screens/scan/scanController';

const TONE: Record<
  Severity,
  {
    bg: string;
    border: string;
    title: string;
    body: string;
  }
> = {
  neutral: {
    bg: 'rgba(7,17,31,0.62)',
    border: 'rgba(255,255,255,0.14)',
    title: '#F4F6FA',
    body: 'rgba(244,246,250,0.78)',
  },
  warning: {
    bg: 'rgba(54,38,18,0.72)',
    border: 'rgba(245,184,92,0.34)',
    title: '#FFE2AD',
    body: '#FFD39A',
  },
  ready: {
    bg: 'rgba(12,43,69,0.76)',
    border: 'rgba(104,216,255,0.38)',
    title: '#E8F8FF',
    body: '#BFEAFF',
  },
  error: {
    bg: 'rgba(60,18,24,0.76)',
    border: 'rgba(255,122,122,0.34)',
    title: '#FFE1E1',
    body: '#FFC0C0',
  },
};

export interface InstructionCardProps {
  instruction: ScanInstruction;
  /** Optional layout override — set when the camera region is unusually short. */
  maxWidth?: number;
}

export function InstructionCard({ instruction, maxWidth }: InstructionCardProps) {
  const tone = TONE[instruction.severity];

  // Crossfade on copy change.
  const opacity = useSharedValue(1);
  const translate = useSharedValue(0);
  const [rendered, setRendered] = useState<ScanInstruction>(instruction);
  useEffect(() => {
    if (
      instruction.title === rendered.title &&
      instruction.subtitle === rendered.subtitle &&
      instruction.severity === rendered.severity
    ) {
      return;
    }
    opacity.value = withTiming(0, {
      duration: 140,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
    });
    translate.value = withTiming(-4, { duration: 140 });
    const t = setTimeout(() => {
      setRendered(instruction);
      translate.value = 5;
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      translate.value = withTiming(0, {
        duration: 220,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }, 145);
    return () => clearTimeout(t);
  }, [instruction, rendered, opacity, translate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        maxWidth ? { maxWidth } : null,
      ]}
    >
      <BlurView
        tint="dark"
        intensity={28}
        style={[
          styles.glass,
          { backgroundColor: tone.bg, borderColor: tone.border },
        ]}
      >
        <Animated.View style={animStyle}>
          <Text
            style={[styles.title, { color: tone.title }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {rendered.title}
          </Text>
          <Text
            style={[styles.body, { color: tone.body }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {rendered.subtitle}
          </Text>
        </Animated.View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: '78%',
    maxWidth: 360,
  },
  glass: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 62,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15.5,
    lineHeight: 19,
    letterSpacing: 0.05,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 3,
    textAlign: 'center',
  },
});
