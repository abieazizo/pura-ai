/**
 * Top header bar shared by every scan-results slide.
 *
 * Left:  back arrow or PURA wordmark (caller's choice via `leading`).
 * Right: small "n of N" label.
 * Below: ResultsProgressSegments.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretLeft } from 'phosphor-react-native';
import { scanColors, scanLayout, scanType } from '@/theme/scanResultsTokens';
import { ResultsProgressSegments } from './ResultsProgressSegments';

export interface ResultsHeaderBarProps {
  current: number;
  total?: number;
  /** When set, the left side shows a back-arrow button. */
  onBack?: () => void;
  /** When set (and `onBack` is undefined), the left side renders the PURA wordmark. */
  showBrand?: boolean;
  /** When set, suppresses the right-side counter (useful for the loading slide
   *  when the counter should still render — caller controls). */
  hideCounter?: boolean;
}

export function ResultsHeaderBar({
  current,
  total = scanLayout.slideCount,
  onBack,
  showBrand = false,
  hideCounter = false,
}: ResultsHeaderBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <CaretLeft size={18} weight="bold" color={scanColors.ink} />
            </Pressable>
          ) : showBrand ? (
            <Text style={styles.brand}>PURA</Text>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
        <View style={styles.sideRight}>
          {!hideCounter && (
            <Text style={styles.counter}>
              {current + 1} of {total}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.segments}>
        <ResultsProgressSegments current={current} total={total} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  side: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  sideRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 2.4,
    color: scanColors.ink,
  },
  counter: {
    ...scanType.caption,
    color: scanColors.muted,
    fontFamily: 'Inter-Medium',
  },
  segments: {
    paddingHorizontal: 2,
  },
});
