/**
 * ScanTutorial — first-run scan intro.
 *
 * v35 Pass 2 (Reject & Rebuild) — The Question Card direction.
 *
 * Previous: 4-page horizontal pager with lighting illustration, zones
 * animation, video placeholder, tap-to-adjust loop. Each page had a
 * headline, subhead, and bullet list. Heavy, didactic, generic
 * onboarding voice.
 *
 * The Question Card: a single screen where three paper-textured cards
 * flip into view in sequence, each carrying ONE of Pura's three
 * user-promise questions. After all three land, a single Instrument
 * Serif "Begin." CTA fades in. That's the entire tutorial. The
 * editorial restraint IS the brand statement.
 *
 *   Card 1 (0.2s)  — "What matters about your skin today?"
 *   Card 2 (0.7s)  — "What should you do tonight?"
 *   Card 3 (1.2s)  — "What should you buy — if anything?"
 *   Begin. (2.1s)  — single italic CTA
 *
 * Lighting / zone / tap-adjust teaching previously delivered here is
 * deferred to in-context coaching during the actual scan flow
 * (CameraTrust + scan instruction caption). The first impression
 * teaches the user WHY they're scanning, not HOW; the camera screen
 * teaches the HOW at the moment it matters.
 *
 * Existing prop API preserved (`onComplete`, `onDismiss`) so callers
 * don't break.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X } from 'phosphor-react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapt } from '@/utils/haptics';
import { palette, space } from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface ScanTutorialProps {
  /** Called when user presses "Begin." */
  onComplete: () => void;
  /** Called when user taps ×. Does NOT mark tutorial seen. */
  onDismiss: () => void;
}

interface CardSpec {
  index: 0 | 1 | 2;
  question: string;
  /** Delay before this card flips in (ms from mount). */
  delay: number;
}

const CARDS: ReadonlyArray<CardSpec> = [
  { index: 0, question: 'What matters about your skin today?', delay: 200 },
  { index: 1, question: 'What should you do tonight?',         delay: 700 },
  { index: 2, question: 'What should you buy — if anything?',  delay: 1200 },
];

// Total entrance time = last card delay + flip duration; CTA fades in just
// after the last card lands.
const FLIP_DURATION = 600;
const CTA_DELAY = CARDS[2].delay + FLIP_DURATION - 100;

export function ScanTutorial({ onComplete, onDismiss }: ScanTutorialProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Resilience: when true, the screen renders in its final, fully-visible
  // state WITHOUT depending on the Reanimated entrance animation. Guards
  // against runtimes that don't drive mount animations to completion
  // (observed on web), which would otherwise leave the cards and the
  // Begin CTA stuck at opacity 0 — trapping the user on this screen.
  //
  // Initialised true up-front on web / reduce-motion so the static state
  // paints from the very first frame — no flash of the opacity-0 animated
  // state, and the Animated.Views (and their never-completing web
  // animations) are never created there. Native starts false and lets the
  // entrance animation play, with the settle timer below as a backstop.
  const [settled, setSettled] = useState(
    () => reduceMotion || Platform.OS === 'web'
  );

  // Shared values per card — flip rotation and opacity.
  const cardA = useSharedValue(0);
  const cardB = useSharedValue(0);
  const cardC = useSharedValue(0);
  const cta = useSharedValue(0);

  useEffect(() => {
    // Render the final, fully-visible state immediately — no entrance
    // animation — when motion is reduced OR on web. On web the Reanimated 4
    // worklets runtime does not drive these mount `withTiming` animations to
    // completion: they spin every frame without ever reaching 1, which both
    // (a) leaves the cards and Begin CTA stuck at opacity 0 — trapping the
    // user — and (b) starves the main thread with a perpetual rAF loop. We
    // skip them entirely there. Native (New Arch + worklets) runs the
    // animation normally, with the settle timer below as a universal net.
    if (reduceMotion || Platform.OS === 'web') {
      cardA.value = 1;
      cardB.value = 1;
      cardC.value = 1;
      cta.value = 1;
      setSettled(true);
      return;
    }
    const flip = (sv: typeof cardA, delay: number) => {
      sv.value = withDelay(
        delay,
        withTiming(1, {
          duration: FLIP_DURATION,
          easing: Easing.bezier(0.16, 0.84, 0.28, 1),
        })
      );
    };
    flip(cardA, CARDS[0].delay);
    flip(cardB, CARDS[1].delay);
    flip(cardC, CARDS[2].delay);
    cta.value = withDelay(
      CTA_DELAY,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    // Safety net: if the entrance animation never runs to completion, force
    // the final visible state shortly after it *should* have finished. This
    // is a plain timer + React state — it does NOT rely on Reanimated, so it
    // still fires on runtimes where the animation itself silently no-ops.
    const settleTimer = setTimeout(
      () => setSettled(true),
      CTA_DELAY + 500 + 400
    );
    return () => {
      cancelAnimation(cardA);
      cancelAnimation(cardB);
      cancelAnimation(cardC);
      cancelAnimation(cta);
      clearTimeout(settleTimer);
    };
  }, [reduceMotion, cardA, cardB, cardC, cta]);

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: cta.value,
    transform: [{ translateY: (1 - cta.value) * 8 }],
  }));

  const close = () => {
    hapt.select();
    onDismiss();
  };

  const begin = () => {
    hapt.success();
    onComplete();
  };

  const sharedValues = useMemo(
    () => [cardA, cardB, cardC] as const,
    [cardA, cardB, cardC]
  );

  const beginButton = (
    <PrimaryButton
      label="Begin."
      onPress={begin}
      serif
      tone="accent"
      accessibilityLabel="Begin scan"
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Single close affordance — top right. No Skip; the tutorial
            takes ~2 seconds total so there's nothing to skip past. */}
        <View style={styles.topBar}>
          <View style={{ width: 44 }} />
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close tutorial"
            hitSlop={10}
            style={styles.closeBtn}
          >
            <X size={20} color={palette.ink} weight="regular" />
          </Pressable>
        </View>

        {/* Cards — stacked vertically, center-justified. Each carries
            one of Pura's three user-promise questions. */}
        <View style={styles.stack}>
          {CARDS.map((spec, i) => (
            <QuestionCard
              key={spec.index}
              question={spec.question}
              progress={sharedValues[i]}
              index={spec.index}
              settled={settled}
            />
          ))}
        </View>

        {/* Begin CTA — fades in after the third card lands. Once `settled`
            we drop the animated wrapper for a plain View, so the button is
            guaranteed visible and tappable even if the fade-in never ran. */}
        {settled ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(24, insets.bottom + 12) },
            ]}
          >
            {beginButton}
          </View>
        ) : (
          <Animated.View
            style={[
              styles.footer,
              { paddingBottom: Math.max(24, insets.bottom + 12) },
              ctaStyle,
            ]}
          >
            {beginButton}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ---------- Single question card ----------

interface QuestionCardProps {
  question: string;
  progress: ReturnType<typeof useSharedValue<number>>;
  /** Kept on the type for a11y / analytics extension; not used in
   *  render after Pass 7 removed the order pip. */
  index: number;
  /** When true, render statically (no animation dependency). See the
   *  settle fallback in ScanTutorial's mount effect. */
  settled: boolean;
}

function QuestionCard({ question, progress, index, settled }: QuestionCardProps) {
  void index; // see prop doc above
  const style = useAnimatedStyle(() => {
    // Flip animation: rotateX from -42° to 0°, opacity 0→1, translateY
    // 10pt → 0. Reads as a paper card landing on a desk, not a flat fade.
    const rot = -42 + 42 * progress.value;
    return {
      opacity: progress.value,
      transform: [
        { perspective: 800 },
        { rotateX: `${rot}deg` },
        { translateY: (1 - progress.value) * 10 },
      ],
    };
  });

  // Pass 7 — order pip removed. The three cards already imply sequence
  // through the flip choreography; the pip was over-designed and competed
  // for attention with the question. The question now owns the card.
  const content = (
    <Text style={cardStyles.question} maxFontSizeMultiplier={1.15}>
      {question}
    </Text>
  );

  // Settled: a plain View with the card's resting appearance (opacity 1,
  // no transform) — guaranteed visible even if the entrance never ran.
  if (settled) {
    return <View style={cardStyles.card}>{content}</View>;
  }

  return <Animated.View style={[cardStyles.card, style]}>{content}</Animated.View>;
}


// ---------- Styles ----------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    gap: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    backgroundColor: palette.bg,
  },
});

const cardStyles = StyleSheet.create({
  // Paper card — warm off-white, soft drop shadow, tight border.
  card: {
    backgroundColor: '#FCFAF6',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 16, 12, 0.08)',
    shadowColor: '#1B130B',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 10,
  },
  question: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: palette.ink,
  },
});
