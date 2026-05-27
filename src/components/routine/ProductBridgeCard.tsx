/**
 * ProductBridgeCard — Routine → Products bridge.
 *
 * The single product-discovery CTA inside Routine. Routine no longer
 * acts as a generic catalog gateway; this card is the one curated entry
 * point so Routine stays focused on tonight's plan.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Drop } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

interface Props {
  /** "hydration" / "recovery" / etc — drives the primary CTA copy. */
  focusLabel: string;
  onSeeMatches: () => void;
  onBrowseAll: () => void;
}

export function ProductBridgeCard({
  focusLabel,
  onSeeMatches,
  onBrowseAll,
}: Props) {
  const primaryLabel = `See ${focusLabel.toLowerCase()} matches`;

  return (
    <View style={styles.wrap}>
      <View style={styles.iconRow}>
        <View style={styles.iconWrap}>
          <Drop size={18} color={palette.clay} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} maxFontSizeMultiplier={1.15}>
            Need a product for this step?
          </Text>
          <Text
            style={styles.body}
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
          >
            Pura can match products to today’s scan, your skin goals, and
            your routine gaps.
          </Text>
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={() => {
            hapt.tap();
            onSeeMatches();
          }}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
            {primaryLabel}
          </Text>
          <ArrowRight size={14} color={palette.inkInverse} weight="bold" />
        </Pressable>
        <Pressable
          onPress={() => {
            hapt.select();
            onBrowseAll();
          }}
          accessibilityRole="button"
          accessibilityLabel="Browse all products"
          style={({ pressed }) => [
            styles.secondaryCta,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
            Browse all
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: palette.clayLight,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkSecondary,
  },
});
