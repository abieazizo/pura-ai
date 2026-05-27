import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Plus } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import type { Product } from '@/types';
import { plan } from './tokens';

export interface ProductSlotProps {
  /** Attached product, or null for the empty state. */
  product: Product | null;
  /** Empty-state noun, e.g. "cleanser" / "moisturizer" / "SPF". */
  emptyNoun: string;
  /** Tap when there's no product attached. */
  onAdd: () => void;
  /** Tap when a product is attached. */
  onOpen?: () => void;
}

/**
 * Inline product affordance rendered inside a PlanStepCard.
 *
 * Empty state: dashed-feeling tile with "+ Add {noun}" — never a hard
 * empty box. Filled state: small product thumbnail + brand line that
 * opens the product detail.
 */
export function ProductSlot({
  product,
  emptyNoun,
  onAdd,
  onOpen,
}: ProductSlotProps) {
  if (!product) {
    return (
      <Pressable
        onPress={() => {
          hapt.select();
          onAdd();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Add ${emptyNoun}`}
        style={({ pressed }) => [
          styles.emptyRow,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={styles.emptyIcon}>
          <Plus size={14} color={plan.brand} weight="bold" />
        </View>
        <Text
          style={styles.emptyLabel}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {`Add ${emptyNoun}`}
        </Text>
        <Text
          style={styles.emptyHint}
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
        >
          From your shelf
        </Text>
      </Pressable>
    );
  }

  return (
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
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: plan.softBlue,
    borderWidth: 1,
    borderColor: plan.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: plan.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.brand,
  },
  emptyHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: plan.inkMuted,
  },
  filledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: plan.softBlue,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: plan.softBlue,
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
});
