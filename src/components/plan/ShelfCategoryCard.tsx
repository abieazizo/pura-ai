import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Check } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import type { Product, ProductCategory } from '@/types';
import { plan } from './tokens';

export interface ShelfCategoryCardProps {
  category: ProductCategory;
  label: string;
  /** Calm-language priority chip. */
  priority: 'Highest' | 'High' | 'Medium' | 'Optional';
  /** Owned product (or null when missing). */
  product: Product | null;
  onAdd: () => void;
  onOpen?: () => void;
}

const PRIORITY_PALETTE: Record<
  ShelfCategoryCardProps['priority'],
  { bg: string; fg: string }
> = {
  Highest: { bg: plan.warningSoft, fg: plan.warning },
  High: { bg: plan.successSoft, fg: plan.success },
  Medium: { bg: plan.softBlue, fg: plan.brand },
  Optional: { bg: '#F1F5F9', fg: plan.inkMuted },
};

/**
 * Per-category card for the Shelf tab.
 *
 * Empty state: muted background, "+ Add" CTA.
 * Filled state: product thumbnail + name + tap-to-open.
 *
 * Priority pill describes the role of the category in the safe-default
 * routine (SPF = highest, moisturizer = high, hydration = medium,
 * cleanser = optional).
 */
export function ShelfCategoryCard({
  label,
  priority,
  product,
  onAdd,
  onOpen,
}: ShelfCategoryCardProps) {
  const filled = !!product;
  const p = PRIORITY_PALETTE[priority];

  return (
    <View
      style={[
        styles.card,
        filled ? styles.filled : styles.empty,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.label} maxFontSizeMultiplier={1.15}>
          {label}
        </Text>
        <View style={[styles.priorityPill, { backgroundColor: p.bg }]}>
          <Text
            style={[styles.priorityLabel, { color: p.fg }]}
            maxFontSizeMultiplier={1.1}
          >
            {priority}
          </Text>
        </View>
      </View>

      {filled ? (
        <Pressable
          onPress={() => {
            hapt.select();
            onOpen?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${product.brand} ${product.name}, open product`}
          style={({ pressed }) => [
            styles.filledRow,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.thumb}>
            {product.imageUri ? (
              <Image
                source={{ uri: product.imageUri }}
                style={styles.thumbImg}
                contentFit="cover"
                transition={120}
              />
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={styles.brand}
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
            >
              {product.brand}
            </Text>
            <Text
              style={styles.name}
              numberOfLines={2}
              maxFontSizeMultiplier={1.15}
            >
              {product.name}
            </Text>
          </View>
          <View style={styles.checkPill}>
            <Check size={12} color={plan.success} weight="bold" />
            <Text style={styles.checkLabel}>Added</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            hapt.tap();
            onAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
          style={({ pressed }) => [
            styles.addRow,
            pressed && { opacity: 0.92 },
          ]}
        >
          <View style={styles.addIcon}>
            <Plus size={14} color={plan.brand} weight="bold" />
          </View>
          <Text style={styles.addLabel} maxFontSizeMultiplier={1.15}>
            {`Add ${label.toLowerCase()}`}
          </Text>
          <Text style={styles.addHint} maxFontSizeMultiplier={1.1}>
            {'Scan, search, or enter'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 130,
  },
  empty: {
    backgroundColor: plan.card,
    borderColor: plan.border,
  },
  filled: {
    backgroundColor: plan.card,
    borderColor: plan.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: plan.ink,
    letterSpacing: -0.1,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  priorityLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: plan.softBlue,
    borderWidth: 1,
    borderColor: plan.border,
    borderStyle: 'dashed',
    marginTop: 14,
  },
  addIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: plan.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.brand,
  },
  addHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: plan.inkMuted,
  },
  filledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: plan.bg,
    borderWidth: 1,
    borderColor: plan.border,
    marginTop: 14,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: plan.softBlue,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: plan.inkMuted,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 17,
    color: plan.ink,
    marginTop: 2,
  },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: plan.successSoft,
  },
  checkLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.4,
    color: plan.success,
    textTransform: 'uppercase',
  },
});
