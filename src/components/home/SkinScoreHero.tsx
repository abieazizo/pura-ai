import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { PuraMark } from '@/components/PuraMark';
import { palette, space } from '@/theme';

// Whitelist the `text` prop so Reanimated can drive it natively — this is the
// canonical tick-down/up pattern recommended by the Reanimated team.
Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface SkinScoreHeroProps {
  score: number;
  dayNumber: number;
  /** +N / -N delta from day 1. 0 means stable. */
  deltaFromDay1: number;
  /** Single italic sentence — the AI's short note on today. */
  readout: string;
}

const RING_SIZE = 100;
const RING_STROKE = 3;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

/**
 * SkinScoreHero (§4.3) — the moment. A warm paper card holding:
 *   • left column: DAY kicker, 96pt terracotta serif number (count-up on
 *     mount), and a ↑/↓ delta caption;
 *   • right column: a 100pt ring at `strokeDasharray` tied to the score, with
 *     the Mark centered inside;
 *   • full-width italic serif sentence below a clay hairline.
 *
 * Count-up and ring-fill animate in parallel over 600ms on mount only. Ref
 * gate prevents re-animation if the screen re-renders.
 */
export function SkinScoreHero({
  score,
  dayNumber,
  deltaFromDay1,
  readout,
}: SkinScoreHeroProps) {
  const progress = useSharedValue(0);
  const playedRef = useRef(false);

  useEffect(() => {
    if (playedRef.current) {
      // Subsequent updates (e.g. a new scan lands) should still settle
      // towards the new value, but without a fresh 0→N restart.
      progress.value = withTiming(score, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    playedRef.current = true;
    progress.value = withTiming(score, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const numberProps = useAnimatedProps(() => ({
    text: String(Math.round(progress.value)),
    defaultValue: String(Math.round(progress.value)),
  })) as unknown as { text: string };

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset:
      CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress.value / 100))),
  }));

  // Split into [accentPart, neutralPart] so the arrow + number render in
  // clay while "from Day 1" reads at 60% ink. Stable case collapses to one
  // neutral string.
  const [deltaAccent, deltaNeutral] =
    deltaFromDay1 > 0
      ? [`\u2191 ${deltaFromDay1}`, ' from Day 1']
      : deltaFromDay1 < 0
      ? [`\u2193 ${Math.abs(deltaFromDay1)}`, ' from Day 1']
      : ['', 'Stable from Day 1'];

  return (
    <View style={styles.card}>
      <View style={styles.columns}>
        {/* Left — kicker, number, delta */}
        <View style={styles.leftCol}>
          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            {`SKIN SCORE \u00B7 DAY ${dayNumber}`}
          </Text>

          <AnimatedTextInput
            accessibilityLabel={`Skin score ${score}`}
            editable={false}
            selectTextOnFocus={false}
            underlineColorAndroid="transparent"
            value={String(score)}
            animatedProps={numberProps as any}
            style={styles.number}
            maxFontSizeMultiplier={1.1}
            // Allow the count-up text to lay out as a bare character. No
            // decorations, no caret.
            caretHidden
          />

          <Text style={styles.delta} maxFontSizeMultiplier={1.2}>
            {deltaAccent.length > 0 ? (
              <Text style={styles.deltaAccent}>{deltaAccent}</Text>
            ) : null}
            {deltaNeutral}
          </Text>
        </View>

        {/* Right — ring with Mark in the middle */}
        <View style={styles.rightCol}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={palette.clay}
              strokeOpacity={0.15}
              strokeWidth={RING_STROKE}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={palette.clay}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              animatedProps={arcProps}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter} pointerEvents="none">
            <PuraMark variant="idle" size="md" />
          </View>
        </View>
      </View>

      <View style={styles.rule} />
      <Text style={styles.readout} maxFontSizeMultiplier={1.2}>
        {readout}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: palette.bg,
    borderRadius: 24,
    padding: 24,
    // §4.3 fallback shadow — clay-tinted, soft, warm.
    shadowColor: palette.clay,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftCol: { flex: 1 },
  rightCol: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4, // +140‰ at 10pt
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 8,
  },
  number: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -3,
    color: palette.clay,
    fontVariant: ['tabular-nums'],
    // TextInput on iOS adds internal padding — zero it.
    padding: 0,
    margin: 0,
    // Keep the glyph tight; no blinking caret.
    includeFontPadding: false,
  },
  delta: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(26,22,20,0.6)',
    marginTop: 12,
  },
  deltaAccent: {
    color: palette.clay,
    fontFamily: 'Inter-Medium',
    fontVariant: ['tabular-nums'],
  },
  rule: {
    marginTop: 20,
    height: 1,
    backgroundColor: 'rgba(20,124,255,0.1)', // clay @ 10%
  },
  readout: {
    marginTop: 16,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    lineHeight: 18 * 1.35,
    color: 'rgba(26,22,20,0.8)', // ink @ 80%
  },
});
