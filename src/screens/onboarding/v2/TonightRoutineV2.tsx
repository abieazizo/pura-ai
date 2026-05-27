/**
 * v29 — Tonight's Routine (the climax).
 *
 * One screen, one action: tonight's plan. Inline sensitivity control
 * adapts the routine in place instead of pushing the user to two more
 * separate screens. The previous v2 flow had SafetyCalibration +
 * RoutineSimplicity + PlanReveal as three sequential screens — that
 * over-asked.
 *
 * What's on this screen:
 *   • Context chip: BUILT FOR TONIGHT
 *   • Headline: "Keep it gentle tonight."
 *   • Visible-today + Your-goal context summary
 *   • Compact sensitivity chip row (Often / Sometimes / Rarely / Not sure)
 *   • Tonight's routine card (2-3 steps, adapts to sensitivity)
 *   • Skip-tonight panel
 *   • Tomorrow morning preview row (collapsed)
 *   • Matched next step — owned-products path OR truthful unavailable copy
 *   • "Why this routine?" bottom sheet
 *   • Primary CTA: Start tonight's routine
 *
 * The "Start your 84-day plan" framing is gone. The product earns
 * commitment by giving immediate value first.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CaretRight, Info, Sun, X } from 'phosphor-react-native';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import {
  EditorialHeadline,
  BodyText,
  Eyebrow,
  HelperText,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
  PURA_SHADOW,
} from '@/components/onboarding/v2';
import {
  useOnboardingV2,
  bridgeOnboardingToCanonical,
  type ProductReactivity,
  type PrimaryGoal,
} from '@/state/onboardingV2';
import { generateRoutineStrategyV2 } from '@/state/routineStrategyV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';
import { hapt } from '@/utils/haptics';

export interface TonightRoutineV2Props {
  onContinue: () => void;
}

const SENSITIVITY_OPTIONS: ReadonlyArray<{
  value: ProductReactivity;
  label: string;
}> = [
  { value: 'often', label: 'Often' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely' },
  { value: 'unsure', label: 'Not sure' },
];

const GOAL_LABEL: Record<PrimaryGoal, string> = {
  breakouts: 'Breakouts',
  redness: 'Redness',
  dryness: 'Dryness',
  texture: 'Texture',
  darkSpots: 'Dark spots',
};

export function TonightRoutineV2({ onContinue }: TonightRoutineV2Props) {
  const insets = useSafeAreaInsets();
  const observation = useOnboardingV2((s) => s.visibleObservation);
  const primaryGoal = useOnboardingV2((s) => s.primaryGoal);
  const scan = useOnboardingV2((s) => s.scanAnalysisResult);
  const productReactivity = useOnboardingV2((s) => s.productReactivity);
  const setProductReactivity = useOnboardingV2((s) => s.setProductReactivity);
  const setRoutineSimplicity = useOnboardingV2((s) => s.setRoutineSimplicity);
  const setGeneratedRoutineStrategy = useOnboardingV2(
    (s) => s.setGeneratedRoutineStrategy
  );
  const [whyOpen, setWhyOpen] = useState(false);

  // Default sensitivity to 'unsure' so the screen always has a routine
  // to render. The first visible chip will be 'Not sure' until the user
  // taps another option.
  useEffect(() => {
    if (!productReactivity) {
      setProductReactivity('unsure');
    }
  }, [productReactivity, setProductReactivity]);

  // Routine recompiles whenever sensitivity or goal change.
  const strategy = useMemo(() => {
    if (!primaryGoal || !scan) return null;
    const reactivity: ProductReactivity = productReactivity ?? 'unsure';
    // Map sensitivity → simplicity for the existing strategy generator.
    const simplicity =
      reactivity === 'often' || reactivity === 'unsure'
        ? 'essential'
        : reactivity === 'rarely'
        ? 'balanced'
        : 'essential';
    setRoutineSimplicity(simplicity);
    return generateRoutineStrategyV2({
      primaryGoal,
      scan,
      productReactivity: reactivity,
      routineSimplicity: simplicity,
    });
  }, [primaryGoal, scan, productReactivity, setRoutineSimplicity]);

  useEffect(() => {
    if (strategy) {
      setGeneratedRoutineStrategy(strategy);
    }
  }, [strategy, setGeneratedRoutineStrategy]);

  const handleStart = useCallback(() => {
    hapt.select();
    bridgeOnboardingToCanonical();
    if (strategy) {
      onboardingV2.routineCreated({
        tone: strategy.tone,
        stepCount: strategy.steps.length,
      });
    }
    onboardingV2.start84DayPlanTapped();
    onContinue();
  }, [strategy, onContinue]);

  // Entry choreography
  const headerOp = useSharedValue(0);
  const headerY = useSharedValue(10);
  const routineOp = useSharedValue(0);
  const routineY = useSharedValue(12);
  const morningOp = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    headerOp.value = withTiming(1, { duration: 320, easing: ease });
    headerY.value = withTiming(0, { duration: 320, easing: ease });
    routineOp.value = withDelay(180, withTiming(1, { duration: 420, easing: ease }));
    routineY.value = withDelay(180, withTiming(0, { duration: 420, easing: ease }));
    morningOp.value = withDelay(400, withTiming(1, { duration: 360, easing: ease }));
  }, [headerOp, headerY, routineOp, routineY, morningOp]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOp.value,
    transform: [{ translateY: headerY.value }],
  }));
  const routineStyle = useAnimatedStyle(() => ({
    opacity: routineOp.value,
    transform: [{ translateY: routineY.value }],
  }));
  const morningStyle = useAnimatedStyle(() => ({ opacity: morningOp.value }));

  // Show a non-treatment routine when sensitivity is high/unsure.
  const skipTreatment =
    !productReactivity ||
    productReactivity === 'often' ||
    productReactivity === 'unsure';

  const visibleTodayLabel = observation
    ? observation.concern === 'none'
      ? 'No single visible concern'
      : observation.concern === 'uncertain'
      ? 'No clear visible focus'
      : labelForConcern(observation.concern)
    : 'Reading visible signals…';

  const goalLabel = primaryGoal ? GOAL_LABEL[primaryGoal] : '—';

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 110 + Math.max(insets.bottom, 12) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.head, headerStyle]}>
            <View style={styles.contextChip}>
              <Text style={styles.contextChipLabel}>BUILT FOR TONIGHT</Text>
            </View>
            <EditorialHeadline style={styles.headline}>
              Keep it gentle tonight.
            </EditorialHeadline>
            <BodyText style={styles.lead}>
              A simple start helps Pura learn what works without overwhelming
              your skin.
            </BodyText>
            <View style={styles.contextRow}>
              <ContextLine label="Visible today" value={visibleTodayLabel} />
              <View style={styles.contextDivider} />
              <ContextLine label="Your goal" value={goalLabel} />
            </View>
          </Animated.View>

          <View style={styles.sensitivityBlock}>
            <Text style={styles.sensitivityLabel} maxFontSizeMultiplier={1.15}>
              Does your skin react easily to new products?
            </Text>
            <View style={styles.sensitivityRow}>
              {SENSITIVITY_OPTIONS.map((opt) => {
                const selected = productReactivity === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      hapt.select();
                      setProductReactivity(opt.value);
                      onboardingV2.safetyCalibrationSelected(opt.value);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.sensChip,
                      selected && styles.sensChipOn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sensChipLabel,
                        selected && styles.sensChipLabelOn,
                      ]}
                      maxFontSizeMultiplier={1.15}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Animated.View style={[styles.routineCard, routineStyle]}>
            <View style={styles.routineHead}>
              <Eyebrow style={{ color: PURA.terracotta }}>
                {`TONIGHT · ${skipTreatment ? '2' : '3'} STEPS · ABOUT ${
                  skipTreatment ? '2' : '4'
                } MINUTES`}
              </Eyebrow>
            </View>
            <View style={styles.steps}>
              <StepRow
                num={1}
                title="Gentle cleanse"
                body="Wash without scrubbing."
              />
              {!skipTreatment && strategy && strategy.steps[2] ? (
                <StepRow
                  num={2}
                  title={strategy.steps[2].title}
                  body={strategy.steps[2].body}
                />
              ) : null}
              <StepRow
                num={skipTreatment ? 2 : 3}
                title="Moisturize"
                body="Keep your barrier comfortable tonight."
              />
            </View>
          </Animated.View>

          <View style={styles.avoidCard}>
            <Eyebrow style={{ color: PURA.terracottaPressed }}>
              SKIP TONIGHT
            </Eyebrow>
            <BodyText style={styles.avoidBody}>
              {skipTreatment
                ? 'Do not introduce multiple strong treatments at once.'
                : 'Pause anything new on already-irritated areas.'}
            </BodyText>
          </View>

          <Animated.View style={[styles.morningCard, morningStyle]}>
            <View style={styles.morningHead}>
              <Sun size={16} color={PURA.terracotta} weight="duotone" />
              <Eyebrow style={{ marginBottom: 0 }}>TOMORROW MORNING</Eyebrow>
            </View>
            <BodyText style={styles.morningBody}>
              Cleanse · Moisturize · SPF
            </BodyText>
          </Animated.View>

          <View style={styles.matchedCard}>
            <Eyebrow>MATCHED NEXT STEP</Eyebrow>
            <Text style={styles.matchedTitle} maxFontSizeMultiplier={1.2}>
              Find a gentle moisturizer
            </Text>
            <BodyText style={styles.matchedBody}>
              Product matching will appear here once connected.
            </BodyText>
            <HelperText style={styles.matchedNote}>
              Ranked for fit, never sponsorship.
            </HelperText>
          </View>

          <Pressable
            onPress={() => {
              hapt.tap();
              setWhyOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Why this routine"
            hitSlop={10}
            style={({ pressed }) => [
              styles.whyWrap,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.whyLabel} maxFontSizeMultiplier={1.15}>
              Why this routine?
            </Text>
            <CaretRight size={14} color={PURA.body} weight="bold" />
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.ctaTray,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          <OnboardingPrimaryButton
            label="Start tonight’s routine"
            onPress={handleStart}
            style={styles.cta}
          />
        </View>
      </SafeAreaView>

      <Modal
        visible={whyOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWhyOpen(false)}
      >
        <View style={styles.scrim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setWhyOpen(false)}
          />
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Eyebrow>WHY TONIGHT IS SIMPLE</Eyebrow>
              <Pressable
                onPress={() => setWhyOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <X size={14} color={PURA.ink} weight="bold" />
              </Pressable>
            </View>
            <SheetRow label="Visible today" value={visibleTodayLabel} />
            <SheetRow label="Your goal" value={goalLabel} />
            <SheetRow
              label="Sensitivity"
              value={sensitivityLabel(productReactivity)}
            />
            <SheetRow
              label="Starting approach"
              value="Gentle and barrier-first"
            />
            <View style={styles.sheetFooter}>
              <Info size={14} color={PURA.muted} weight="duotone" />
              <HelperText style={styles.sheetFooterText}>
                Pura offers cosmetic guidance, not medical diagnosis.
              </HelperText>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contextLine}>
      <Text style={styles.contextLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <Text style={styles.contextValue} maxFontSizeMultiplier={1.15}>
        {value}
      </Text>
    </View>
  );
}

function StepRow({
  num,
  title,
  body,
}: {
  num: number;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={styles.stepBody} maxFontSizeMultiplier={1.25}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sheetRow}>
      <Text style={styles.sheetLabel} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <Text style={styles.sheetValue} maxFontSizeMultiplier={1.15}>
        {value}
      </Text>
    </View>
  );
}

function labelForConcern(concern: string): string {
  switch (concern) {
    case 'breakouts':
      return 'Possible breakout activity';
    case 'redness':
      return 'Possible redness';
    case 'dryness':
      return 'Possible visible dryness';
    case 'texture':
      return 'Possible visible texture';
    case 'darkSpots':
      return 'Possible uneven tone';
    default:
      return 'No clear focus';
  }
}

function sensitivityLabel(r: ProductReactivity | null): string {
  switch (r) {
    case 'often':
      return 'Often';
    case 'sometimes':
      return 'Sometimes';
    case 'rarely':
      return 'Rarely';
    case 'unsure':
    case null:
    default:
      return 'Not sure';
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURA.paper },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  head: { marginBottom: 18 },
  contextChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: PURA_RADIUS.pill,
    backgroundColor: PURA.claySupport,
    marginBottom: 12,
  },
  contextChipLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: PURA.terracottaPressed,
  },
  headline: { fontSize: 30, lineHeight: 36 },
  lead: { marginTop: 10, color: PURA.body, maxWidth: 380 },
  contextRow: {
    flexDirection: 'row',
    marginTop: 18,
    backgroundColor: PURA.paperRaised,
    borderRadius: PURA_RADIUS.card,
    borderWidth: 1,
    borderColor: PURA.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  contextDivider: {
    width: 1,
    height: 32,
    backgroundColor: PURA.border,
    marginHorizontal: 12,
  },
  contextLine: { flex: 1 },
  contextLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: PURA.muted,
    textTransform: 'uppercase',
  },
  contextValue: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
    marginTop: 4,
  },
  sensitivityBlock: { marginBottom: 18 },
  sensitivityLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
    marginBottom: 10,
  },
  sensitivityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sensChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: PURA_RADIUS.pill,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
  },
  sensChipOn: {
    backgroundColor: PURA.claySelected,
    borderColor: PURA.terracotta,
  },
  sensChipLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 13.5,
    color: PURA.body,
  },
  sensChipLabelOn: { color: PURA.ink },
  routineCard: {
    backgroundColor: PURA.paperRaised,
    borderRadius: PURA_RADIUS.reveal,
    borderWidth: 1,
    borderColor: PURA.border,
    padding: 18,
    marginBottom: 12,
    ...PURA_SHADOW.soft,
  },
  routineHead: { marginBottom: 14 },
  steps: { gap: 14 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURA.claySupport,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 12,
    color: PURA.terracottaPressed,
  },
  stepTitle: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 15,
    color: PURA.ink,
  },
  stepBody: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: PURA.body,
    marginTop: 2,
  },
  avoidCard: {
    backgroundColor: PURA.claySubtle,
    borderRadius: PURA_RADIUS.card,
    borderWidth: 1,
    borderColor: PURA.border,
    padding: 14,
    marginBottom: 12,
  },
  avoidBody: { color: PURA.body, marginTop: 8 },
  morningCard: {
    backgroundColor: PURA.paperRaised,
    borderRadius: PURA_RADIUS.card,
    borderWidth: 1,
    borderColor: PURA.border,
    padding: 14,
    marginBottom: 12,
  },
  morningHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  morningBody: { color: PURA.body },
  matchedCard: {
    backgroundColor: PURA.paperRaised,
    borderRadius: PURA_RADIUS.card,
    borderWidth: 1,
    borderColor: PURA.border,
    padding: 16,
    marginBottom: 12,
  },
  matchedTitle: {
    fontFamily: PURA_FONT.serif,
    fontSize: 19,
    color: PURA.ink,
    marginTop: 6,
  },
  matchedBody: { color: PURA.body, marginTop: 6 },
  matchedNote: { color: PURA.muted, marginTop: 10 },
  whyWrap: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  whyLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.body,
    textDecorationLine: 'underline',
  },
  ctaTray: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: PURA.paper,
    borderTopWidth: 1,
    borderTopColor: PURA.border,
  },
  cta: { marginHorizontal: 0, height: 56, borderRadius: 28 },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PURA.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PURA.border,
  },
  sheetLabel: {
    fontFamily: PURA_FONT.sansMed,
    fontSize: 13,
    color: PURA.muted,
  },
  sheetValue: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  sheetFooterText: { color: PURA.muted, flex: 1 },
});
