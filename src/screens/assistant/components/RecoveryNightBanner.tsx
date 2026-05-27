import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight } from 'phosphor-react-native';
import { dx, dRadius } from '../decisionTokens';
import { hapt } from '@/utils/haptics';
import type { TonightDecision } from '@/state/tonightDecision';

interface Props {
  decision: TonightDecision;
  onOpenAssistant: () => void;
}

/**
 * Reusable banner that the Routine tab (and any other surface) can
 * render to show the user that AI Assist adjusted tonight's routine.
 * Tapping the banner returns the user to AI Assist so they can review
 * the decision or undo it.
 */
export function RecoveryNightBanner({ decision, onOpenAssistant }: Props) {
  if (!decision.applied) return null;

  const removed = decision.adjustments.filter(
    (a) => a.status === 'HELD_TONIGHT' || a.status === 'AVOID_UNTIL_RECHECK',
  );
  const prioritized = decision.adjustments.find(
    (a) =>
      a.status === 'PRIORITIZED_TONIGHT' || a.status === 'USE_TONIGHT',
  );

  const subtitle =
    decision.state === 'RESET_NIGHT'
      ? 'Adjusted by AI Assist after today’s scan'
      : 'Adjusted by AI Assist after today’s scan';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tonight is ${decision.title}. Open AI Assist to review.`}
      onPress={() => {
        hapt.select();
        onOpenAssistant();
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
    >
      <View style={styles.indicator} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.15}>
            TONIGHT · {decision.title.toUpperCase()}
          </Text>
          <ArrowUpRight size={14} color={dx.terracottaText} weight="bold" />
        </View>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
          {subtitle}
        </Text>
        {removed.length > 0 ? (
          <Text style={styles.detail} maxFontSizeMultiplier={1.25} numberOfLines={2}>
            Held tonight: {removed.map((r) => r.productName).join(', ')}
          </Text>
        ) : null}
        {prioritized ? (
          <Text style={styles.detail} maxFontSizeMultiplier={1.25} numberOfLines={2}>
            Prioritized: {prioritized.productName}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: dx.clayHold,
    borderColor: dx.terracottaTint,
    borderWidth: 1,
    borderRadius: dRadius.evidenceTile,
    padding: 14,
  },
  indicator: {
    width: 3,
    borderRadius: 2,
    backgroundColor: dx.terracotta,
  },
  content: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: dx.terracottaText,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: dx.inkSecondary,
    lineHeight: 18,
  },
  detail: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: dx.ink,
    lineHeight: 17,
  },
});
