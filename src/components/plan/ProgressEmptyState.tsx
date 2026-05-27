import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScanSmiley } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

export interface ProgressEmptyStateProps {
  onStartScan: () => void;
  onLearnMore?: () => void;
}

/**
 * Hero for the Progress tab when the user has zero scans.
 *
 * Aspirational, not empty. We never show graphs or scores here — the
 * locked unlocks grid lives in `ProgressUnlockPreview` below.
 */
export function ProgressEmptyState({
  onStartScan,
  onLearnMore,
}: ProgressEmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconTile}>
        <ScanSmiley size={26} color={plan.brand} weight="duotone" />
      </View>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header"
      >
        Your skin timeline starts with one scan
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.25}>
        Your first scan creates a baseline so Pura can track what improves,
        what stays active, and what needs attention next.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onStartScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Take first scan"
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          Take first scan
        </Text>
      </Pressable>
      {onLearnMore ? (
        <Pressable
          onPress={() => {
            hapt.select();
            onLearnMore();
          }}
          accessibilityRole="button"
          accessibilityLabel="How tracking works"
          hitSlop={6}
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.secondaryCtaLabel} maxFontSizeMultiplier={1.15}>
            How tracking works
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: plan.softBlue,
    borderWidth: 1,
    borderColor: plan.border,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: plan.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: plan.ink,
    marginTop: 16,
    maxWidth: 360,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: plan.inkSecondary,
    marginTop: 10,
    maxWidth: 420,
  },
  primaryCta: {
    height: 50,
    borderRadius: 999,
    backgroundColor: plan.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  secondaryCta: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.inkSecondary,
    textDecorationLine: 'underline',
  },
});
