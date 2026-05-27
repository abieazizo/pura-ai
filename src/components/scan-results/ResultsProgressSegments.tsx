/**
 * Slim progress segments shown at the top of every scan-results slide.
 *
 * Reads `current` (0-indexed) and `total`. Segments before and
 * including `current` paint coral; later segments paint a calm
 * line tone. The component is purely visual — the parent owns the
 * paging state.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { scanColors, scanLayout, scanRadius } from '@/theme/scanResultsTokens';

export interface ResultsProgressSegmentsProps {
  current: number;
  total?: number;
}

export function ResultsProgressSegments({
  current,
  total = scanLayout.slideCount,
}: ResultsProgressSegmentsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: current + 1, min: 1, max: total }}
      accessibilityLabel={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        return (
          <View
            key={i}
            style={[
              styles.seg,
              { backgroundColor: active ? scanColors.coral : scanColors.line },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  seg: {
    flex: 1,
    height: 3,
    borderRadius: scanRadius.pill,
  },
});
