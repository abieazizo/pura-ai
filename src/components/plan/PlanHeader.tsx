import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PuraMark } from '@/components/PuraMark';
import { ConfidenceBadge } from './ConfidenceBadge';
import type { ConfidenceLabel } from '@/state/planState';
import { plan } from './tokens';

export interface PlanHeaderProps {
  /** Confidence label that drives the right-side status chip. */
  confidence: ConfidenceLabel;
  /** Tab subtitle (e.g. "Today" / "Progress" / "Shelf"). Optional. */
  subtitle?: string;
}

/**
 * Top header for the Today's Plan destination.
 *
 *   [droplet]  Today's Plan          [Scan needed]
 *              {subtitle}
 *
 * The title is a serif — emotional. The subtitle is a small kicker that
 * names the active tab; we don't repeat "Today / Progress / Shelf" in
 * the tabs row because that creates double-naming.
 */
export function PlanHeader({ confidence, subtitle }: PlanHeaderProps) {
  return (
    <View style={styles.wrap}>
      <PuraMark size={22} variant="idle" />
      <View style={styles.titleCol}>
        <Text
          style={styles.title}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          Today’s Plan
        </Text>
        {subtitle ? (
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ConfidenceBadge label={confidence} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: plan.ink,
  },
  subtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: plan.inkMuted,
    marginTop: 2,
  },
});
