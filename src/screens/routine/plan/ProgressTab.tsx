/**
 * Progress tab — state-aware composition.
 *
 *   noScan          ProgressEmptyState + ProgressUnlockPreview
 *   baselineCreated BaselineSummaryCard + small "What unlocks next" line
 *   personalized    Existing ProgressTabContent (rich diagnosis modules)
 *   calibrating+    Existing ProgressTabContent + confidence subline
 *
 * The rich post-baseline progress UI already exists as
 * `ProgressTabContent` — we delegate to it for State 3+. We never
 * render the rich modules with only one scan because their copy
 * implies trend (which doesn't exist yet).
 */

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ProgressEmptyState,
  ProgressUnlockPreview,
  BaselineSummaryCard,
} from '@/components/plan';
import { ProgressTabContent } from '@/screens/routine/ProgressTabContent';
import { plan as planTokens } from '@/components/plan/tokens';
import type { PlanState } from '@/state/planState';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

export interface ProgressTabProps {
  state: PlanState;
  insight: ProgressRoutineInsight;
  onStartScan: () => void;
  onApplyToRoutine: () => void;
}

export function ProgressTab({
  state,
  insight,
  onStartScan,
  onApplyToRoutine,
}: ProgressTabProps) {
  const insets = useSafeAreaInsets();
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [op, state.stage]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const bottomPad = insets.bottom + 56 + 60;

  // --- No scan ---------------------------------------------------------------
  if (state.stage === 'noScan') {
    return (
      <Animated.View style={[styles.flex, fadeStyle]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        >
          <ProgressEmptyState onStartScan={onStartScan} />
          <ProgressUnlockPreview />
        </ScrollView>
      </Animated.View>
    );
  }

  // --- Exactly one scan (baseline) ------------------------------------------
  if (state.stage === 'baselineCreated') {
    const score = state.latestScan?.overallScore ?? 0;
    return (
      <Animated.View style={[styles.flex, fadeStyle]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        >
          <BaselineSummaryCard
            score={score}
            focusLine={insight.heroReason}
            expectationLine="Pura keeps things conservative until your second scan confirms the pattern."
            onScanAgain={onStartScan}
          />
          <View style={styles.lockedSection}>
            <Text style={styles.lockedKicker} maxFontSizeMultiplier={1.1}>
              UNLOCKS WITH YOUR NEXT SCAN
            </Text>
            <Text style={styles.lockedTitle} maxFontSizeMultiplier={1.15}>
              Trend · what changed · what improved · routine impact
            </Text>
            <Text style={styles.lockedBody} maxFontSizeMultiplier={1.2}>
              Your score trend will appear after your first scan. We hold off
              on “improved” or “needs care” claims until there’s real movement
              to point at.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    );
  }

  // --- Personalized / calibrating / high-confidence -------------------------
  return (
    <Animated.View style={[styles.flex, fadeStyle]}>
      <ProgressTabContent
        scans={state.scans}
        latestScan={state.latestScan}
        progressAvailable={state.canShowTrend}
        insight={insight}
        onScan={onStartScan}
        onApplyToRoutine={onApplyToRoutine}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lockedSection: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: planTokens.card,
    borderWidth: 1,
    borderColor: planTokens.border,
    borderStyle: 'dashed',
  },
  lockedKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: planTokens.inkMuted,
  },
  lockedTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: planTokens.ink,
    marginTop: 6,
  },
  lockedBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: planTokens.inkSecondary,
    marginTop: 8,
  },
});
