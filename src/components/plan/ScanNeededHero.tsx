import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScanSmiley, ShieldCheck } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

export interface ScanNeededHeroProps {
  onStartScan: () => void;
  onUseStarter?: () => void;
}

/**
 * Hero card for the No-Scan state of the Today tab.
 *
 * Composition:
 *   icon tile
 *   serif headline      Set your skin baseline
 *   body sentence       A 20-second scan turns this starter routine
 *                       into a plan based on your skin today.
 *   primary CTA         Start first scan      (deep navy)
 *   secondary CTA       Use starter routine   (ghost)
 *   micro trust line    Private by default · 20 seconds · No guesswork
 *
 * Visual weight is set so this is unambiguously the most important
 * element on screen — large soft-blue surface, the only filled navy
 * CTA above the fold.
 */
export function ScanNeededHero({
  onStartScan,
  onUseStarter,
}: ScanNeededHeroProps) {
  return (
    <View style={styles.card} accessible accessibilityRole="summary">
      <View style={styles.iconTile}>
        <ScanSmiley size={26} color={plan.brand} weight="duotone" />
      </View>

      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header"
      >
        Set your skin baseline
      </Text>

      <Text style={styles.body} maxFontSizeMultiplier={1.25}>
        A 20-second scan turns this starter routine into a plan based on your
        skin today.
      </Text>

      <Pressable
        onPress={() => {
          hapt.tap();
          onStartScan();
        }}
        accessibilityRole="button"
        accessibilityLabel="Start first scan"
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          Start first scan
        </Text>
      </Pressable>

      {onUseStarter ? (
        <Pressable
          onPress={() => {
            hapt.select();
            onUseStarter();
          }}
          accessibilityRole="button"
          accessibilityLabel="Use starter routine"
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.8 },
          ]}
          hitSlop={6}
        >
          <Text style={styles.secondaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Use starter routine
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.trustRow}>
        <ShieldCheck size={12} color={plan.inkMuted} weight="duotone" />
        <Text style={styles.trustText} maxFontSizeMultiplier={1.1}>
          Private by default  ·  20 seconds  ·  No guesswork
        </Text>
      </View>
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
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: plan.ink,
    marginTop: 16,
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
    letterSpacing: 0.1,
    color: '#FFFFFF',
  },
  secondaryCta: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: plan.inkSecondary,
    textDecorationLine: 'underline',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  trustText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: plan.inkMuted,
    letterSpacing: 0.1,
  },
});
