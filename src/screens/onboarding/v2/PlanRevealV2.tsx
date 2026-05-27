import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Sparkle } from 'phosphor-react-native';
import {
  OnboardingScreenShellV2,
  EditorialHeadline,
  BodyText,
  Eyebrow,
  WarmInfoPanel,
  ScanThread,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
  PURA_SHADOW,
} from '@/components/onboarding/v2';
import { useOnboardingV2 } from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';
import { useReduceMotion } from '@/hooks/useReduceMotion';

export interface PlanRevealV2Props {
  onContinue: () => void;
  onAdjustRoutine: () => void;
}

/**
 * v25 — Plan Reveal.
 *
 * Turns the scan + selected goal + safety + simplicity inputs into the
 * starting routine narrative. Every line is sourced from the
 * `GeneratedRoutineStrategy` produced by `routineStrategyV2`.
 *
 * No blue. No "Step 7 of 7". No fake CheckCircle blue accents.
 * No products — product-level recommendations belong post-onboarding.
 */
export function PlanRevealV2({
  onContinue,
  onAdjustRoutine,
}: PlanRevealV2Props) {
  const reduceMotion = useReduceMotion();
  const strategy = useOnboardingV2((s) => s.generatedRoutineStrategy);
  // v26.3 — read the captured scan + capture time so the screen visibly
  // remains attached to the user's photo (spec: "the photo becomes the
  // understanding. The understanding becomes tonight's routine.").
  const capturedScanUri = useOnboardingV2((s) => s.capturedScanUri);
  const scan = useOnboardingV2((s) => s.scanAnalysisResult);

  useEffect(() => {
    onboardingV2.routineRevealViewed();
  }, []);

  // v26.3 — entry choreography. ScanThread fades in first as the visual
  // anchor, then the headline, then the routine card, then the promise.
  // The redundant "strategy card" (which only repeated the headline) is
  // removed so the screen carries one clear idea: tonight's routine.
  const threadOp = useSharedValue(0);
  const titleOp = useSharedValue(0);
  const titleY = useSharedValue(reduceMotion ? 0 : 10);
  const routineOp = useSharedValue(0);
  const routineY = useSharedValue(reduceMotion ? 0 : 14);
  const promiseOp = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    threadOp.value = withTiming(1, { duration: 280, easing: ease });
    titleOp.value = withDelay(80, withTiming(1, { duration: 360, easing: ease }));
    titleY.value = withDelay(80, withTiming(0, { duration: 360, easing: ease }));
    routineOp.value = withDelay(220, withTiming(1, { duration: 420, easing: ease }));
    routineY.value = withDelay(220, withTiming(0, { duration: 420, easing: ease }));
    promiseOp.value = withDelay(420, withTiming(1, { duration: 420, easing: ease }));
  }, [threadOp, titleOp, titleY, routineOp, routineY, promiseOp]);

  const threadStyle = useAnimatedStyle(() => ({ opacity: threadOp.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }],
  }));
  const routineStyle = useAnimatedStyle(() => ({
    opacity: routineOp.value,
    transform: [{ translateY: routineY.value }],
  }));
  const promiseStyle = useAnimatedStyle(() => ({ opacity: promiseOp.value }));

  if (!strategy) {
    return (
      <OnboardingScreenShellV2
        topBar={{ showBack: true }}
        bottom={{
          primaryLabel: 'Back to safety check',
          onPrimary: onAdjustRoutine,
        }}
      >
        <View style={styles.head}>
          <EditorialHeadline>Routine not ready yet.</EditorialHeadline>
          <BodyText style={styles.lead}>
            We need a couple more answers before we can show your plan.
          </BodyText>
        </View>
      </OnboardingScreenShellV2>
    );
  }

  return (
    <OnboardingScreenShellV2
      topBar={{ showBack: true }}
      bottom={{
        primaryLabel: 'Start my 84-day plan',
        onPrimary: () => {
          onboardingV2.start84DayPlanTapped();
          onContinue();
        },
        secondary: {
          label: 'Adjust routine style',
          onPress: onAdjustRoutine,
        },
      }}
    >
      <Animated.View style={threadStyle}>
        <ScanThread
          scanUri={capturedScanUri}
          stage="plan"
          capturedAt={scan?.capturedAt}
        />
      </Animated.View>

      <View style={styles.head}>
        <Animated.View style={titleStyle}>
          <Eyebrow>YOUR STARTING ROUTINE</Eyebrow>
          <EditorialHeadline style={styles.headline}>
            {strategy.headline}
          </EditorialHeadline>
        </Animated.View>
        <BodyText style={styles.lead}>{strategy.rationale}</BodyText>
      </View>

      <Animated.View style={[styles.routineCard, routineStyle]}>
        <Eyebrow style={styles.routineEyebrow}>Tonight</Eyebrow>
        <View style={styles.steps}>
          {strategy.steps.map((step, i) => (
            <StepRow
              key={step.id}
              index={i + 1}
              title={step.title}
              body={step.body}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.promiseWrap, promiseStyle]}>
        <WarmInfoPanel Icon={Sparkle} tone="clay">
          {strategy.adaptivePromise}
        </WarmInfoPanel>
      </Animated.View>

      {/* v26.3 — handoff signal. Tells the user exactly where this
          routine will live once they continue, so the transition into
          Tonight's Edit on Home reads as continuity, not a jump. */}
      <Animated.View style={[styles.handoffWrap, promiseStyle]}>
        <Text style={styles.handoffText} maxFontSizeMultiplier={1.2}>
          This will appear under{' '}
          <Text style={styles.handoffEmphasis}>Tonight</Text> on your Home
          screen.
        </Text>
      </Animated.View>
    </OnboardingScreenShellV2>
  );
}

function StepRow({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.num}>
        <Eyebrow style={stepStyles.numText}>{index}</Eyebrow>
      </View>
      <View style={{ flex: 1 }}>
        <BodyText style={stepStyles.title}>{title}</BodyText>
        <BodyText style={stepStyles.body}>{body}</BodyText>
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURA.claySupport,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numText: {
    fontSize: 11,
    color: PURA.terracotta,
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    lineHeight: 21,
    color: PURA.ink,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 18,
  },
  headline: {
    fontSize: 32,
    lineHeight: 36,
    marginTop: 10,
  },
  lead: {
    marginTop: 14,
    color: PURA.body,
    maxWidth: 380,
  },
  routineCard: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: PURA_RADIUS.reveal,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    ...PURA_SHADOW.soft,
    marginBottom: 16,
  },
  routineEyebrow: { marginBottom: 14 },
  steps: { gap: 14 },
  promiseWrap: {
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  handoffWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handoffText: {
    fontFamily: PURA_FONT.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: PURA.muted,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  handoffEmphasis: {
    fontFamily: PURA_FONT.sansSemi,
    color: PURA.body,
  },
});
