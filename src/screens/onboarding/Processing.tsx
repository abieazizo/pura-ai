import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PuraMark } from '@/components/PuraMark';
import { palette } from '@/theme';

export interface ProcessingProps {
  onDone: () => void;
}

const HOLD_MS = 2000;
const DOT_LOOP_MS = 1800;

/**
 * Processing beat (§3.9). No header. Mark centered pulsing 1.0 → 1.08 →
 * 1.0, italic copy "Reading your answers…", three dots cycling. Holds
 * for 2000ms then fires `onDone`.
 */
export function Processing({ onDone }: ProcessingProps) {
  useEffect(() => {
    const t = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.08 * pulse.value }],
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Animated.View style={markStyle}>
          <PuraMark variant="idle" size="lg" glow />
        </Animated.View>

        <View style={{ height: 40 }} />
        <Text style={styles.copy} maxFontSizeMultiplier={1.2}>
          Reading your answers…
        </Text>

        <View style={{ height: 16 }} />
        <Dots />
      </View>
    </SafeAreaView>
  );
}

function Dots() {
  return (
    <View style={dotStyles.row}>
      <Dot delay={0} />
      <Dot delay={300} />
      <Dot delay={600} />
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withDelay(
          delay,
          withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
        ),
        withTiming(0, {
          duration: DOT_LOOP_MS - 200 - delay,
          easing: Easing.in(Easing.cubic),
        })
      ),
      -1,
      false
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[dotStyles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  copy: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 22,
    lineHeight: 28,
    color: 'rgba(26,22,20,0.7)',
    textAlign: 'center',
  },
});

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.clay,
  },
});
