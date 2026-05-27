/**
 * Today tab — state-aware composition.
 *
 * State 1 (noScan)
 *   1. ScanNeededHero
 *   2. StarterRoutinePreview
 *   3. AvoidTodayCard (pre-scan variant)
 *
 * State 2 (baselineCreated)
 *   1. BaselineFocusLine (slim header)
 *   2. PlanStepCard ×4 (steps reference the baseline)
 *   3. MissingEssentialsCard
 *   4. AvoidTodayCard
 *
 * State 3 (personalized)
 *   1. PlanStepCard ×4 with attached products + "why today"
 *   2. MissingEssentialsCard (only if gaps remain)
 *   3. AvoidTodayCard
 *
 * State 4 (calibrating / highConfidence)
 *   Same as State 3 — copy gets sharper from the canonical insight
 *   when AI confidence is high. We DO NOT add more cards as the user
 *   accumulates scans; intelligence shows up in the *content*, not by
 *   adding more visual weight.
 *
 * Hard rules upheld:
 *   - Never show score/trend/"X improved" in this tab — that's
 *     Progress's job.
 *   - The reasoning line under each step is derived from PlanState +
 *     ProgressRoutineInsight; it never invents claims.
 *   - The Plan Complete card replaces all steps once every step is
 *     marked done.
 */

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ScanNeededHero,
  StarterRoutinePreview,
  PlanStepCard,
  MissingEssentialsCard,
  AvoidTodayCard,
  PlanCompleteCard,
} from '@/components/plan';
import type { StepBadge } from '@/components/plan';
import type { PlanState } from '@/state/planState';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';
import type { Product, ProductCategory } from '@/types';
import { plan as planTokens } from '@/components/plan/tokens';
import { useTonightDecision } from '@/state/tonightDecision';
import { RecoveryNightBanner } from '@/screens/assistant/components/RecoveryNightBanner';
import type { RootStackParamList } from '@/navigation/types';

export interface TodayTabProps {
  state: PlanState;
  insight: ProgressRoutineInsight;
  onStartScan: () => void;
  onOpenShelf: () => void;
  onOpenProgress: () => void;
  onFindMatch: (category: ProductCategory) => void;
  onOpenProduct: (product: Product) => void;
  /** Switch to the Shelf tab tied to a category. */
  onAddProduct: (category: ProductCategory) => void;
}

interface StepDef {
  id: string;
  number: number;
  title: string;
  badge: StepBadge;
  instruction: string;
  whyPreScan: string;
  whyPostScan: string;
  emptyNoun: string;
  matchKeyword: string;
  category: ProductCategory;
  primary: string;
  secondary?: string;
  spfAccent?: boolean;
}

const STEPS: StepDef[] = [
  {
    id: 'cleanser',
    number: 1,
    title: 'Cleanse or rinse',
    badge: 'Optional today',
    instruction:
      'Use a gentle cleanser, or rinse with water if your skin feels dry.',
    whyPreScan:
      'Before your first scan, Pura keeps cleansing gentle to avoid over-stripping.',
    whyPostScan:
      'Gentle cleansing protects your barrier while Pura learns your skin patterns.',
    emptyNoun: 'cleanser',
    matchKeyword: 'cleanser',
    category: 'cleanser',
    primary: 'Add cleanser',
    secondary: 'Skip today',
  },
  {
    id: 'hydrate',
    number: 2,
    title: 'Hydrate',
    badge: 'Helpful',
    instruction: 'Add a serum or essence focused on moisture support.',
    whyPreScan:
      'Hydration helps keep the routine balanced before moisturizer.',
    whyPostScan:
      'A hydration layer supports the steps that come after — keeps moisturizer doing less work.',
    emptyNoun: 'hydration product',
    matchKeyword: 'hydration',
    category: 'serum',
    primary: 'Add hydration product',
    secondary: 'Find hydration match',
  },
  {
    id: 'moisturize',
    number: 3,
    title: 'Moisturize',
    badge: 'Priority today',
    instruction:
      'Use a barrier-friendly moisturizer to lock in hydration.',
    whyPreScan:
      'Moisturizer is the safest foundation while Pura learns your skin.',
    whyPostScan:
      'Moisturizer is the most reliable lever for the days between scans.',
    emptyNoun: 'moisturizer',
    matchKeyword: 'barrier',
    category: 'moisturizer',
    primary: 'Add moisturizer',
    secondary: 'Find barrier match',
  },
  {
    id: 'spf',
    number: 4,
    title: 'SPF protection',
    badge: 'Required',
    instruction:
      'Finish with broad-spectrum SPF 30+ every morning.',
    whyPreScan: 'SPF protects your skin while your routine does its work.',
    whyPostScan:
      'SPF is non-negotiable — it’s the only step that protects what your routine builds.',
    emptyNoun: 'SPF',
    matchKeyword: 'SPF',
    category: 'spf',
    primary: 'Add SPF',
    secondary: 'Find SPF match',
    spfAccent: true,
  },
];

export function TodayTab({
  state,
  insight,
  onStartScan,
  onOpenShelf: _onOpenShelf,
  onOpenProgress,
  onFindMatch,
  onOpenProduct,
  onAddProduct,
}: TodayTabProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const decision = useTonightDecision();
  const openAssistant = useCallback(() => {
    // @ts-expect-error nested tab navigation typing
    nav.navigate('Tabs', { screen: 'AssistantTab' });
  }, [nav]);
  const op = useSharedValue(0);
  React.useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [op, state.stage]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const toggleComplete = useCallback(
    (id: string) =>
      setCompleted((prev) => ({ ...prev, [id]: !prev[id] })),
    []
  );

  const allDone =
    STEPS.every((s) => completed[s.id]) && Object.keys(completed).length > 0;

  const bottomPad = insets.bottom + 56 + 60;

  // --- No scan ---------------------------------------------------------------
  if (state.stage === 'noScan') {
    return (
      <Animated.View style={[styles.flex, fadeStyle]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        >
          <ScanNeededHero
            onStartScan={onStartScan}
            onUseStarter={() => {
              // No-op other than triggering the scroll — the starter
              // routine is already visible below.
            }}
          />
          <StarterRoutinePreview
            onStart={() => {
              // Starts the same plan steps inline. We could mark
              // step 1 as "current" here in a later pass; for now
              // surfacing the steps below as scroll target is the
              // calm path.
            }}
            onPersonalize={onStartScan}
          />
          <View style={styles.divider} />
          <AvoidTodayCard preScan />
        </ScrollView>
      </Animated.View>
    );
  }

  // --- Baseline / personalized / calibrating / high-confidence --------------
  const preScan = false;
  const focusLine = insight.heroReason;

  return (
    <Animated.View style={[styles.flex, fadeStyle]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Assist applied-decision banner — shows up only when the
            user has applied a Recovery / Reset night so the Routine
            tab reflects that change rather than telling a contradictory
            story alongside it. */}
        {decision.applied ? (
          <View style={styles.recoveryBannerWrap}>
            <RecoveryNightBanner
              decision={decision}
              onOpenAssistant={openAssistant}
            />
          </View>
        ) : null}

        {/* Lightweight focus header — never a duplicate score. */}
        <View style={styles.focusBlock}>
          <Text style={styles.focusKicker}>
            {state.stage === 'baselineCreated'
              ? 'BASELINE · TODAY'
              : 'TODAY'}
          </Text>
          <Text style={styles.focusLine} maxFontSizeMultiplier={1.2}>
            {focusLine}
          </Text>
          {!state.canShowAIClaims ? (
            <Text style={styles.focusSub} maxFontSizeMultiplier={1.2}>
              {state.stage === 'baselineCreated'
                ? 'Why this starter plan is safe: Pura keeps actives minimal until it sees how your skin responds.'
                : 'Why Pura adjusted today’s plan: small changes only, grounded in what your scans already show.'}
            </Text>
          ) : (
            <Text style={styles.focusSub} maxFontSizeMultiplier={1.2}>
              Why Pura adjusted today’s plan: based on your last few scans, the
              steps below give your skin a clear lever to respond to.
            </Text>
          )}
        </View>

        {allDone ? (
          <PlanCompleteCard onViewProgress={onOpenProgress} />
        ) : (
          STEPS.map((step) => {
            const product = pickProductFor(step.category, state);
            const isCompleted = !!completed[step.id];
            const why = preScan ? step.whyPreScan : step.whyPostScan;
            return (
              <PlanStepCard
                key={step.id}
                stepNumber={step.number}
                totalSteps={STEPS.length}
                title={step.title}
                badge={step.badge}
                instruction={step.instruction}
                whyToday={why}
                emptyNoun={step.emptyNoun}
                product={product}
                primaryLabel={
                  product ? 'Mark done' : step.primary
                }
                onPrimary={
                  product
                    ? () => toggleComplete(step.id)
                    : () => onAddProduct(step.category)
                }
                secondaryLabel={
                  product ? undefined : step.secondary
                }
                onSecondary={
                  product
                    ? undefined
                    : step.secondary
                    ? () =>
                        step.secondary === 'Skip today'
                          ? toggleComplete(step.id)
                          : onFindMatch(step.category)
                    : undefined
                }
                completed={isCompleted}
                onToggleComplete={() => toggleComplete(step.id)}
                spfAccent={step.spfAccent}
                onOpenProduct={
                  product ? () => onOpenProduct(product) : undefined
                }
              />
            );
          })
        )}

        <MissingEssentialsCard
          slots={state.shelfSlots}
          onFind={onFindMatch}
        />

        <AvoidTodayCard preScan={false} />
      </ScrollView>
    </Animated.View>
  );
}

function pickProductFor(
  category: ProductCategory,
  state: PlanState
): Product | null {
  const matches = (p: Product) => {
    if (p.category === category) return true;
    if (category === 'serum' && p.category === 'toner') return true;
    return false;
  };
  const pool = [
    ...state.morningProducts,
    ...state.eveningProducts,
    ...state.savedProducts,
  ];
  const found = pool.find(matches);
  return found ?? null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  recoveryBannerWrap: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  focusBlock: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: planTokens.card,
    borderWidth: 1,
    borderColor: planTokens.border,
  },
  focusKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: planTokens.brand,
  },
  focusLine: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: planTokens.ink,
    marginTop: 6,
  },
  focusSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: planTokens.inkSecondary,
    marginTop: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 32,
    marginVertical: 18,
    backgroundColor: 'transparent',
  },
});
