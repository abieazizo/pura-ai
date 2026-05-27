import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { CheckCircle, Sparkle } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { useAppStore } from '@/store/useAppStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import {
  deriveOnboardingProfile,
  snapshotFromState,
} from '@/state/onboardingProfile';
import {
  effortLabel,
  goalLabel,
  sensitivityLabel,
  skinTypeLabel,
  sunExposureLabel,
} from './labelMaps';
import { palette } from '@/theme';

export interface PlanRevealProps {
  /** Save profile + start first scan flow. */
  onUnlock: () => void;
  /** Optional "Review my answers" tail (still routes to ProfileSummary). */
  onReview: () => void;
}

const TEXT_PRIMARY = '#101828';
const TEXT_SECONDARY = '#475467';
const TEXT_MUTED = '#98A2B3';
const SOFT_BLUE_SURFACE = '#F3F7FF';
const BLUE_BORDER = '#D6E4FF';
const PRIMARY_BLUE = '#3B82F6';
const NAVY = '#07111F';

const TIMING_LABELS: Record<string, string> = {
  am_pm: 'Morning + night',
  am: 'Mostly morning',
  pm: 'Mostly night',
  inconsistent: 'Flexible',
};

/**
 * v21.0 — Profile Preview.
 *
 * The emotional payoff after the question arc. Shows for ~1.6s as a
 * "Building your first skin profile…" loading state, then reveals the
 * derived starting approach, a recap of every answer as chips, and a
 * "what this means" list of plan guardrails.
 *
 * The CTA is "Save and start first scan" — the user is moving toward
 * a baseline, not a paywall. The paywall lives later in the post-scan
 * flow, not here.
 */
export function PlanReveal({ onUnlock, onReview }: PlanRevealProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const goal = useAppStore((s) => s.goal);
  const concerns = useAppStore((s) => s.concerns);
  const skinType = useAppStore((s) => s.skinType);
  const sensitivity = useAppStore((s) => s.sensitivity);
  const effort = useAppStore((s) => s.effort);
  const sunExposure = useAppStore((s) => s.sunExposure);
  const routineTiming = useAppStore((s) => s.routineTiming);
  const patternContext = useAppStore((s) => s.patternContext);

  const snap = useMemo(
    () =>
      snapshotFromState({
        goal,
        concerns,
        skinType,
        sensitivity,
        effort,
        sunExposure,
        routineTiming,
        patternContext,
      }),
    [
      goal,
      concerns,
      skinType,
      sensitivity,
      effort,
      sunExposure,
      routineTiming,
      patternContext,
    ],
  );
  const derived = useMemo(() => deriveOnboardingProfile(snap), [snap]);

  const [phase, setPhase] = useState<'loading' | 'revealed'>('loading');
  useEffect(() => {
    const delay = reduceMotion ? 600 : 1600;
    const t = setTimeout(() => {
      setPhase('revealed');
      if (!reduceMotion) hapt.success();
    }, delay);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  return phase === 'loading' ? (
    <LoadingState insetsTop={insets.top} />
  ) : (
    <RevealedState
      insets={insets}
      derived={derived}
      goal={goal}
      concerns={concerns}
      skinType={skinType}
      sensitivity={sensitivity}
      effort={effort}
      sunExposure={sunExposure}
      routineTiming={routineTiming}
      onUnlock={onUnlock}
      onReview={onReview}
      reduceMotion={reduceMotion}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Loading state                                                      */
/* ------------------------------------------------------------------ */

function LoadingState({ insetsTop }: { insetsTop: number }) {
  return (
    <SafeAreaView style={loadingStyles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={[loadingStyles.center, { paddingTop: insetsTop }]}>
        <PuraMark variant="thinking" size="md" glow />
        <Text style={loadingStyles.title} maxFontSizeMultiplier={1.15}>
          Building your first skin profile…
        </Text>
        <Text style={loadingStyles.sub} maxFontSizeMultiplier={1.2}>
          Pura is turning your answers into a starting plan.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Revealed state                                                     */
/* ------------------------------------------------------------------ */

interface RevealProps {
  insets: { top: number; bottom: number };
  derived: ReturnType<typeof deriveOnboardingProfile>;
  goal: ReturnType<typeof useAppStore.getState>['goal'];
  concerns: string[];
  skinType: ReturnType<typeof useAppStore.getState>['skinType'];
  sensitivity: ReturnType<typeof useAppStore.getState>['sensitivity'];
  effort: ReturnType<typeof useAppStore.getState>['effort'];
  sunExposure: ReturnType<typeof useAppStore.getState>['sunExposure'];
  routineTiming: ReturnType<typeof useAppStore.getState>['routineTiming'];
  onUnlock: () => void;
  onReview: () => void;
  reduceMotion: boolean;
}

function RevealedState({
  insets,
  derived,
  goal,
  concerns,
  skinType,
  sensitivity,
  effort,
  sunExposure,
  routineTiming,
  onUnlock,
  onReview,
  reduceMotion,
}: RevealProps) {
  const headlineOp = useSharedValue(0);
  const headlineY = useSharedValue(reduceMotion ? 0 : 10);
  const cardOp = useSharedValue(0);
  const cardY = useSharedValue(reduceMotion ? 0 : 14);
  const summaryOp = useSharedValue(0);
  const meaningOp = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.out(Easing.cubic);
    headlineOp.value = withTiming(1, { duration: 380, easing: easeOut });
    headlineY.value = withTiming(0, { duration: 380, easing: easeOut });
    cardOp.value = withDelay(
      160,
      withTiming(1, { duration: 420, easing: easeOut }),
    );
    cardY.value = withDelay(
      160,
      withTiming(0, { duration: 420, easing: easeOut }),
    );
    summaryOp.value = withDelay(
      360,
      withTiming(1, { duration: 420, easing: easeOut }),
    );
    meaningOp.value = withDelay(
      540,
      withTiming(1, { duration: 420, easing: easeOut }),
    );
  }, [headlineOp, headlineY, cardOp, cardY, summaryOp, meaningOp]);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOp.value,
    transform: [{ translateY: headlineY.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOp.value,
    transform: [{ translateY: cardY.value }],
  }));
  const summaryStyle = useAnimatedStyle(() => ({ opacity: summaryOp.value }));
  const meaningStyle = useAnimatedStyle(() => ({ opacity: meaningOp.value }));

  const focusValue =
    concerns && concerns.length > 0 ? concerns.join(' · ') : 'Calibrating';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 200,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>STEP 7 OF 7 · PROFILE</Text>
          <Animated.Text
            style={[styles.headline, headlineStyle]}
            maxFontSizeMultiplier={1.15}
            accessibilityRole="header"
          >
            Your first skin profile is ready.
          </Animated.Text>
          <Animated.Text
            style={[styles.sub, headlineStyle]}
            maxFontSizeMultiplier={1.25}
          >
            Here’s how Pura will start — your first scan will refine it.
          </Animated.Text>
        </View>

        <Animated.View style={[styles.approachCard, cardStyle]}>
          <Text style={styles.approachKicker} maxFontSizeMultiplier={1.1}>
            STARTING APPROACH
          </Text>
          <Text style={styles.approachLabel} maxFontSizeMultiplier={1.15}>
            {derived.startingApproach}
          </Text>
          <Text style={styles.approachBody} maxFontSizeMultiplier={1.25}>
            {derived.approachExplanation}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.summaryGrid, summaryStyle]}>
          <SummaryCard label="GOAL" value={goalLabel(goal)} />
          <SummaryCard label="FOCUS AREAS" value={focusValue} />
          <SummaryCard
            label="SKIN BEHAVIOR"
            value={`${skinTypeLabel(skinType)} · ${sensitivityLabel(sensitivity)}`}
          />
          <SummaryCard label="ROUTINE STYLE" value={effortLabel(effort)} />
          <SummaryCard
            label="LIFESTYLE"
            value={`${sunExposureLabel(sunExposure)}${
              routineTiming ? ` · ${TIMING_LABELS[routineTiming] ?? ''}` : ''
            }`}
          />
        </Animated.View>

        <Animated.View style={[styles.meaningBlock, meaningStyle]}>
          <Text style={styles.meaningKicker}>WHAT THIS MEANS</Text>
          <View style={styles.meaningList}>
            {derived.meaningBullets.map((b, i) => (
              <View key={i} style={styles.meaningRow}>
                <CheckCircle
                  size={16}
                  color={PRIMARY_BLUE}
                  weight="duotone"
                />
                <Text style={styles.meaningText} maxFontSizeMultiplier={1.25}>
                  {b}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View
        style={[styles.ctaWrap, { paddingBottom: insets.bottom + 24 }]}
      >
        <OnboardingPrimaryButton
          label="Save and start first scan"
          onPress={onUnlock}
        />
        <Pressable
          onPress={onReview}
          accessibilityRole="button"
          accessibilityLabel="Edit my answers"
          style={({ pressed }) => [
            styles.reviewWrap,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <Text style={styles.reviewLabel} maxFontSizeMultiplier={1.15}>
            Edit answers
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
      <Text
        style={styles.summaryValue}
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
      >
        {value}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const loadingStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: TEXT_PRIMARY,
    marginTop: 28,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_SECONDARY,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 320,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  flex: { flex: 1 },
  headerBlock: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: TEXT_PRIMARY,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_SECONDARY,
    marginTop: 10,
    maxWidth: 320,
  },
  approachCard: {
    marginHorizontal: 24,
    marginTop: 22,
    padding: 20,
    borderRadius: 20,
    backgroundColor: SOFT_BLUE_SURFACE,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
  },
  approachKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: PRIMARY_BLUE,
  },
  approachLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  approachBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_SECONDARY,
    marginTop: 8,
  },
  summaryGrid: {
    marginTop: 22,
    marginHorizontal: 24,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  summaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: TEXT_MUTED,
  },
  summaryValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  meaningBlock: {
    marginTop: 26,
    marginHorizontal: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  meaningKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: TEXT_MUTED,
  },
  meaningList: {
    marginTop: 12,
    gap: 10,
  },
  meaningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  meaningText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_PRIMARY,
  },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    backgroundColor: palette.bg,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  reviewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  reviewLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: TEXT_SECONDARY,
    textDecorationLine: 'underline',
  },
});

// Silence unused-import warnings for icons retained for future variants.
void Sparkle;
void NAVY;
