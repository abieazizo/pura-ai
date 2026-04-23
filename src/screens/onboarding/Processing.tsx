import React, { useEffect, useState } from 'react';
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

// v10.8 — three-phase narrative within the hold window. Each phrase is
// visible for ~800ms with a ~240ms crossfade so the beat feels
// intentional (not a single static placeholder). Total hold ≈ 2400ms:
// concise enough to preserve momentum, rich enough to land as "the AI
// is working."
const PHASE_MS = 800;
const PHASE_FADE_MS = 240;
const HOLD_MS = PHASE_MS * 3;
const DOT_LOOP_MS = 1800;

const PHASES = [
  'Reading your answers\u2026',
  'Calibrating for your skin\u2026',
  'Prepping your first scan\u2026',
];

/**
 * Processing beat. No header. Mark centered pulsing 1.0 → 1.08 → 1.0.
 * Italic copy rotates through three phases over ~2.4s, then fires
 * `onDone`. Dots cycle underneath for ambient motion.
 */
export function Processing({ onDone }: ProcessingProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhaseIndex(1), PHASE_MS));
    timers.push(setTimeout(() => setPhaseIndex(2), PHASE_MS * 2));
    timers.push(setTimeout(onDone, HOLD_MS));
    return () => timers.forEach(clearTimeout);
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
        <View style={styles.copyStack}>
          {PHASES.map((phrase, i) => (
            <PhrasePane
              key={phrase}
              phrase={phrase}
              visible={i === phaseIndex}
            />
          ))}
        </View>

        <View style={{ height: 16 }} />
        <Dots />
      </View>
    </SafeAreaView>
  );
}

/**
 * One narrative phrase rendered in an absolute slot so consecutive
 * phrases crossfade in the same typographic position. `visible` flips
 * the opacity via Reanimated; the previous phrase eases out while the
 * next eases in over PHASE_FADE_MS.
 */
function PhrasePane({
  phrase,
  visible,
}: {
  phrase: string;
  visible: boolean;
}) {
  const opacity = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: PHASE_FADE_MS,
      easing: Easing.inOut(Easing.ease),
    });
  }, [visible, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text
      style={[styles.copy, styles.copySlot, style]}
      maxFontSizeMultiplier={1.2}
    >
      {phrase}
    </Animated.Text>
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
  // v10.7 — moved from warm v5 rgba to palette.inkSecondary.
  copy: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 22,
    lineHeight: 28,
    color: palette.inkSecondary,
    textAlign: 'center',
  },
  // v10.8 — three phrases stack in the same slot and crossfade; the
  // stack reserves one line of vertical room so the layout doesn't
  // jump as phrases change length.
  copyStack: {
    height: 32,
    alignSelf: 'stretch',
    marginHorizontal: 24,
    justifyContent: 'center',
  },
  copySlot: {
    position: 'absolute',
    left: 0,
    right: 0,
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
