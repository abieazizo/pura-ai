import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, BellRinging } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

export interface PlanCompleteCardProps {
  onViewProgress: () => void;
  onSetReminder?: () => void;
}

/**
 * Calm celebration card surfaced when every step is complete.
 *
 * Mature retention language — no confetti, no streak shaming. Reads as
 * a quiet acknowledgment: you finished today's barrier-support plan.
 * Pura will use that signal to learn what helps.
 */
export function PlanCompleteCard({
  onViewProgress,
  onSetReminder,
}: PlanCompleteCardProps) {
  return (
    <View style={styles.card} accessible accessibilityRole="summary">
      <View style={styles.iconTile}>
        <CheckCircle size={26} color={plan.success} weight="duotone" />
      </View>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header"
      >
        Plan complete
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.25}>
        You finished today’s barrier-support routine. Pura will use this to
        understand what helps your skin over time.
      </Text>
      <Pressable
        onPress={() => {
          hapt.tap();
          onViewProgress();
        }}
        accessibilityRole="button"
        accessibilityLabel="View progress"
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          View progress
        </Text>
      </Pressable>
      {onSetReminder ? (
        <Pressable
          onPress={() => {
            hapt.select();
            onSetReminder();
          }}
          accessibilityRole="button"
          accessibilityLabel="Set evening reminder"
          hitSlop={6}
          style={({ pressed }) => [
            styles.secondaryRow,
            pressed && { opacity: 0.8 },
          ]}
        >
          <BellRinging size={13} color={plan.inkSecondary} weight="duotone" />
          <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.15}>
            Set evening reminder
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
    padding: 20,
    borderRadius: 22,
    backgroundColor: plan.successSoft,
    borderWidth: 1,
    borderColor: '#CFE9DC',
    alignItems: 'center',
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 18,
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
    marginTop: 14,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: plan.inkSecondary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 360,
  },
  primaryCta: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 999,
    backgroundColor: plan.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.inkSecondary,
    textDecorationLine: 'underline',
  },
});
