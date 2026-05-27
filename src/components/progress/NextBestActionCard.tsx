/**
 * NextBestActionCard — v23.3 Progress footer.
 *
 * Closes the diagnosis-to-action loop. Renders ONE sentence about the
 * single next thing the user should do, plus a clear primary CTA and a
 * quiet secondary "Retake scan for sharper read" link.
 *
 * Reads only the canonical insight's bestMove + confidenceCaveat. Never
 * invents an action that contradicts the rest of the page.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Camera, Sparkle } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';

interface Props {
  insight: ProgressRoutineInsight;
  /** Primary CTA — opens Routine (so user can apply the action). */
  onApply: () => void;
  /** Secondary CTA — opens the camera. */
  onRetake: () => void;
}

export function NextBestActionCard({ insight, onApply, onRetake }: Props) {
  const action = resolveAction(insight);
  return (
    <View style={styles.wrap}>
      <View style={styles.kickerRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          NEXT BEST ACTION
        </Text>
      </View>
      <Text style={styles.line} maxFontSizeMultiplier={1.15} numberOfLines={3}>
        {action.sentence}
      </Text>
      <View style={styles.ctaRow}>
        <Pressable
          onPress={() => {
            hapt.tap();
            onApply();
          }}
          accessibilityRole="button"
          accessibilityLabel={action.primaryCta}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
            {action.primaryCta}
          </Text>
          <ArrowRight size={13} color={palette.inkInverse} weight="bold" />
        </Pressable>
        <Pressable
          onPress={() => {
            hapt.select();
            onRetake();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retake scan for sharper read"
          hitSlop={6}
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Camera size={12} color={palette.inkSecondary} weight="duotone" />
          <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
            Retake scan
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function resolveAction(insight: ProgressRoutineInsight): {
  sentence: string;
  primaryCta: string;
} {
  if (insight.confidenceCaveat) {
    return {
      sentence:
        'Retake your scan in bright, even light so Pura can give you a sharper next move.',
      primaryCta: 'Update routine',
    };
  }
  if (!insight.hasScanned) {
    return {
      sentence: 'Take your first scan to unlock a personalized routine.',
      primaryCta: 'Set up routine',
    };
  }
  const move = insight.bestMove;
  if (move) {
    // Build a single sentence from the move: "Apply hydration support to today's routine."
    const focus = focusFromCategory(move.category);
    return {
      sentence: `Apply ${focus} to today’s routine.`,
      primaryCta: 'Update routine',
    };
  }
  return {
    sentence:
      'Keep your routine consistent for the next 2–3 days, then rescan to track the trend.',
    primaryCta: 'Open routine',
  };
}

function focusFromCategory(category: string | null): string {
  if (!category) return 'today’s focus';
  switch (category) {
    case 'serum':
      return 'hydration support';
    case 'moisturizer':
      return 'barrier support';
    case 'spf':
      return 'SPF protection';
    case 'treatment':
      return 'spot care';
    case 'cleanser':
      return 'gentle cleansing';
    default:
      return 'today’s focus';
  }
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    textTransform: 'uppercase',
  },
  line: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
});
