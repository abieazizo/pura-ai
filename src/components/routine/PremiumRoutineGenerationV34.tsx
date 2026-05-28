/**
 * PremiumRoutineGenerationV34 — scan-derived routine builder UI.
 *
 * The brief said the existing routine generation screen was too generic
 * ("Selecting step", "Finding the best match"). This screen replaces
 * those substages with COPY DERIVED FROM THE SCAN: per-step taglines
 * pulled from `routineSeed.stepTaglines`, sub-statuses from
 * `deriveRoutineSubStatus`. Every line on the screen is traceable to
 * a real concern detected in the user's scan.
 *
 * Four progressive steps: Cleanse → Treat → Moisturize → Protect.
 * Each step animates through three states: pending → analyzing →
 * selected. Selected reveals a green check + the chosen step type.
 *
 * Visual:
 *   • Hero peach-to-blush gradient card with the user's photo thumb
 *     and "Your routine is taking shape" headline.
 *   • Progression dots 1-2-3-4 with dashed connectors.
 *   • Active step expands into a tall card with a coral progress
 *     ring and three sub-status rows.
 *   • Completed steps collapse into a quiet white card with a green
 *     check and the chosen step's product (or step type) below.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  CaretRight,
  Check,
  Lock,
  ShieldCheck,
  Sparkle,
  User,
} from 'phosphor-react-native';
import type { ScanFlowViewModel } from '@/state/scanFlowV34';
import { deriveRoutineSubStatus } from '@/state/scanFlowV34';
import { premiumPalette as C, premiumType as T } from '../scan-results/PremiumScanResultsV34';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type StepType = 'cleanse' | 'treat' | 'moisturize' | 'protect';
type StepStatus = 'pending' | 'analyzing' | 'selected';
type SubPhase = 'selecting' | 'matching' | 'checking';

const STEP_LABEL: Record<StepType, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  moisturize: 'Moisturize',
  protect: 'Protect',
};

const STEP_ORDER: StepType[] = ['cleanse', 'treat', 'moisturize', 'protect'];

export interface PremiumRoutineGenerationV34Props {
  vm: ScanFlowViewModel;
  /** Current step the engine is choosing — null until first tick. */
  activeStep: StepType | null;
  /** Which sub-status the active step is on. */
  activeSubPhase: SubPhase;
  /** Steps already chosen (in order). */
  completedSteps: StepType[];
  /** Optional: routine being built (for showing chosen product name when
   *  a step finishes). Stays null while the build is in progress. */
  chosenProductByStep?: Partial<Record<StepType, string>>;
  /** Failure message, if the build failed. */
  failureReason?: string | null;
  /** Caller for retry from the failure card. */
  onRetry?(): void;
}

export function PremiumRoutineGenerationV34({
  vm,
  activeStep,
  activeSubPhase,
  completedSteps,
  chosenProductByStep,
  failureReason,
  onRetry,
}: PremiumRoutineGenerationV34Props) {
  if (failureReason) {
    return (
      <View style={styles.wrap}>
        <FailureBlock failureReason={failureReason} onRetry={onRetry} />
      </View>
    );
  }
  // Only show step rows that the seed actually recommended; everything
  // else stays as a quiet pending row so the user sees the full shape.
  const includedSteps = new Set<StepType>(vm.routineSeed.recommendedStepTypes);

  return (
    <View style={styles.wrap}>
      <HeroCard vm={vm} />

      <StepDotProgression
        activeStep={activeStep}
        completedSteps={completedSteps}
      />

      <View style={styles.stepList}>
        {STEP_ORDER.map((step, idx) => {
          const isIncluded = includedSteps.has(step);
          const isCompleted = completedSteps.includes(step);
          const isActive = activeStep === step;
          if (!isIncluded) {
            return (
              <OptionalStepCard key={step} step={step} index={idx + 1} />
            );
          }
          if (isActive) {
            return (
              <ActiveStepCard
                key={step}
                step={step}
                index={idx + 1}
                subPhase={activeSubPhase}
                vm={vm}
              />
            );
          }
          if (isCompleted) {
            return (
              <CompletedStepCard
                key={step}
                step={step}
                index={idx + 1}
                vm={vm}
                product={chosenProductByStep?.[step]}
              />
            );
          }
          return (
            <PendingStepCard
              key={step}
              step={step}
              index={idx + 1}
              vm={vm}
            />
          );
        })}
      </View>

      <SafetyFooter />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hero — peach gradient card with the user's scan thumb + serif headline.
// ---------------------------------------------------------------------------

function HeroCard({ vm }: { vm: ScanFlowViewModel }) {
  return (
    <View style={styles.hero}>
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={C.bgSoft} stopOpacity={1} />
            <Stop offset="60%" stopColor={C.coralBgVeil} stopOpacity={1} />
            <Stop offset="100%" stopColor={C.blush} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path d="M0 0 H600 V400 H0 Z" fill="url(#hg)" />
      </Svg>

      <View style={styles.heroContent}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={T.eyebrow}>BUILT FROM YOUR SCAN</Text>
            <Text style={[T.serifHeadline, { marginTop: 8 }]}>
              Your routine is{'\n'}
              <Text style={[T.serifHeadline, { fontFamily: 'InstrumentSerif-Italic', color: C.coral }]}>
                taking shape
              </Text>
            </Text>
          </View>
          <View style={styles.heroPhotoWrap}>
            <Image
              source={vm.photoUri}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          </View>
        </View>

        <Text style={[T.body, { marginTop: 14 }]}>
          Pura is selecting each step from what your scan revealed —{' '}
          {vm.routineSeed.skinNeeds.slice(0, 2).join(' and ')}.
        </Text>

        <View style={styles.trustRow}>
          <TrustPill icon={<Sparkle size={12} color={C.coral} weight="fill" />} label="Powered by AI" />
          <View style={styles.trustSep} />
          <TrustPill icon={<User size={12} color={C.coral} weight="duotone" />} label="Personalized" />
          <View style={styles.trustSep} />
          <TrustPill icon={<ShieldCheck size={12} color={C.coral} weight="duotone" />} label="Backed by science" />
        </View>
      </View>
    </View>
  );
}

function TrustPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.trustPill}>
      {icon}
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step Dot Progression
// ---------------------------------------------------------------------------

function StepDotProgression({
  activeStep,
  completedSteps,
}: {
  activeStep: StepType | null;
  completedSteps: StepType[];
}) {
  return (
    <View style={styles.progression}>
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = completedSteps.includes(step);
        const isActive = activeStep === step;
        const prevDone =
          idx > 0 && completedSteps.includes(STEP_ORDER[idx - 1]);
        return (
          <View key={step} style={styles.progressionCol}>
            {idx > 0 ? (
              <DashedConnector active={prevDone || isCompleted || isActive} />
            ) : null}
            <ProgressionDot
              index={idx + 1}
              completed={isCompleted}
              active={isActive}
            />
            <Text
              style={[
                styles.progressionLabel,
                {
                  color: isCompleted || isActive ? C.ink : C.muted,
                  fontFamily:
                    isCompleted || isActive ? 'Inter-SemiBold' : 'Inter-Regular',
                },
              ]}
            >
              {STEP_LABEL[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ProgressionDot({
  index,
  active,
  completed,
}: {
  index: number;
  active: boolean;
  completed: boolean;
}) {
  if (completed) {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Check size={12} weight="bold" color="#FFFFFF" />
      </View>
    );
  }
  if (active) {
    return (
      <View style={[styles.dot, styles.dotActive]}>
        <Text style={styles.dotActiveNum}>{index}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.dot, styles.dotIdle]}>
      <Text style={styles.dotIdleNum}>{index}</Text>
    </View>
  );
}

function DashedConnector({ active }: { active: boolean }) {
  return (
    <View style={styles.connector}>
      <Svg width="100%" height={2} viewBox="0 0 80 2" preserveAspectRatio="none">
        <Path
          d="M 0 1 L 80 1"
          stroke={active ? C.coral : C.lineStrong}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={active ? 0.9 : 0.45}
        />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active Step Card — scan-derived sub-status copy.
// ---------------------------------------------------------------------------

function ActiveStepCard({
  step,
  index,
  subPhase,
  vm,
}: {
  step: StepType;
  index: number;
  subPhase: SubPhase;
  vm: ScanFlowViewModel;
}) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(enter);
  }, [step, enter]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 6 }],
  }));

  const subStatusCopy = deriveRoutineSubStatus(step, vm);
  const tagline =
    vm.routineSeed.stepTaglines[step] ??
    'Built from your scan.';

  return (
    <Animated.View style={[styles.activeCard, enterStyle]}>
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 600 280"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={C.bgSoft} stopOpacity={1} />
            <Stop offset="100%" stopColor={C.coralBgVeil} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path d="M0 0 H600 V280 H0 Z" fill="url(#ag)" />
      </Svg>

      <View style={styles.activeHeader}>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeNum}>{index}</Text>
        </View>
        <Text style={styles.activeTitle}>{STEP_LABEL[step]}</Text>
        <View style={styles.activePill}>
          <Text style={styles.activePillText}>ANALYZING</Text>
        </View>
      </View>

      <Text style={[T.serifItalic, styles.activeTagline]}>{tagline}</Text>

      <View style={styles.activeBody}>
        <AnalyzingRing />
        <View style={styles.subStatusList}>
          <SubStatusRow
            label={subStatusCopy.selecting}
            state={phaseState(subPhase, 'selecting')}
          />
          <SubStatusRow
            label={subStatusCopy.matching}
            state={phaseState(subPhase, 'matching')}
          />
          <SubStatusRow
            label={subStatusCopy.checking}
            state={phaseState(subPhase, 'checking')}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function phaseState(
  current: SubPhase,
  row: SubPhase,
): 'done' | 'active' | 'pending' {
  const order: SubPhase[] = ['selecting', 'matching', 'checking'];
  if (current === row) return 'active';
  if (order.indexOf(current) > order.indexOf(row)) return 'done';
  return 'pending';
}

function SubStatusRow({
  label,
  state,
}: {
  label: string;
  state: 'done' | 'active' | 'pending';
}) {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    if (state === 'active') {
      pulse.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
    return () => cancelAnimation(pulse);
  }, [state, pulse]);
  const dotAnim = useAnimatedStyle(() => ({
    opacity: state === 'active' ? pulse.value : 1,
  }));

  return (
    <View style={styles.subRow}>
      {state === 'done' ? (
        <View style={[styles.subDot, styles.subDotDone]}>
          <Check size={9} weight="bold" color="#FFFFFF" />
        </View>
      ) : state === 'active' ? (
        <Animated.View
          style={[styles.subDot, styles.subDotActive, dotAnim]}
        />
      ) : (
        <View style={[styles.subDot, styles.subDotIdle]} />
      )}
      <Text
        style={[
          styles.subLabel,
          {
            color: state === 'pending' ? C.muted : C.ink,
            fontFamily:
              state === 'pending' ? 'Inter-Regular' : 'Inter-Medium',
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

function AnalyzingRing() {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotate);
  }, [rotate]);
  const animProps = useAnimatedProps(() => ({
    transform: `rotate(${rotate.value}, 50, 50)`,
  }));

  return (
    <View style={styles.ringWrap}>
      <Svg width={84} height={84} viewBox="0 0 100 100">
        <Circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={C.coralWash}
          strokeWidth={3}
          opacity={0.6}
        />
        <AnimatedCircle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={C.coral}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="44 220"
          animatedProps={animProps}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Sparkle size={12} color={C.coral} weight="duotone" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Completed / Pending / Optional step cards.
// ---------------------------------------------------------------------------

function CompletedStepCard({
  step,
  index,
  vm,
  product,
}: {
  step: StepType;
  index: number;
  vm: ScanFlowViewModel;
  product?: string;
}) {
  const tagline = vm.routineSeed.stepTaglines[step] ?? 'Built from your scan.';
  return (
    <Pressable style={styles.staticCard} accessibilityRole="button">
      <View style={styles.staticBadge}>
        <Text style={styles.staticBadgeNum}>{index}</Text>
      </View>
      <View
        style={[
          styles.staticIcon,
          { backgroundColor: '#E6EFE0', borderColor: '#C8D6BB' },
        ]}
      >
        <Check size={16} weight="bold" color="#506941" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.staticTitleRow}>
          <Text style={styles.staticTitle}>{STEP_LABEL[step]}</Text>
          <View style={[styles.staticChip, { backgroundColor: '#E6EFE0' }]}>
            <Text style={[styles.staticChipText, { color: '#506941' }]}>
              Matched
            </Text>
          </View>
        </View>
        <Text style={styles.staticSub} numberOfLines={2}>
          {product ?? tagline}
        </Text>
      </View>
      <CaretRight size={16} color={C.muted} weight="regular" />
    </Pressable>
  );
}

function PendingStepCard({
  step,
  index,
  vm,
}: {
  step: StepType;
  index: number;
  vm: ScanFlowViewModel;
}) {
  const tagline = vm.routineSeed.stepTaglines[step] ?? `Building your ${STEP_LABEL[step].toLowerCase()} step…`;
  return (
    <View style={styles.staticCard}>
      <View style={[styles.staticBadge, { opacity: 0.65 }]}>
        <Text style={styles.staticBadgeNum}>{index}</Text>
      </View>
      <View
        style={[
          styles.staticIcon,
          { backgroundColor: C.bgSoft, borderColor: C.line },
        ]}
      >
        <Lock size={14} weight="bold" color={C.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.staticTitleRow}>
          <Text style={styles.staticTitle}>{STEP_LABEL[step]}</Text>
          <View style={[styles.staticChip, { backgroundColor: '#EFE5F0' }]}>
            <Text style={[styles.staticChipText, { color: '#6C5470' }]}>
              Up next
            </Text>
          </View>
        </View>
        <Text style={styles.staticSub} numberOfLines={2}>
          {tagline}
        </Text>
      </View>
    </View>
  );
}

function OptionalStepCard({
  step,
  index,
}: {
  step: StepType;
  index: number;
}) {
  return (
    <View style={[styles.staticCard, { opacity: 0.55 }]}>
      <View style={styles.staticBadge}>
        <Text style={styles.staticBadgeNum}>{index}</Text>
      </View>
      <View
        style={[
          styles.staticIcon,
          { backgroundColor: C.bgSoft, borderColor: C.line },
        ]}
      >
        <Lock size={14} weight="bold" color={C.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.staticTitle}>{STEP_LABEL[step]}</Text>
        <Text style={styles.staticSub} numberOfLines={1}>
          Not needed right now — your scan didn't call for this.
        </Text>
      </View>
    </View>
  );
}

function SafetyFooter() {
  return (
    <View style={styles.safetyCard}>
      <ShieldCheck size={16} weight="duotone" color={C.coral} />
      <Text style={[T.caption, { flex: 1 }]}>
        Every product is chosen with your skin's safety in mind. You can
        review everything before locking it in.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Failure variant.
// ---------------------------------------------------------------------------

function FailureBlock({
  failureReason,
  onRetry,
}: {
  failureReason: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.failureCard}>
      <Text style={T.eyebrow}>BUILD INTERRUPTED</Text>
      <Text style={[T.serifHeadline, { marginTop: 8 }]}>
        We couldn't finish your routine.
      </Text>
      <Text style={[T.body, { marginTop: 10 }]}>
        Your scan is saved. {failureReason}
      </Text>
      <Pressable style={styles.failureBtn} onPress={onRetry ?? (() => undefined)}>
        <Text style={styles.failureBtnLabel}>Try again</Text>
        <CaretRight size={14} weight="bold" color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 18,
  },

  hero: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.coralWash,
  },
  heroContent: {
    padding: 22,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroPhotoWrap: {
    width: 60,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.coralWash,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.coralWash,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  trustSep: {
    width: 1,
    height: 12,
    backgroundColor: C.coralWash,
  },
  trustLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: C.ink,
  },

  progression: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  progressionCol: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 16,
    left: '-50%',
    right: '50%',
    height: 2,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dotDone: {
    backgroundColor: C.coral,
    borderColor: C.coral,
  },
  dotActive: {
    backgroundColor: C.coral,
    borderColor: C.coral,
  },
  dotIdle: {
    backgroundColor: C.cardElevated,
    borderColor: C.line,
  },
  dotActiveNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  dotIdleNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.muted,
  },
  progressionLabel: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 14,
    textAlign: 'center',
  },

  stepList: { gap: 10 },

  // Active step
  activeCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.coralWash,
    padding: 18,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeNum: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  activeTitle: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    color: C.ink,
    letterSpacing: -0.2,
  },
  activePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.coralBgVeil,
    borderWidth: 1,
    borderColor: C.coralWash,
  },
  activePillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: C.coral,
  },
  activeTagline: {
    marginTop: 6,
    paddingLeft: 34,
  },
  activeBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  ringWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subStatusList: { flex: 1, gap: 9 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  subDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subDotDone: { backgroundColor: C.coral },
  subDotActive: {
    borderWidth: 1.5,
    borderColor: C.coral,
    borderStyle: 'dashed',
  },
  subDotIdle: { borderWidth: 1.5, borderColor: C.line },
  subLabel: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
  },

  // Static cards
  staticCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
  },
  staticBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.bgSoft,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticBadgeNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: C.muted,
  },
  staticIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  staticTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staticTitle: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    color: C.ink,
    letterSpacing: -0.1,
  },
  staticChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  staticChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  staticSub: {
    marginTop: 2,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.inkSoft,
  },

  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: C.bgSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
  },

  // Failure
  failureCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: C.line,
  },
  failureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: C.coral,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  failureBtnLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
