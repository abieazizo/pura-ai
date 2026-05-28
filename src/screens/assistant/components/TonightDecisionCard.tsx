import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SectionEyebrow } from './SectionEyebrow';
import { PrimaryDecisionButton } from './PrimaryDecisionButton';
import { SecondaryActionButton } from './SecondaryActionButton';
import { dx, dShadow } from '../decisionTokens';
import { DECISION } from '../decisionCopy';
import type { TonightDecision } from '@/state/tonightDecision';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  decision: TonightDecision;
  onApply: () => void;
  onAskWhy: () => void;
  eyebrow?: string;
}

/**
 * The Decision Room's centerpiece.
 *
 * v27 Pass 4 polish:
 *  - A warm terracotta radial wash sits behind the 3px state
 *    indicator so the decision feels rooted to a place on the card
 *    rather than floating.
 *  - The apply CTA breathes once (1.0→1.025→1.0) at +1.4s to
 *    subtly draw the eye without ever feeling animated.
 *  - The state indicator pulses once on reveal alongside the title.
 */
export function TonightDecisionCard({
  decision,
  onApply,
  onAskWhy,
  eyebrow,
}: Props) {
  const reduceMotion = useReduceMotion();
  const op = useSharedValue(reduceMotion ? 1 : 0);
  const ty = useSharedValue(reduceMotion ? 0 : 10);
  const titleOp = useSharedValue(reduceMotion ? 1 : 0);
  const statementOp = useSharedValue(reduceMotion ? 1 : 0);
  const explainOp = useSharedValue(reduceMotion ? 1 : 0);
  const indicatorScale = useSharedValue(reduceMotion ? 1 : 0.6);
  const ctaBreath = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    op.value = withTiming(1, { duration: 320, easing: ease });
    ty.value = withTiming(0, { duration: 320, easing: ease });
    indicatorScale.value = withDelay(
      80,
      withTiming(1, { duration: 320, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );
    titleOp.value = withDelay(80, withTiming(1, { duration: 220, easing: ease }));
    statementOp.value = withDelay(
      180,
      withTiming(1, { duration: 220, easing: ease }),
    );
    explainOp.value = withDelay(
      280,
      withTiming(1, { duration: 240, easing: ease }),
    );
    // One-shot breath on the apply CTA at +1.4s so the user's eye
    // lands on the decision first, then drifts to the action.
    if (!decision.applied) {
      ctaBreath.value = withDelay(
        1400,
        withSequence(
          withTiming(1.025, { duration: 360, easing: ease }),
          withTiming(1, { duration: 420, easing: ease }),
        ),
      );
    }
  }, [
    reduceMotion,
    op,
    ty,
    titleOp,
    statementOp,
    explainOp,
    indicatorScale,
    ctaBreath,
    decision.applied,
  ]);

  // When the decision becomes applied, settle the breath.
  useEffect(() => {
    if (decision.applied) {
      ctaBreath.value = withTiming(1, { duration: 220 });
    }
  }, [decision.applied, ctaBreath]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOp.value }));
  const statementStyle = useAnimatedStyle(() => ({
    opacity: statementOp.value,
  }));
  const explainStyle = useAnimatedStyle(() => ({ opacity: explainOp.value }));
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: indicatorScale.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaBreath.value }],
  }));

  const eyebrowText = eyebrow ?? DECISION.eyebrowUpdatedNow;

  // State-aware gradient: each night type carries a distinct wash so
  // the card root colour matches the signal — terracotta for recovery,
  // rose/red for reset, sage for standard, neutral for check-in.
  const washRgba =
    decision.state === 'RESET_NIGHT'
      ? `rgba(${hexToRgb(dx.signalReset)}, 0.10)`
      : decision.state === 'STANDARD_NIGHT'
        ? `rgba(${hexToRgb(dx.signalStandard)}, 0.07)`
        : decision.state === 'TREATMENT_NIGHT'
          ? `rgba(${hexToRgb(dx.signalTreatment)}, 0.08)`
          : 'rgba(198, 93, 72, 0.10)'; // recovery + check-in → terracotta

  const indicatorColor =
    decision.state === 'RESET_NIGHT'
      ? dx.signalReset
      : decision.state === 'STANDARD_NIGHT'
        ? dx.signalStandard
        : decision.state === 'TREATMENT_NIGHT'
          ? dx.signalTreatment
          : decision.state === 'CHECK_IN_REQUIRED'
            ? dx.signalCheckIn
            : dx.terracotta;

  // Secondary action copy varies by state so it always matches context.
  const secondaryLabel =
    decision.state === 'STANDARD_NIGHT'
      ? DECISION.secondaryActionStandard
      : decision.state === 'RESET_NIGHT'
        ? DECISION.secondaryActionReset
        : decision.state === 'CHECK_IN_REQUIRED'
          ? DECISION.secondaryActionCheckIn
          : DECISION.secondaryAction;

  return (
    <Animated.View style={[styles.card, dShadow.hero, containerStyle]}>
      <LinearGradient
        colors={[washRgba, 'rgba(198, 93, 72, 0)']}
        start={{ x: 0, y: 0.18 }}
        end={{ x: 0.55, y: 0.42 }}
        pointerEvents="none"
        style={styles.wash}
      />

      <SectionEyebrow label={eyebrowText} tone="terracotta" />

      <View style={styles.titleRow}>
        <Animated.View
          style={[styles.indicator, { backgroundColor: indicatorColor }, indicatorStyle]}
        />
        <Animated.Text
          style={[styles.title, titleStyle]}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.15}
        >
          {decision.title}
        </Animated.Text>
      </View>

      <Animated.Text
        style={[styles.statement, statementStyle]}
        maxFontSizeMultiplier={1.2}
      >
        {decision.decisionStatement}
      </Animated.Text>

      <Animated.Text
        style={[styles.explanation, explainStyle]}
        maxFontSizeMultiplier={1.3}
      >
        {decision.explanation}
      </Animated.Text>

      <View style={styles.actions}>
        <Animated.View style={ctaStyle}>
          <PrimaryDecisionButton
            label={DECISION.primaryAction}
            appliedLabel={`✓ ${DECISION.primaryActionApplied}`}
            applied={decision.applied}
            onPress={onApply}
          />
        </Animated.View>
        <View style={styles.secondaryWrap}>
          <SecondaryActionButton
            label={secondaryLabel}
            onPress={onAskWhy}
            underline
          />
        </View>
      </View>
    </Animated.View>
  );
}

/** Convert a 6-digit hex colour to "R, G, B" for rgba(). */
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dx.line,
    padding: 18,
    overflow: 'hidden',
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 220,
    height: 220,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  indicator: {
    width: 3,
    height: 24,
    borderRadius: 2,
  },
  title: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: dx.ink,
  },
  statement: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15.5,
    lineHeight: 21,
    color: dx.ink,
    marginTop: 10,
    letterSpacing: -0.15,
  },
  explanation: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: dx.inkSecondary,
    marginTop: 8,
  },
  actions: {
    marginTop: 14,
    gap: 6,
  },
  secondaryWrap: {
    paddingTop: 2,
    alignItems: 'flex-start',
  },
});
