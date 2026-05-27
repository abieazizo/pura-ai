/**
 * PostScanReveal — the staged "Your skin looks tired of being treated"
 * moment after a fresh scan.
 *
 * The reveal lands its emotional line FIRST, alone, with silence
 * around it. Supporting text and the decision arrive in calm,
 * deliberate intervals afterward. Pacing is intentionally cinematic:
 *
 *   t = 0       headline alone
 *   t = 1900ms  supporting line settles in
 *   t = 3500ms  decision line lands
 *   t = 5000ms  Tonight's Edit body reveals
 *
 * Each beat is paired with a haptic and an accessibility announcement
 * so VoiceOver users experience the same staged unveiling as sighted
 * users. Reduce Motion replaces the stagger with a single short
 * opacity transition + a single combined announcement.
 */

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { pura26 } from '@/screens/home/homeTokens';

export interface PostScanRevealProps {
  /** The single editorial line — landed alone first. */
  headline: string;
  /** The supporting appearance-based observation. */
  supporting: string;
  /** The decision line — "Tonight, do less." / "Keep it exactly as it is." */
  decision: string;
  /** The Tonight's Edit block (and any action buttons) — revealed last. */
  children: React.ReactNode;
}

const STAGE = {
  headline: 0,
  supporting: 1,
  decision: 2,
  body: 3,
} as const;

type Stage = (typeof STAGE)[keyof typeof STAGE];

export function PostScanReveal({
  headline,
  supporting,
  decision,
  children,
}: PostScanRevealProps) {
  const reduceMotion = useReduceMotion();
  const [stage, setStage] = useState<Stage>(
    reduceMotion ? STAGE.body : STAGE.headline
  );

  useEffect(() => {
    if (reduceMotion) {
      setStage(STAGE.body);
      // Single combined announcement so the screen reader hears the
      // full message without artificial pauses.
      AccessibilityInfo.announceForAccessibility?.(
        `${headline}. ${supporting} ${decision}`
      );
      return;
    }

    // Headline lands on mount — announce it and a soft tactile pulse.
    AccessibilityInfo.announceForAccessibility?.(headline);
    hapt.assistantReply();

    const t1 = setTimeout(() => {
      setStage(STAGE.supporting);
      AccessibilityInfo.announceForAccessibility?.(supporting);
      hapt.tap();
    }, 1900);
    const t2 = setTimeout(() => {
      setStage(STAGE.decision);
      AccessibilityInfo.announceForAccessibility?.(decision);
      hapt.select();
    }, 3500);
    const t3 = setTimeout(() => {
      setStage(STAGE.body);
    }, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reduceMotion, headline, supporting, decision]);

  return (
    <View style={styles.wrap}>
      <Text
        accessibilityRole="header"
        style={styles.headline}
        maxFontSizeMultiplier={1.15}
      >
        {headline}
      </Text>

      <FadeIn show={stage >= STAGE.supporting}>
        <Text style={styles.supporting} maxFontSizeMultiplier={1.2}>
          {supporting}
        </Text>
      </FadeIn>

      <FadeIn show={stage >= STAGE.decision}>
        <Text style={styles.decision} maxFontSizeMultiplier={1.15}>
          {decision}
        </Text>
      </FadeIn>

      <FadeIn show={stage >= STAGE.body}>{children}</FadeIn>
    </View>
  );
}

function FadeIn({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const op = useSharedValue(show ? 1 : 0);
  const ty = useSharedValue(show ? 0 : 8);

  useEffect(() => {
    if (!show) {
      op.value = 0;
      ty.value = 8;
      return;
    }
    const dur = reduceMotion ? 180 : 720;
    op.value = withDelay(
      reduceMotion ? 0 : 80,
      withTiming(1, {
        duration: dur,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
    ty.value = withDelay(
      reduceMotion ? 0 : 80,
      withTiming(0, {
        duration: dur,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
  }, [show, reduceMotion, op, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 26,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: pura26.ink,
  },
  supporting: {
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 25,
    color: pura26.inkSecondary,
  },
  decision: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: pura26.terracottaText,
  },
});
