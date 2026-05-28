import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus } from 'phosphor-react-native';
import { dx } from '../decisionTokens';
import { localProductImageFor } from '@/data/seed';
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
  // Show a product thumbnail when one exists — falls back to the
  // colored disc so fallback is always clean.
  const localSrc = adjustment.productId
    ? localProductImageFor(adjustment.productId)
    : undefined;

  return (
    <View style={[styles.row, showDivider && styles.rowWithDivider]}>
      {localSrc ? (
        <View style={styles.thumbWrap}>
          <Image
            source={localSrc}
            style={styles.thumb}
            contentFit="contain"
            transition={120}
          />
          <View style={[styles.glyphBadge, { backgroundColor: discBg }]}>
            <Icon size={9} color={glyphColor} weight="bold" />
          </View>
        </View>
      ) : (
        <View style={[styles.glyphDisc, { backgroundColor: discBg }]}>
          <Icon size={12} color={glyphColor} weight="bold" />
        </View>
      )}
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
  thumbWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: dx.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dx.line,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },
  glyphBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: dx.paper,
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
