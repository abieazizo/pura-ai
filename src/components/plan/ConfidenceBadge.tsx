import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ConfidenceLabel } from '@/state/planState';
import { plan } from './tokens';

export interface ConfidenceBadgeProps {
  label: ConfidenceLabel;
}

/**
 * Right-aligned status chip used in the Plan header.
 *
 * "Scan needed" reads warm (warning-soft) so it acts as a call to action
 * without alarming. The post-scan stages step down to the calm soft-blue
 * surface — informational, not promotional.
 *
 * We never say "High confidence" before scan #14 — the label is fed
 * directly from `PlanState.confidenceLabel`, which is the only place
 * confidence escalation lives.
 */
export function ConfidenceBadge({ label }: ConfidenceBadgeProps) {
  const isWarn = label === 'Scan needed';
  return (
    <View
      style={[styles.wrap, isWarn ? styles.warnWrap : styles.calmWrap]}
      accessible
      accessibilityLabel={`Confidence: ${label}`}
    >
      <View
        style={[styles.dot, { backgroundColor: isWarn ? plan.warning : plan.brand }]}
      />
      <Text
        style={[styles.label, { color: isWarn ? plan.warning : plan.brand }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  calmWrap: {
    backgroundColor: plan.softBlue,
  },
  warnWrap: {
    backgroundColor: plan.warningSoft,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
