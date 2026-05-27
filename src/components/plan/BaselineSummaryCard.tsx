import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

export interface BaselineSummaryCardProps {
  /** Baseline score 0..100. */
  score: number;
  /** Short focus line, e.g. "Hydration support." */
  focusLine: string;
  /** ≤ 12-word "what to expect" sentence. */
  expectationLine?: string;
  /** "Take another scan to unlock trend" sub-CTA. */
  onScanAgain: () => void;
}

/**
 * Compact baseline card for the Progress tab after exactly one scan.
 *
 * Carries: score (big serif), tier or focus line (italic), expectation
 * sentence, and a locked-trend slot with a "scan again" prompt. No
 * chart — we never imply trend with a single point.
 */
export function BaselineSummaryCard({
  score,
  focusLine,
  expectationLine,
  onScanAgain,
}: BaselineSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        BASELINE CREATED
      </Text>
      <View style={styles.scoreRow}>
        <Text
          style={styles.score}
          maxFontSizeMultiplier={1.15}
          accessibilityLabel={`Baseline score ${score}`}
        >
          {score}
        </Text>
        <Text style={styles.scoreScale} maxFontSizeMultiplier={1.1}>
          / 100
        </Text>
      </View>
      <Text style={styles.focusLine} maxFontSizeMultiplier={1.2}>
        {focusLine}
      </Text>
      {expectationLine ? (
        <Text style={styles.expectation} maxFontSizeMultiplier={1.25}>
          {expectationLine}
        </Text>
      ) : null}

      <View style={styles.lockedRow}>
        <Lock size={14} color={plan.inkMuted} weight="duotone" />
        <Text style={styles.lockedText} maxFontSizeMultiplier={1.15}>
          Your trend unlocks after one more scan
        </Text>
      </View>

      <Pressable
        onPress={() => {
          hapt.tap();
          onScanAgain();
        }}
        accessibilityRole="button"
        accessibilityLabel="Scan again to unlock trend"
        style={({ pressed }) => [
          styles.cta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.15}>
          Scan again to unlock trend
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: plan.brand,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  score: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.2,
    color: plan.ink,
    fontVariant: ['tabular-nums'],
  },
  scoreScale: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: plan.inkMuted,
  },
  focusLine: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 22,
    color: plan.inkSecondary,
    marginTop: 4,
  },
  expectation: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: plan.inkSecondary,
    marginTop: 12,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: plan.bg,
    borderWidth: 1,
    borderColor: plan.border,
    borderStyle: 'dashed',
  },
  lockedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: plan.inkSecondary,
  },
  cta: {
    marginTop: 14,
    height: 46,
    borderRadius: 999,
    backgroundColor: plan.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
