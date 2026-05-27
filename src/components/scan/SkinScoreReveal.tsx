/**
 * SkinScoreReveal — the new emotional centerpiece of the results
 * screen.
 *
 * Replaces the v19 "small thumbnail + serif number + tier pill"
 * row with the staged reveal the spec asks for:
 *
 *   ┌────────────────────────────────────┐
 *   │ ◍ HIGH-CONFIDENCE SCAN             │  ← quality badge
 *   │                                     │
 *   │ SKIN SCORE                          │  ← kicker
 *   │ 75    Good                          │  ← number + tier pill
 *   │                                     │
 *   │ Up 4 since your last scan           │  ← movement
 *   │ Full face visible with usable       │  ← confidence note
 *   │ lighting.                           │
 *   └────────────────────────────────────┘
 *
 * Critical correctness rules:
 *   • Never count from zero. If the user has a previous score we
 *     count from that score to the new one. If not, we count from
 *     (new - 8) to give the count a real direction.
 *   • If the score decreased we count DOWN, never with a red flash.
 *   • Partial scans say "Visible Skin Score", not "Skin Score".
 *   • Low-quality scans never show a confident number — caller is
 *     expected to render the blocked recovery state instead and
 *     not mount this component.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CheckCircle, WarningCircle } from 'phosphor-react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { tierFor } from '@/utils/skinScore';

export type ScanConfidenceBand = 'full' | 'partial' | 'low';

export interface SkinScoreRevealProps {
  photoUri: string;
  /** Final score value 0..100. */
  score: number;
  /** Optional previous score for the count animation. */
  previousScore: number | null;
  /** Δ vs previous; null on first scan. */
  delta: number | null;
  /** Confidence band — drives the badge + secondary copy. */
  confidence: ScanConfidenceBand;
  /** Main insight headline ("Mild chin congestion is the main signal."). */
  insight: string;
  /** Supporting line ("Nothing urgent — just a few visible signals…"). */
  insightBody: string;
  /** Reduce-motion override. */
  reduceMotion?: boolean;
}

const TIER_LABEL: Record<ReturnType<typeof tierFor>, string> = {
  strong: 'Excellent',
  good: 'Good',
  fair: 'Stable',
  'needs-work': 'Needs attention',
};

const QUALITY_BADGE: Record<
  ScanConfidenceBand,
  { kicker: string; note: string; tone: 'good' | 'warning' }
> = {
  full: {
    kicker: 'HIGH-CONFIDENCE SCAN',
    note: 'Full face visible with usable lighting.',
    tone: 'good',
  },
  partial: {
    kicker: 'PARTIAL SCAN',
    note: 'Only visible areas were analyzed. Retake for a complete score.',
    tone: 'warning',
  },
  low: {
    kicker: 'LIMITED SCAN',
    note: 'Lighting may limit detail. Retake for higher confidence.',
    tone: 'warning',
  },
};

export function SkinScoreReveal({
  photoUri,
  score,
  previousScore,
  delta,
  confidence,
  insight,
  insightBody,
  reduceMotion: reduceMotionOverride,
}: SkinScoreRevealProps) {
  const osReduceMotion = useReduceMotion();
  const reduceMotion = reduceMotionOverride ?? osReduceMotion;
  const tier = tierFor(score);
  const tierLabel = TIER_LABEL[tier];
  const isPartial = confidence === 'partial' || confidence === 'low';
  const labelText = isPartial ? 'VISIBLE SKIN SCORE' : 'SKIN SCORE';
  const badge = QUALITY_BADGE[confidence];

  // Count animation — NEVER from 0.
  //   • If previous → count from previous to new
  //   • If no previous + score >= 12 → count from (score - 8) to score
  //   • Same score → no count, just settle
  const countStart = useMemo(() => {
    if (previousScore !== null) {
      return Math.max(0, Math.round(previousScore));
    }
    if (score >= 12) return score - 8;
    return Math.max(0, score - 2);
  }, [previousScore, score]);

  const countShared = useSharedValue<number>(countStart);
  const [displayValue, setDisplayValue] = useState<number>(countStart);

  // React's render loop drives the count read. We animate the
  // shared value and tick a JS interval that pulls the current
  // value into display state. This keeps the digit semantics
  // tabular and tab-stable.
  useEffect(() => {
    if (countStart === score) {
      setDisplayValue(score);
      return;
    }
    // Reset start
    countShared.value = countStart;
    setDisplayValue(countStart);
    if (reduceMotion) {
      setDisplayValue(score);
      return;
    }
    // Animate the shared value over ~720ms after a brief 240ms
    // anticipation pause.
    countShared.value = withDelay(
      240,
      withTiming(score, {
        duration: 720,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
    // Tick a JS clock to pull the latest animated value into
    // display state at 60fps cap.
    const interval = setInterval(() => {
      const cur = Math.round(countShared.value);
      setDisplayValue((prev) => (prev !== cur ? cur : prev));
      if (cur === score) {
        clearInterval(interval);
      }
    }, 33);
    return () => clearInterval(interval);
  }, [score, countStart, countShared, reduceMotion]);

  // Settle pulse on the final value.
  const settle = useSharedValue(0);
  useEffect(() => {
    if (displayValue !== score) return;
    settle.value = withSequence(
      withTiming(1, { duration: 110, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
      withTiming(0, { duration: 240, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
    // Very light haptic on first scan / full-confidence scan only.
    if (confidence === 'full') {
      hapt.select();
    }
  }, [displayValue, score, settle, confidence]);

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.02 * settle.value }],
  }));

  // Movement copy. Stable on |Δ| ≤ 1, otherwise direction + amount.
  const movement = useMemo(() => {
    if (delta === null) return 'First scan';
    if (Math.abs(delta) <= 1) return 'Stable since last scan';
    if (delta > 0) return `Up ${delta} since your last scan`;
    return `Down ${Math.abs(delta)} since last scan`;
  }, [delta]);

  // Entry transition for the whole reveal.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, {
      duration: 480,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [enter]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: 18 * (1 - enter.value) }],
  }));

  return (
    <Animated.View style={[styles.root, enterStyle]}>
      <View style={styles.topRow}>
        <View style={styles.thumb}>
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        </View>

        <View style={styles.right}>
          <View
            style={[
              styles.qualityBadge,
              badge.tone === 'warning' && styles.qualityBadgeWarning,
            ]}
          >
            {badge.tone === 'good' ? (
              <CheckCircle size={11} weight="fill" color={palette.moss} />
            ) : (
              <WarningCircle size={11} weight="fill" color={palette.amber} />
            )}
            <Text
              style={[
                styles.qualityKicker,
                badge.tone === 'warning' && styles.qualityKickerWarning,
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {badge.kicker}
            </Text>
          </View>

          <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
            {labelText}
          </Text>

          <View style={styles.numberRow}>
            <Animated.Text
              style={[styles.number, numberStyle]}
              maxFontSizeMultiplier={1.05}
              allowFontScaling={false}
            >
              {displayValue}
            </Animated.Text>
            <View style={styles.tierPill}>
              <Text style={styles.tierText} maxFontSizeMultiplier={1.1}>
                {tierLabel.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text
            style={styles.movement}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
          >
            {movement}
          </Text>

          <Text
            style={[
              styles.confidenceNote,
              badge.tone === 'warning' && styles.confidenceNoteWarning,
            ]}
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
          >
            {badge.note}
          </Text>
        </View>
      </View>

      <View style={styles.insightBlock}>
        <Text style={styles.insightTitle} maxFontSizeMultiplier={1.2}>
          {insight}
        </Text>
        <Text style={styles.insightBody} maxFontSizeMultiplier={1.25}>
          {insightBody}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 10,
    marginBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  thumb: {
    width: 88,
    height: 108,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  right: {
    flex: 1,
    paddingTop: 2,
  },
  qualityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.mossLight,
    borderWidth: 1,
    borderColor: palette.moss + '55',
    marginBottom: 10,
  },
  qualityBadgeWarning: {
    backgroundColor: palette.amberLight,
    borderColor: palette.amber + '55',
  },
  qualityKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: palette.mossDeep,
    textTransform: 'uppercase',
  },
  qualityKickerWarning: {
    color: palette.amberDeep,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.7,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 10,
  },
  number: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  tierPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  tierText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: palette.inkSecondary,
  },
  movement: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
    marginBottom: 4,
  },
  confidenceNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.inkTertiary,
  },
  confidenceNoteWarning: {
    color: palette.amberDeep,
  },
  insightBlock: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  insightTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 6,
  },
  insightBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 20,
    color: palette.inkSecondary,
  },
});
