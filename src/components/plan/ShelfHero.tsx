import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScanSmiley, MagnifyingGlass, PencilSimple } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { plan } from './tokens';

export interface ShelfHeroProps {
  onScanProduct: () => void;
  onSearchProduct: () => void;
  onAddManually: () => void;
}

/**
 * Hero block for the empty Shelf tab.
 *
 * Three calm options: Scan, Search, Add manually. Trust line beneath
 * reminds the user Pura uses their shelf first — the most important
 * promise the Shelf tab has to keep.
 */
export function ShelfHero({
  onScanProduct,
  onSearchProduct,
  onAddManually,
}: ShelfHeroProps) {
  return (
    <View style={styles.card}>
      <Text
        style={styles.title}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header"
      >
        Build from what you already own
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.25}>
        Add the products on your shelf. Pura will organize them into safe
        morning and evening steps before recommending anything new.
      </Text>

      <View style={styles.ctaCol}>
        <Pressable
          onPress={() => {
            hapt.tap();
            onScanProduct();
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan product"
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <ScanSmiley size={16} color="#FFFFFF" weight="duotone" />
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Scan product
          </Text>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => {
              hapt.select();
              onSearchProduct();
            }}
            accessibilityRole="button"
            accessibilityLabel="Search product"
            style={({ pressed }) => [
              styles.secondaryCta,
              pressed && { opacity: 0.85 },
            ]}
          >
            <MagnifyingGlass
              size={14}
              color={plan.ink}
              weight="duotone"
            />
            <Text style={styles.secondaryCtaLabel} maxFontSizeMultiplier={1.15}>
              Search product
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapt.select();
              onAddManually();
            }}
            accessibilityRole="button"
            accessibilityLabel="Add product manually"
            style={({ pressed }) => [
              styles.tertiaryCta,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={6}
          >
            <PencilSimple
              size={13}
              color={plan.inkSecondary}
              weight="duotone"
            />
            <Text style={styles.tertiaryCtaLabel} maxFontSizeMultiplier={1.15}>
              Add manually
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.trustRow}>
        <View style={styles.trustDot} />
        <Text style={styles.trustText} maxFontSizeMultiplier={1.1}>
          Pura uses your shelf first.
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
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: plan.ink,
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
  ctaCol: {
    marginTop: 16,
    gap: 10,
  },
  primaryCta: {
    height: 50,
    borderRadius: 999,
    backgroundColor: plan.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    justifyContent: 'space-between',
    gap: 8,
  },
  secondaryCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 999,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  secondaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.ink,
  },
  tertiaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 42,
  },
  tertiaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: plan.inkSecondary,
    textDecorationLine: 'underline',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  trustDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: plan.brand,
  },
  trustText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: plan.inkSecondary,
  },
});
