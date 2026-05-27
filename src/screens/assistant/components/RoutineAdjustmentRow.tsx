import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus, Minus } from 'phosphor-react-native';
import { dx } from '../decisionTokens';
import type { ProductAdjustment } from '@/state/tonightDecision';

interface Props {
  adjustment: ProductAdjustment;
  showDivider?: boolean;
}

/**
 * One row inside "Tonight's adjustments".
 *
 * v27 Pass 4: the leading glyph carries a tiny color cue — clay for
 * held / avoid (warm "step back") and sage for prioritized / use
 * (calm "step forward"). The cue is layered under the glyph as a
 * 24×24 tinted disc so the row stays clean even when the user only
 * scans the leading column.
 */
export function RoutineAdjustmentRow({ adjustment, showDivider = true }: Props) {
  const isAdd =
    adjustment.status === 'PRIORITIZED_TONIGHT' ||
    adjustment.status === 'USE_TONIGHT';
  const Icon = isAdd ? Plus : Minus;
  const discBg = isAdd ? dx.signalStandard + '22' : dx.terracottaSoft;
  const glyphColor = isAdd ? dx.signalStandard : dx.terracotta;

  return (
    <View style={[styles.row, showDivider && styles.rowWithDivider]}>
      <View style={[styles.glyphDisc, { backgroundColor: discBg }]}>
        <Icon size={12} color={glyphColor} weight="bold" />
      </View>
      <View style={styles.content}>
        <Text
          style={styles.name}
          numberOfLines={2}
          maxFontSizeMultiplier={1.25}
        >
          {adjustment.productName}
        </Text>
        <Text
          style={styles.reason}
          numberOfLines={2}
          maxFontSizeMultiplier={1.25}
        >
          {adjustment.reason}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  rowWithDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dx.hairline,
  },
  glyphDisc: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    color: dx.ink,
    letterSpacing: -0.1,
  },
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: dx.inkSecondary,
  },
});
