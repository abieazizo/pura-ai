/**
 * Slim banner shown across the top of result slides when the scan
 * quality is `limited_results` but supported findings still exist.
 *
 * Truth-first: the banner is content-aware. It states how many focus
 * areas are supported so the user reads a real count, never a generic
 * "areas are clear" message.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { scanColors, scanRadius, scanType } from '@/theme/scanResultsTokens';

export interface LimitedScanBannerProps {
  visible: boolean;
  supportedCount?: number;
}

export function LimitedScanBanner({
  visible,
  supportedCount,
}: LimitedScanBannerProps) {
  if (!visible) return null;
  const message =
    typeof supportedCount === 'number'
      ? `Limited scan · ${supportedCount} focus area${supportedCount === 1 ? '' : 's'} supported`
      : 'Limited scan · Showing supported areas only';
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.dot} />
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: scanColors.amberWash,
    borderRadius: scanRadius.smallCard,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: scanColors.amber,
  },
  text: {
    ...scanType.caption,
    color: scanColors.amberDeep,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
});
