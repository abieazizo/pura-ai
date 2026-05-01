/**
 * Top chrome for the cinematic analyzing screen.
 *
 * Beat 1-5 (`mode='live'`): shows `ANALYZING · READING YOUR SKIN` with a
 *   terracotta pulsing dot after the last letter.
 * Beat 6+   (`mode='complete'`): switches to `READING COMPLETE`, dot fades
 *   out, header pulse stops.
 *
 * 44pt close button on the left — always visible so a user can abort at
 * any point (especially during Beat 3-4 if they realize they moved).
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'phosphor-react-native';
import { palette, scanTypography } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface AnalysisHeaderProps {
  onClose: () => void;
  mode: 'live' | 'complete';
  topInset: number;
}

export function AnalysisHeader({ onClose, mode, topInset }: AnalysisHeaderProps) {
  const dotOpacity = useSharedValue(0.3);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (mode === 'complete') {
      dotOpacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    if (reduceMotion) {
      dotOpacity.value = 0.85;
      return;
    }
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [mode, reduceMotion, dotOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          styles.closeBtn,
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Cancel scan"
        hitSlop={8}
      >
        {/* v18.4 — close icon switches to inverse ink for the deep
            analyzing backdrop. */}
        <X size={18} weight="duotone" color={palette.inkInverse} />
      </Pressable>

      <View style={styles.kickerRow}>
        <Text
          style={styles.kicker}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {mode === 'live' ? 'ANALYZING' : 'READY'}
        </Text>
        {mode === 'live' ? (
          <Animated.View style={[styles.pulseDot, dotStyle]} />
        ) : null}
      </View>

      {/* Right-side spacer so the kicker row is visually centered */}
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 68,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // v18.4 — close button reads as a quiet pearl pill on the deep
  // backdrop. Kicker + pulse switch to a soft pearl/cyan tone.
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(248, 250, 252, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kicker: {
    ...scanTypography.headerKicker,
    color: 'rgba(248, 250, 252, 0.78)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7CB0FF',
  },
});
