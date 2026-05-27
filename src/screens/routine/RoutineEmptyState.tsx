/**
 * RoutineEmptyState — first-run + segment-empty panels.
 *
 * `FirstRunRoutinePanel` is the post-scan + pre-scan card shown when
 * NO products exist anywhere in the user's routine. Post-scan, it
 * embeds the canonical `SuggestedTonightStep` so the empty state is
 * scan-aware. Pre-scan, the primary action is to take the first scan.
 *
 * `SegmentEmptyPanel` is shown when the current Morning / Evening /
 * Saved segment is empty but other segments have products.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { PuraMark } from '@/components/PuraMark';
import { SuggestedTonightStep } from '@/components/progress/SuggestedTonightStep';
import { palette } from '@/theme';
import type { ProgressRoutineInsight } from '@/state/progressRoutineInsight';
import type { InnerSegment } from '@/screens/routine/lib';

interface FirstRunProps {
  hasScanned: boolean;
  bestMove: ProgressRoutineInsight['bestMove'];
  onScan: () => void;
  onBrowse: () => void;
}

export function FirstRunRoutinePanel({
  hasScanned,
  bestMove,
  onScan,
  onBrowse,
}: FirstRunProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <PuraMark size={44} variant="idle" />
      </View>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        {hasScanned
          ? 'Build your routine around what your skin needs.'
          : 'Take your first scan to unlock a personalised routine.'}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        {hasScanned
          ? 'Start with your current products, or add Pura-matched picks based on your latest scan.'
          : 'A 20-second skin read tells us what to focus on tonight.'}
      </Text>

      {hasScanned && bestMove ? (
        <SuggestedTonightStep bestMove={bestMove} />
      ) : null}

      {!hasScanned ? (
        <Pressable
          onPress={onScan}
          accessibilityRole="button"
          accessibilityLabel="Take your first scan"
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Take your first scan
          </Text>
          <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onBrowse}
        accessibilityRole="button"
        accessibilityLabel={
          hasScanned ? 'Browse all products' : 'Browse products instead'
        }
        style={({ pressed }) => [
          hasScanned ? styles.secondaryCta : styles.tertiaryLink,
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text
          style={
            hasScanned ? styles.secondaryCtaLabel : styles.tertiaryLinkLabel
          }
          maxFontSizeMultiplier={1.15}
        >
          {hasScanned ? 'Browse all products' : 'Browse products instead'}
        </Text>
      </Pressable>
    </View>
  );
}

interface SegmentEmptyProps {
  segment: InnerSegment;
  onBrowse: () => void;
}

export function SegmentEmptyPanel({ segment, onBrowse }: SegmentEmptyProps) {
  const copy =
    segment === 'morning'
      ? {
          heading: 'No morning steps yet.',
          body: 'Add a product from your saved picks or the catalog to build your morning.',
          cta: 'Browse products',
        }
      : segment === 'evening'
      ? {
          heading: 'No evening steps yet.',
          body: 'Evening is where repair happens. Add targeted products from the catalog.',
          cta: 'Browse products',
        }
      : {
          heading: 'Nothing saved yet.',
          body: 'Tap the heart on any product to keep it here and decide later.',
          cta: 'Explore products',
        };
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <PuraMark size={38} variant="idle" />
      </View>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        {copy.heading}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        {copy.body}
      </Text>
      <Pressable
        onPress={onBrowse}
        accessibilityRole="button"
        accessibilityLabel={copy.cta}
        style={({ pressed }) => [
          styles.primaryCta,
          pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
          {copy.cta}
        </Text>
        <ArrowRight size={16} color={palette.inkInverse} weight="duotone" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 32,
    marginHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    alignItems: 'center',
  },
  mark: { marginBottom: 18 },
  heading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSecondary,
    textAlign: 'center',
    marginBottom: 22,
    maxWidth: 300,
  },
  primaryCta: {
    height: 44,
    minWidth: 200,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    marginTop: 10,
    paddingVertical: 8,
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.inkSecondary,
  },
  tertiaryLink: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tertiaryLinkLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkTertiary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
