import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { dx, dRadius } from '../decisionTokens';
import { COMPRESSED_ANCHOR } from '../decisionCopy';
import type { TonightDecision, DecisionState } from '@/state/tonightDecision';
import { hapt } from '@/utils/haptics';

interface Props {
  decision: TonightDecision;
  onViewDecision: () => void;
}

/**
 * v26.2 — state-resolution table for the compressed anchor. Pairs
 * each `DecisionState` with the short copy line and the indicator
 * color, so the row's visual signal matches the decision at a
 * glance instead of being uniformly terracotta.
 */
const STATE_PRESENTATION: Record<
  DecisionState,
  { short: string; indicator: string }
> = {
  STANDARD_NIGHT:    { short: COMPRESSED_ANCHOR.shortStandard,  indicator: dx.signalStandard },
  RECOVERY_NIGHT:    { short: COMPRESSED_ANCHOR.shortRecovery,  indicator: dx.signalRecovery },
  RESET_NIGHT:       { short: COMPRESSED_ANCHOR.shortReset,     indicator: dx.signalReset },
  TREATMENT_NIGHT:   { short: COMPRESSED_ANCHOR.shortTreatment, indicator: dx.signalTreatment },
  CHECK_IN_REQUIRED: { short: COMPRESSED_ANCHOR.shortCheckIn,   indicator: dx.signalCheckIn },
};

/**
 * Persistent decision anchor used in Conversation Mode. The full
 * Decision Card never disappears into stale chat history — this row
 * keeps the user's current decision state visible at the top of
 * every conversation answer with a one-tap return to the full view.
 *
 * v26.2 — indicator color reflects state (recovery=terracotta,
 * reset=deep amber, check-in=amber, standard=sage, treatment=clay).
 */
export function CompressedDecisionAnchor({ decision, onViewDecision }: Props) {
  const presentation =
    STATE_PRESENTATION[decision.state] ?? STATE_PRESENTATION.STANDARD_NIGHT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${decision.title}. ${presentation.short}. ${COMPRESSED_ANCHOR.view}`}
      accessibilityHint="Opens the full decision card for tonight"
      onPress={() => {
        hapt.select();
        onViewDecision();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      hitSlop={6}
    >
      <View
        style={[styles.indicator, { backgroundColor: presentation.indicator }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.text}>
        <Text style={styles.state} maxFontSizeMultiplier={1.15} numberOfLines={1}>
          {decision.title}
        </Text>
        <Text
          style={styles.statement}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {presentation.short}
        </Text>
      </View>
      <View
        style={styles.cta}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Text style={styles.view} maxFontSizeMultiplier={1.15}>
          {COMPRESSED_ANCHOR.view}
        </Text>
        <CaretRight size={14} weight="bold" color={dx.terracottaText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: dx.surfacePrimary,
    borderRadius: dRadius.evidenceTile,
    borderWidth: 1,
    borderColor: dx.line,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.997 }],
  },
  indicator: {
    width: 3,
    height: 28,
    borderRadius: 2,
    // backgroundColor injected at render time from STATE_PRESENTATION
  },
  text: { flex: 1, gap: 1 },
  state: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: dx.ink,
    letterSpacing: -0.1,
  },
  statement: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: dx.inkSecondary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  view: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: dx.terracottaText,
    letterSpacing: -0.1,
  },
});
