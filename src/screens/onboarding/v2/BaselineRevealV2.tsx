/**
 * v29 — Baseline + Goal Alignment.
 *
 * The user has just been through a genuine quality-gated scan. This
 * screen does two things at once, in this order:
 *
 *   1. State an HONEST visible observation. The label + summary come
 *      from `VisibleObservation`, which is built in ScanReviewV2 with
 *      these tiers:
 *        • insufficient — should never reach here (route loops to
 *          retake), but if state is somehow stale we render a calm
 *          retake card and refuse to continue.
 *        • uncertain    — "There isn’t one clear focus today."
 *        • supported    — single-concern direct statement.
 *        • none         — "Your skin looks steady today."
 *
 *   2. Let the user say what matters most tonight. This is the goal
 *      step. The visible observation and the user's goal stay distinct
 *      throughout the rest of onboarding so Pura never appears to
 *      "detect" what the user selected.
 *
 * The next screen is TonightRoutineV2.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Info } from 'phosphor-react-native';
import {
  OnboardingScreenShellV2,
  EditorialHeadline,
  BodyText,
  Eyebrow,
  HelperText,
  WarmInfoPanel,
  PURA,
  PURA_FONT,
  PURA_RADIUS,
  PURA_SHADOW,
} from '@/components/onboarding/v2';
import { useOnboardingV2 } from '@/state/onboardingV2';
import {
  bridgeOnboardingToCanonical,
  type PrimaryGoal,
} from '@/state/onboardingV2';
import { onboardingV2 } from '@/ai/onboardingAnalyticsV2';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';

export interface BaselineRevealV2Props {
  onContinue: () => void;
  onRetake: () => void;
}

const GOAL_OPTIONS: ReadonlyArray<{ value: PrimaryGoal; label: string }> = [
  { value: 'breakouts', label: 'Breakouts' },
  { value: 'redness', label: 'Redness' },
  { value: 'dryness', label: 'Dryness' },
  { value: 'texture', label: 'Texture' },
  { value: 'darkSpots', label: 'Dark spots' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CHIP_SPRING = { damping: 18, stiffness: 340, mass: 1 };

/**
 * Individual goal chip with spring press feedback. Each chip owns its
 * own scale shared value so simultaneous taps on different chips don't
 * share animation state.
 */
function GoalChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handle = () => {
    scale.value = withSpring(0.955, CHIP_SPRING, () => {
      scale.value = withSpring(1, CHIP_SPRING);
    });
    onPress();
  };
  return (
    <AnimatedPressable
      onPress={handle}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.goalChip,
        selected && styles.goalChipOn,
        animated,
      ]}
    >
      <Text
        style={[styles.goalChipLabel, selected && styles.goalChipLabelOn]}
        maxFontSizeMultiplier={1.15}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function BaselineRevealV2({
  onContinue,
  onRetake,
}: BaselineRevealV2Props) {
  const reduceMotion = useReduceMotion();
  const observation = useOnboardingV2((s) => s.visibleObservation);
  const capturedScanUri = useOnboardingV2((s) => s.capturedScanUri);
  const primaryGoal = useOnboardingV2((s) => s.primaryGoal);
  const setPrimaryGoal = useOnboardingV2((s) => s.setPrimaryGoal);
  const [showFocus, setShowFocus] = useState(false);

  useEffect(() => {
    onboardingV2.baselineViewed({
      goal: primaryGoal ?? 'breakouts',
      confidenceTier:
        observation?.confidence === 'supported'
          ? 'high'
          : observation?.confidence === 'low'
          ? 'medium'
          : 'low',
    });
  }, [observation, primaryGoal]);

  // Entry choreography
  const eyebrowOp = useSharedValue(0);
  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 10);
  const snapshotOp = useSharedValue(0);
  const goalOp = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    eyebrowOp.value = withTiming(1, { duration: 220, easing: ease });
    headlineOp.value = withDelay(120, withTiming(1, { duration: 360, easing: ease }));
    headlineY.value = withDelay(120, withTiming(0, { duration: 360, easing: ease }));
    snapshotOp.value = withDelay(320, withTiming(1, { duration: 380, easing: ease }));
    goalOp.value = withDelay(500, withTiming(1, { duration: 360, easing: ease }));
  }, [eyebrowOp, headlineOp, headlineY, snapshotOp, goalOp]);

  const eyebrowStyle = useAnimatedStyle(() => ({ opacity: eyebrowOp.value }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const snapshotStyle = useAnimatedStyle(() => ({ opacity: snapshotOp.value }));
  const goalStyle = useAnimatedStyle(() => ({ opacity: goalOp.value }));

  // Insufficient confidence -> calm retake card (Rule 1).
  if (!observation || observation.confidence === 'insufficient') {
    return (
      <OnboardingScreenShellV2
        topBar={{ showBack: false }}
        bottom={{
          primaryLabel: 'Retake scan',
          onPrimary: () => {
            hapt.select();
            onRetake();
          },
        }}
      >
        <View style={styles.head}>
          <Eyebrow>BASELINE NOT READY</Eyebrow>
          <EditorialHeadline style={styles.headline}>
            We need a clearer photo before creating your baseline.
          </EditorialHeadline>
          <BodyText style={styles.lead}>
            Pura did not run any analysis on that scan.
          </BodyText>
        </View>
      </OnboardingScreenShellV2>
    );
  }

  const ctaDisabled = !primaryGoal;

  // Goal vs observation alignment
  const goalMatchesObservation = useMemo(() => {
    if (!primaryGoal || observation.concern === 'none' || observation.concern === 'uncertain') {
      return true;
    }
    return primaryGoal === observation.concern;
  }, [primaryGoal, observation.concern]);

  return (
    <OnboardingScreenShellV2
      topBar={{ showBack: true }}
      bottom={{
        primaryLabel: ctaDisabled ? 'Choose what matters to you' : 'Build tonight’s routine',
        onPrimary: () => {
          if (!primaryGoal) return;
          bridgeOnboardingToCanonical();
          onContinue();
        },
        primaryDisabled: ctaDisabled,
        disabledReason: 'Choose what matters most to you tonight.',
        secondary: { label: 'Retake scan', onPress: onRetake },
      }}
    >
      <View style={styles.head}>
        <Animated.View style={eyebrowStyle}>
          <Eyebrow>YOUR FIRST BASELINE</Eyebrow>
        </Animated.View>
        <Animated.View style={headlineStyle}>
          <EditorialHeadline style={styles.headline}>
            {observation.label}
          </EditorialHeadline>
        </Animated.View>
        <BodyText style={styles.lead}>{observation.summary}</BodyText>
        <HelperText style={styles.transparencyLine}>
          Based on visible appearance only
        </HelperText>
      </View>

      {capturedScanUri ? (
        <Animated.View style={[styles.snapshotWrap, snapshotStyle]}>
          <View style={styles.snapshotFrame}>
            <Image
              source={{ uri: capturedScanUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <View pointerEvents="none" style={styles.snapshotVignette} />
            {showFocus && observation.supportsOverlay ? (
              <View style={[styles.focusMark, styles.focusForehead]} />
            ) : null}
          </View>
          {observation.supportsOverlay ? (
            <Pressable
              onPress={() => setShowFocus((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: showFocus }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.focusToggle,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.focusToggleLabel} maxFontSizeMultiplier={1.15}>
                {showFocus ? 'Hide where we noticed this' : 'See where we noticed this'}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.goalBlock, goalStyle]}>
        <Text style={styles.goalLabel} maxFontSizeMultiplier={1.15}>
          What matters most to you tonight?
        </Text>
        <View style={styles.goalChips}>
          {GOAL_OPTIONS.map((opt) => (
            <GoalChip
              key={opt.value}
              label={opt.label}
              selected={primaryGoal === opt.value}
              onPress={() => {
                hapt.select();
                setPrimaryGoal(opt.value);
                onboardingV2.goalSelected(opt.value);
              }}
            />
          ))}
        </View>
        {primaryGoal && !goalMatchesObservation ? (
          <View style={styles.alignNote}>
            <BodyText style={styles.alignNoteText}>
              Tonight’s plan can stay gentle while supporting your goal.
            </BodyText>
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.boundaryWrap}>
        <WarmInfoPanel Icon={Info} tone="paper">
          Pura offers cosmetic guidance, not medical diagnosis.
        </WarmInfoPanel>
      </View>
    </OnboardingScreenShellV2>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 18,
  },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    marginTop: 10,
  },
  lead: { marginTop: 14, color: PURA.body, maxWidth: 380 },
  transparencyLine: {
    marginTop: 10,
    color: PURA.muted,
  },
  snapshotWrap: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    alignItems: 'center',
  },
  snapshotFrame: {
    width: '100%',
    aspectRatio: 1.05,
    borderRadius: PURA_RADIUS.reveal,
    overflow: 'hidden',
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
    ...PURA_SHADOW.soft,
  },
  snapshotVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,20,16,0.06)',
  },
  focusMark: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: PURA.terracotta,
    backgroundColor: 'rgba(198,93,72,0.18)',
  },
  focusForehead: { top: '18%', left: '46%' },
  focusToggle: { marginTop: 12, paddingVertical: 6 },
  focusToggleLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 13,
    color: PURA.terracotta,
    textDecorationLine: 'underline',
  },
  goalBlock: { paddingHorizontal: 24, paddingBottom: 18 },
  goalLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.ink,
    marginBottom: 12,
  },
  goalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: PURA_RADIUS.pill,
    backgroundColor: PURA.paperRaised,
    borderWidth: 1,
    borderColor: PURA.border,
  },
  goalChipOn: {
    backgroundColor: PURA.claySelected,
    borderColor: PURA.terracotta,
  },
  goalChipLabel: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 14,
    color: PURA.body,
  },
  goalChipLabelOn: { color: PURA.ink },
  alignNote: {
    marginTop: 14,
    padding: 12,
    borderRadius: PURA_RADIUS.card,
    backgroundColor: PURA.claySubtle,
    borderWidth: 1,
    borderColor: PURA.border,
  },
  alignNoteText: { color: PURA.body },
  boundaryWrap: { paddingHorizontal: 24, paddingBottom: 12 },
});
