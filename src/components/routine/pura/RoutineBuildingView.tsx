/**
 * RoutineBuildingView — pixel-locked to the approved design.
 *
 * Composition (top → bottom):
 *
 *   • Hero peach-gradient card
 *     - eyebrow:  PREVIEWING YOUR PLAN
 *     - title:    "Your custom routine is taking shape"
 *                 ("taking shape" rendered in coral serif italic)
 *     - body:     "We're building your routine from your scan and
 *                  selecting the best products for your skin."
 *     - three trust pills: Powered by AI · Personalized to you ·
 *       Backed by science  (icons left of each label)
 *
 *   • Numbered step progression — 1 · 2 · 3 · 4
 *       Cleanse · Treat · Moisturize · Protect
 *     Each numbered marker is a circle, connected by dashed lines.
 *     The active step is filled coral, completed steps show a coral
 *     check, pending steps are neutral outlines.
 *
 *   • Active step card (warm blush) — only one at a time.
 *     - step number badge top-left
 *     - title and italic coral subtitle
 *     - Analyzing ring on the left (coral progress arc + label)
 *     - three live sub-statuses on the right:
 *         Selecting step
 *         Finding the best match
 *         Checking compatibility
 *     - right-aligned chevron arrow
 *
 *   • Pending step cards — one per remaining step type. Each shows a
 *     numbered tile with a small lock icon, the step title, a lilac
 *     "Pending" badge, the helper text and a chevron.
 *
 *   • Safety footer — shield icon + body + "How it works" link.
 *
 * Failure state replaces the active block with a recovery card.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import {
  CaretRight,
  Check,
  Info,
  Lock,
  Shield,
  ShieldCheck,
  Sparkle,
  User,
} from 'phosphor-react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineShadows as S,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import type {
  CustomRoutine,
  RoutineBuildProductStep,
  RoutineBuildProgress,
  RoutineBuildSubPhase,
} from '@/types/routine';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  PuraButton,
  PuraCard,
  QuietTextButton,
} from './primitives';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEP_ORDER: RoutineBuildProductStep[] = [
  'cleanse',
  'treat',
  'moisturize',
  'protect',
];

const STEP_LABEL: Record<RoutineBuildProductStep, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  moisturize: 'Moisturize',
  protect: 'Protect',
};

const STEP_TAGLINE: Record<RoutineBuildProductStep, string> = {
  cleanse: 'Selecting the perfect cleanser for you',
  treat: 'Choosing a treatment matched to your scan',
  moisturize: 'Matching a moisturizer for your barrier',
  protect: 'Picking the right daily SPF',
};

const STEP_PENDING_HELP: Record<RoutineBuildProductStep, string> = {
  cleanse: "We'll find a gentle daily cleanser for your skin",
  treat: "We'll find the right treatment for your concerns",
  moisturize: "We'll match you with the best moisturizer",
  protect: "We'll choose the ideal SPF for daily defense",
};

interface RoutineBuildingViewProps {
  progress: RoutineBuildProgress | null;
  draft?: CustomRoutine | null;
  failureReason?: string | null;
  onRetry?: () => void;
  onReturnToScan?: () => void;
  onRetakeScan?: () => void;
  onHowItWorks?: () => void;
}

export function RoutineBuildingView({
  progress,
  draft,
  failureReason,
  onRetry,
  onReturnToScan,
  onRetakeScan,
  onHowItWorks,
}: RoutineBuildingViewProps) {
  const activeStep = progress?.activeProductStep ?? null;
  const completed = progress?.completedProductSteps ?? [];
  const subPhase = progress?.activeSubPhase ?? 'selecting_step';

  if (failureReason) {
    return <FailureBlock failureReason={failureReason} onRetry={onRetry} onReturnToScan={onReturnToScan} onRetakeScan={onRetakeScan} />;
  }

  return (
    <View style={styles.wrap}>
      <HeroCard />

      <StepProgression activeStep={activeStep} completed={completed} />

      <View style={styles.stepList}>
        {STEP_ORDER.map((step, idx) => {
          const isCompleted = completed.includes(step);
          const isActive = activeStep === step;
          if (isActive) {
            return (
              <ActiveStepCard
                key={step}
                step={step}
                index={idx + 1}
                subPhase={subPhase}
                draft={draft ?? null}
              />
            );
          }
          if (isCompleted) {
            return (
              <CompletedStepCard
                key={step}
                step={step}
                index={idx + 1}
                draft={draft ?? null}
              />
            );
          }
          return <PendingStepCard key={step} step={step} index={idx + 1} />;
        })}
      </View>

      <SafetyFooter onPress={onHowItWorks} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hero card — peach gradient + editorial + trust pills
// ---------------------------------------------------------------------------

function HeroCard() {
  return (
    <View style={styles.hero}>
      {/* Peach gradient backdrop */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={C.surfaceSoft} stopOpacity={1} />
            <Stop offset="60%" stopColor={C.surfaceBlush} stopOpacity={1} />
            <Stop offset="100%" stopColor={C.peachGlow} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 0 H600 V400 H0 Z"
          fill="url(#heroGrad)"
        />
      </Svg>

      <View style={styles.heroContent}>
        <Eyebrow tone="coral" style={styles.heroEyebrow}>
          PREVIEWING YOUR PLAN
        </Eyebrow>
        <Text
          maxFontSizeMultiplier={1.2}
          style={styles.heroTitle}
        >
          Your custom routine{'\n'}
          <Text style={styles.heroTitleAccent}>is taking shape</Text>
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.heroBody}>
          We're building your routine from your scan and selecting the best
          products for your skin.
        </Text>

        <View style={styles.heroDivider} />

        <View style={styles.heroPills}>
          <TrustPill
            icon={<Sparkle size={14} color={C.coralDeep} weight="fill" />}
            label="Powered by AI"
          />
          <View style={styles.heroPillSep} />
          <TrustPill
            icon={<User size={14} color={C.coralDeep} weight="duotone" />}
            label="Personalized to you"
          />
          <View style={styles.heroPillSep} />
          <TrustPill
            icon={<ShieldCheck size={14} color={C.coralDeep} weight="duotone" />}
            label="Backed by science"
          />
        </View>
      </View>
    </View>
  );
}

function TrustPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.trustPill}>
      <View style={styles.trustIcon}>{icon}</View>
      <Text style={styles.trustLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step progression — 1 — 2 — 3 — 4 numbered dots with dashed connectors
// ---------------------------------------------------------------------------

function StepProgression({
  activeStep,
  completed,
}: {
  activeStep: RoutineBuildProductStep | null;
  completed: RoutineBuildProductStep[];
}) {
  return (
    <View style={styles.progression} accessibilityLiveRegion="polite">
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = completed.includes(step);
        const isActive = activeStep === step;
        const prevCompleted =
          idx > 0 && completed.includes(STEP_ORDER[idx - 1]);
        return (
          <View key={step} style={styles.progressionColumn}>
            {idx > 0 ? (
              <DashedConnector active={prevCompleted || isCompleted || isActive} />
            ) : (
              <View style={styles.progressionConnectorSpacer} />
            )}
            <ProgressionDot
              index={idx + 1}
              completed={isCompleted}
              active={isActive}
            />
            <Text
              maxFontSizeMultiplier={1.15}
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
      <View style={[styles.progressionDot, styles.progressionDotDone]}>
        <Check size={14} color="#FFFFFF" weight="bold" />
      </View>
    );
  }
  if (active) {
    return (
      <View style={[styles.progressionDot, styles.progressionDotActive]}>
        <Text style={styles.progressionNumberActive}>{index}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.progressionDot, styles.progressionDotIdle]}>
      <Text style={styles.progressionNumberIdle}>{index}</Text>
    </View>
  );
}

function DashedConnector({ active }: { active: boolean }) {
  const dashColor = active ? C.coralStrong : C.lineStrong;
  return (
    <View style={styles.progressionConnectorWrap}>
      <Svg width="100%" height={2} viewBox="0 0 80 2" preserveAspectRatio="none">
        <Path
          d="M 0 1 L 80 1"
          stroke={dashColor}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={active ? 0.9 : 0.55}
        />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active step card — Analyzing ring + sub-status rows
// ---------------------------------------------------------------------------

function ActiveStepCard({
  step,
  index,
  subPhase,
  draft,
}: {
  step: RoutineBuildProductStep;
  index: number;
  subPhase: RoutineBuildSubPhase;
  draft: CustomRoutine | null;
}) {
  // Soft entrance animation
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(enter);
  }, [step, enter]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 6 }],
  }));

  return (
    <Animated.View style={[styles.activeCard, enterStyle]}>
      {/* Soft peach background gradient inside the card */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 600 280"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={C.surfaceSoft} stopOpacity={1} />
            <Stop offset="100%" stopColor={C.coralWash} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 0 H600 V280 H0 Z"
          fill="url(#activeGrad)"
        />
      </Svg>

      {/* Step number badge */}
      <View style={styles.activeStepBadgeRow}>
        <View style={styles.activeStepBadge}>
          <Text style={styles.activeStepBadgeNumber}>{index}</Text>
        </View>
        <Text style={styles.activeStepTitle}>{STEP_LABEL[step]}</Text>
        <CaretRight size={18} color={C.ink} weight="regular" />
      </View>

      <Text style={styles.activeStepTagline}>{STEP_TAGLINE[step]}</Text>

      <View style={styles.activeStepBody}>
        <AnalyzingRing />
        <View style={styles.subStatusList}>
          <SubStatusRow
            label="Selecting step"
            state={subStatusState(subPhase, 'selecting_step')}
          />
          <SubStatusRow
            label="Finding the best match"
            state={subStatusState(subPhase, 'finding_best_match')}
          />
          <SubStatusRow
            label="Checking compatibility"
            state={subStatusState(subPhase, 'checking_compatibility')}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function subStatusState(
  current: RoutineBuildSubPhase,
  row: RoutineBuildSubPhase,
): 'done' | 'active' | 'pending' {
  const order: RoutineBuildSubPhase[] = [
    'selecting_step',
    'finding_best_match',
    'checking_compatibility',
  ];
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
  // Active sub-status pulses gently.
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    if (state === 'active') {
      pulse.value = withRepeat(
        withTiming(1, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
    return () => cancelAnimation(pulse);
  }, [state, pulse]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: state === 'active' ? pulse.value : 1,
  }));

  return (
    <View style={styles.subStatusRow}>
      {state === 'done' ? (
        <View style={[styles.subDot, styles.subDotDone]}>
          <Check size={10} color="#FFFFFF" weight="bold" />
        </View>
      ) : state === 'active' ? (
        <Animated.View style={[styles.subDot, styles.subDotActive, dotStyle]} />
      ) : (
        <View style={[styles.subDot, styles.subDotIdle]} />
      )}
      <Text
        style={[
          styles.subLabel,
          {
            color: state === 'pending' ? C.muted : C.ink,
            fontFamily:
              state === 'pending' ? 'Inter-Regular' : 'Inter-SemiBold',
          },
        ]}
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
      <Svg width={92} height={92} viewBox="0 0 100 100">
        <Circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={C.coralWashStrong}
          strokeWidth={3.5}
          opacity={0.55}
        />
        <AnimatedCircle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={C.coralStrong}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray="46 220"
          animatedProps={animProps}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Sparkle size={14} color={C.coralDeep} weight="duotone" />
        <Text style={styles.ringLabel}>Analyzing</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Completed step card — quiet white card with sage check
// ---------------------------------------------------------------------------

function CompletedStepCard({
  step,
  index,
  draft,
}: {
  step: RoutineBuildProductStep;
  index: number;
  draft: CustomRoutine | null;
}) {
  const subtitle = useMemo(() => productSubtitleForStep(draft, step), [draft, step]);
  return (
    <Pressable style={styles.staticCard} accessibilityRole="button" accessibilityLabel={`${STEP_LABEL[step]} step matched`}>
      <View style={styles.staticCardLeft}>
        <Text style={styles.staticCardNumber}>{index}</Text>
      </View>
      <View style={styles.staticCardIcon}>
        <View style={[styles.staticCardIconCircle, { backgroundColor: C.sageWash }]}>
          <Check size={18} color={C.sageDeep} weight="bold" />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.staticCardTitleRow}>
          <Text style={styles.staticCardTitle}>{STEP_LABEL[step]}</Text>
          <View style={[styles.statusBadge, { backgroundColor: C.sageWash, borderColor: 'transparent' }]}>
            <Text style={[styles.statusBadgeText, { color: C.sageDeep }]}>Matched</Text>
          </View>
        </View>
        <Text style={styles.staticCardSubtitle} numberOfLines={1}>
          {subtitle ?? 'Matched from your scan'}
        </Text>
      </View>
      <CaretRight size={18} color={C.muted} weight="regular" />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Pending step card — locked tile + lilac Pending badge
// ---------------------------------------------------------------------------

function PendingStepCard({
  step,
  index,
}: {
  step: RoutineBuildProductStep;
  index: number;
}) {
  return (
    <View style={styles.staticCard} accessibilityLabel={`${STEP_LABEL[step]} step waiting`}>
      <View style={styles.staticCardLeft}>
        <Text style={[styles.staticCardNumber, { color: C.muted }]}>{index}</Text>
      </View>
      <View style={styles.staticCardIcon}>
        <View style={[styles.staticCardIconCircle, { backgroundColor: C.surfaceSoft, borderWidth: 1, borderColor: C.line }]}>
          <Lock size={16} color={C.muted} weight="bold" />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.staticCardTitleRow}>
          <Text style={[styles.staticCardTitle, { color: C.ink }]}>
            {STEP_LABEL[step]}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: C.lilacWash,
                borderColor: 'transparent',
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: C.lilacDeep }]}>Pending</Text>
          </View>
        </View>
        <Text style={styles.staticCardSubtitle} numberOfLines={2}>
          {STEP_PENDING_HELP[step]}
        </Text>
      </View>
      <CaretRight size={18} color={C.muted} weight="regular" />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Safety footer
// ---------------------------------------------------------------------------

function SafetyFooter({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.safetyCard}>
      <View style={styles.safetyIcon}>
        <Shield size={18} color={C.coralDeep} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.safetyText}>
          Every product is chosen with your skin's safety in mind. You can review
          and adjust everything before we lock it in.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress ?? (() => undefined)}
        hitSlop={10}
        style={styles.howItWorks}
      >
        <Text style={styles.howItWorksText}>How it works</Text>
        <CaretRight size={12} color={C.coralDeep} weight="bold" />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Failure variant
// ---------------------------------------------------------------------------

function FailureBlock({
  failureReason,
  onRetry,
  onRetakeScan,
  onReturnToScan,
}: {
  failureReason: string;
  onRetry?: () => void;
  onRetakeScan?: () => void;
  onReturnToScan?: () => void;
}) {
  const needsRetake = /scan/i.test(failureReason) && /retak|clearer/i.test(failureReason);
  return (
    <View style={styles.wrap}>
      <PuraCard tone="soft" elevation="hero" style={{ padding: SP.xl, borderRadius: 28 }}>
        <Eyebrow tone="muted">BUILD INTERRUPTED</Eyebrow>
        <EditorialHeading size="page" style={{ marginTop: 8 }}>
          {needsRetake ? 'A clearer scan helps.' : "We couldn't finish your routine."}
        </EditorialHeading>
        <Body style={{ marginTop: 12 }}>
          {needsRetake
            ? 'Your scan came through a little too partial to shape a full plan. A retake in even light will unlock the routine.'
            : 'Your scan is saved. Something interrupted the build.'}
        </Body>
        <Text style={[T.meta, { color: C.muted, marginTop: 14 }]}>{failureReason}</Text>
        <View style={{ marginTop: SP.lg }}>
          <PuraButton
            label={needsRetake ? 'Retake scan' : 'Try again'}
            variant="coral"
            onPress={(needsRetake ? onRetakeScan : onRetry) ?? (() => undefined)}
          />
          <QuietTextButton
            label="Return to scan results"
            tone="muted"
            onPress={onReturnToScan ?? (() => undefined)}
            style={{ marginTop: 10, alignSelf: 'center' }}
          />
        </View>
      </PuraCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function productSubtitleForStep(
  draft: CustomRoutine | null,
  step: RoutineBuildProductStep,
): string | undefined {
  if (!draft) return undefined;
  const typeKey = step === 'moisturize' ? 'hydrate' : step;
  const match = [...draft.morningSteps, ...draft.eveningSteps].find(
    (s) => s.type === typeKey,
  );
  if (!match) return undefined;
  if (match.product) {
    return `${match.product.brand} ${match.product.name}`.trim();
  }
  return match.purpose;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 8,
    gap: SP.lg,
  },

  // Hero card
  hero: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.coralWashStrong,
    ...S.card,
  },
  heroContent: {
    padding: SP.xl,
  },
  heroEyebrow: {
    fontSize: 10.5,
    letterSpacing: 2.4,
    color: C.coralDeep,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: C.ink,
    marginTop: 10,
  },
  heroTitleAccent: {
    fontFamily: 'InstrumentSerif-Italic',
    color: C.coralDeep,
  },
  heroBody: {
    marginTop: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.body,
  },
  heroDivider: {
    height: 1,
    backgroundColor: C.coralWashStrong,
    opacity: 0.55,
    marginTop: SP.xl,
    marginBottom: SP.md,
  },
  heroPills: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  heroPillSep: {
    width: 1,
    height: 14,
    backgroundColor: C.coralWashStrong,
    opacity: 0.7,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  trustIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.1,
    color: C.ink,
    flexShrink: 1,
  },

  // Progression
  progression: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  progressionColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressionConnectorWrap: {
    position: 'absolute',
    top: 17,
    left: '-50%',
    right: '50%',
    height: 2,
  },
  progressionConnectorSpacer: {
    position: 'absolute',
    top: 17,
    height: 2,
  },
  progressionDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  progressionDotDone: {
    backgroundColor: C.coralStrong,
    borderColor: C.coralStrong,
    ...S.coralGlow,
  },
  progressionDotActive: {
    backgroundColor: C.coralStrong,
    borderColor: C.coralStrong,
    ...S.coralGlow,
  },
  progressionDotIdle: {
    backgroundColor: C.surface,
    borderColor: C.line,
  },
  progressionNumberActive: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressionNumberIdle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: C.muted,
  },
  progressionLabel: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.1,
    textAlign: 'center',
  },

  // Step list
  stepList: {
    gap: 12,
  },

  // Active step card
  activeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.coralWashStrong,
    padding: SP.lg + 2,
    ...S.card,
  },
  activeStepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.coralStrong,
    alignItems: 'center',
    justifyContent: 'center',
    ...S.coralGlow,
  },
  activeStepBadgeNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  activeStepTitle: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: C.ink,
  },
  activeStepTagline: {
    marginTop: 6,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 18,
    color: C.coralDeep,
    paddingLeft: 40,
  },
  activeStepBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.lg,
    marginTop: SP.lg,
  },
  ringWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ringLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
    color: C.coralDeep,
  },
  subStatusList: {
    flex: 1,
    gap: 10,
  },
  subStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subDotDone: {
    backgroundColor: C.coralStrong,
  },
  subDotActive: {
    borderWidth: 1.5,
    borderColor: C.coralStrong,
    borderStyle: 'dashed',
  },
  subDotIdle: {
    borderWidth: 1.5,
    borderColor: C.lineStrong,
  },
  subLabel: {
    fontSize: 13,
    lineHeight: 17,
  },

  // Static (pending / completed) step cards
  staticCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
  },
  staticCardLeft: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  staticCardNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.muted,
  },
  staticCardIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staticCardTitle: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: C.ink,
  },
  staticCardSubtitle: {
    marginTop: 2,
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: C.body,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.2,
  },

  // Safety footer
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
  },
  safetyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.coralWashStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: C.body,
  },
  howItWorks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: C.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.coralWashStrong,
  },
  howItWorksText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: C.coralDeep,
    letterSpacing: -0.1,
  },
});
