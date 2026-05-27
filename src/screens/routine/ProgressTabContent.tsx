/**
 * ProgressTabContent — the Progress sub-tab, rebuilt.
 *
 * Render order matches the v23 product brief:
 *
 *   1. ProgressHeroSection       — score gauge + heroReason
 *   2. ConfidenceWarningCard     — visible near the top when scan is low
 *                                  confidence (was previously buried)
 *   3. ScoreBreakdownCard        — 4 concern rows with status + action
 *                                  hint (replaces the mysterious "18"
 *                                  from→to numbers in KeyChangesCard)
 *   4. TodaySkinReadCard         — summary + chips + collapsed AI notes
 *   5. BestMoveTodayCard         — the loop bridge to Routine
 *   6. BeforeAfterSection        — comparison or honest locked state
 *   7. ScoreTrendSection         — sparkline trend
 *   8. ScanTimelineSection       — vertical scan history
 *   9. Bottom CTA                — "Retake scan for sharper read" /
 *                                  "Scan again to update progress"
 */

import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, Camera } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { ProgressHeroSection } from '@/components/progress/ProgressHeroSection';
import { ConfidenceWarningCard } from '@/components/progress/ConfidenceWarningCard';
import { ScoreBreakdownCard } from '@/components/progress/ScoreBreakdownCard';
import { TodaySkinReadCard } from '@/components/progress/TodaySkinReadCard';
import { BestMoveTodayCard } from '@/components/progress/BestMoveTodayCard';
import { BeforeAfterSection } from '@/components/progress/BeforeAfterSection';
import { ScoreTrendSection } from '@/components/progress/ScoreTrendSection';
import { ScanTimelineSection } from '@/components/progress/ScanTimelineSection';
import { NextBestActionCard } from '@/components/progress/NextBestActionCard';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';
import type { Scan } from '@/types';

interface Props {
  scans: Scan[];
  latestScan: Scan | undefined;
  progressAvailable: boolean;
  insight: ProgressRoutineInsight;
  onScan: () => void;
  /** Switch the top tab back to Routine — used by "Apply to routine". */
  onApplyToRoutine: () => void;
}

export function ProgressTabContent({
  scans,
  latestScan,
  progressAvailable,
  insight,
  onScan,
  onApplyToRoutine,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 56 + 56;

  const op = useSharedValue(0);
  useEffect(() => {
    op.value = 0;
    op.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [op]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  // Fire AI progress bundle in the background when comparison is possible.
  useEffect(() => {
    if (!progressAvailable) return;
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import('@/api/progress');
        if (cancelled) return;
        await mod.getProgressBundle();
      } catch {
        /* swallowed — UI is canonical-insight driven and degrades cleanly */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [progressAvailable, scans.length]);

  // No-scan branch — quiet panel with a CTA.
  if (!progressAvailable || !latestScan) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={fadeStyle}>
          <View style={styles.panel}>
            <View style={styles.panelMark}>
              <PuraMark size={44} variant="idle" />
            </View>
            <Text style={styles.panelHeading} maxFontSizeMultiplier={1.2}>
              {scans.length === 0
                ? 'Take your first scan to start tracking your skin.'
                : 'One more scan unlocks proof + trend.'}
            </Text>
            <Text style={styles.panelBody} maxFontSizeMultiplier={1.2}>
              {scans.length === 0
                ? 'A 20-second skin read gives you tonight’s focus and starts the timeline.'
                : 'Your before-and-after, trend chart, and scan-to-scan movement light up at scan two.'}
            </Text>
            <Pressable
              onPress={() => {
                hapt.tap();
                onScan();
              }}
              accessibilityRole="button"
              accessibilityLabel={
                scans.length === 0 ? 'Take your first scan' : 'Scan again'
              }
              style={({ pressed }) => [
                styles.primaryCta,
                pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Camera size={14} color={palette.inkInverse} weight="duotone" />
              <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
                {scans.length === 0 ? 'Take your first scan' : 'Scan again'}
              </Text>
            </Pressable>
          </View>

          <ScoreTrendSection trend={insight.trendSummary} />
        </Animated.View>
      </ScrollView>
    );
  }

  // ───── Full Progress view ─────
  const showConfidenceWarning = insight.confidenceCaveat;
  const bottomCtaLabel = showConfidenceWarning
    ? 'Retake scan for a sharper read'
    : 'Scan again to update progress';

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={fadeStyle}>
        <ProgressHeroSection scans={scans} insight={insight} />

        {/* Confidence warning lands near the top so the user can never
            miss it. The old pattern showed only a tiny pill subline. */}
        {showConfidenceWarning ? (
          <ConfidenceWarningCard onRetake={onScan} />
        ) : null}

        <ScoreBreakdownCard metrics={insight.metrics} />

        <TodaySkinReadCard
          summary={insight.skinReadSummary}
          chips={insight.chips}
          fullAINotes={insight.fullAINotes}
          confidenceCaveat={insight.confidenceCaveat}
        />

        {/* "Apply to routine" affordance under skin read. Routes back to
            the Routine sub-tab so the loop closes. */}
        <View style={styles.applyRow}>
          <Pressable
            onPress={() => {
              hapt.select();
              onApplyToRoutine();
            }}
            accessibilityRole="button"
            accessibilityLabel="Apply today’s read to your routine"
            style={({ pressed }) => [
              styles.applyBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.applyBtnText} maxFontSizeMultiplier={1.15}>
              Apply this to routine
            </Text>
            <ArrowRight size={13} color={palette.inkSecondary} weight="bold" />
          </Pressable>
        </View>

        {insight.bestMove ? (
          <BestMoveTodayCard bestMove={insight.bestMove} />
        ) : null}

        <BeforeAfterSection
          comparison={insight.comparison}
          latestDayNumber={latestScan.dayNumber}
          onTakeScan={onScan}
        />

        <ScoreTrendSection trend={insight.trendSummary} />

        <ScanTimelineSection timeline={insight.timeline} />

        {/* v23.3 — Next best action closes the Progress loop. The
            primary CTA switches the top tab back to Routine; the
            secondary opens the camera. */}
        <NextBestActionCard
          insight={insight}
          onApply={onApplyToRoutine}
          onRetake={onScan}
        />

        <Pressable
          onPress={() => {
            hapt.tap();
            onScan();
          }}
          accessibilityRole="button"
          accessibilityLabel={bottomCtaLabel}
          style={({ pressed }) => [
            styles.scanAgainCta,
            pressed && { opacity: 0.94 },
          ]}
        >
          <View style={styles.scanAgainBadge}>
            <Camera size={14} color={palette.clay} weight="duotone" />
          </View>
          <Text style={styles.scanAgainLabel} maxFontSizeMultiplier={1.15}>
            {bottomCtaLabel}
          </Text>
          <ArrowRight size={14} color={palette.inkTertiary} weight="bold" />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 140 },

  panel: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
  },
  panelMark: { marginBottom: 18 },
  panelHeading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  panelBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 300,
  },
  primaryCta: {
    height: 44,
    minWidth: 200,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  applyRow: {
    marginTop: 12,
    marginHorizontal: 20,
    alignItems: 'flex-start',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
  },
  applyBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
  scanAgainCta: {
    marginTop: 28,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  scanAgainBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainLabel: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.ink,
  },
});
