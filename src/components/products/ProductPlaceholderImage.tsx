/**
 * Product placeholder image — v10.27.
 *
 * Renders a deterministic, branded-looking placeholder for any
 * product without resorting to random photo services. Each product
 * gets:
 *   • a category-specific accent gradient (cleanser=clay, serum=
 *     moss, moisturizer=sand, etc.)
 *   • a category icon centered in the tile
 *   • the brand wordmark in tracked-caps below
 *
 * The result reads as "this is a real product card" instead of "this
 * is a random Lorem-ipsum photo," which the v10 seed catalog had been
 * doing via picsum.photos. Existing code paths still pass an
 * `imageUri` so a real image can be swapped in product-by-product
 * later — but in the absence of one, this placeholder is the
 * universal fallback.
 *
 * Pure SVG / RN — no external network image is fetched, so this
 * works offline, in CI, and on the first frame of a cold app boot.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Drop,
  Sparkle,
  Sun,
  Moon,
  CircleDashed,
  Lightning,
  Leaf,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import type { Product, ProductCategory } from '@/types';

type PhosphorIcon = React.FC<PhosphorIconProps>;

const CATEGORY_META: Record<
  ProductCategory,
  { icon: PhosphorIcon; gradient: [string, string]; accent: string }
> = {
  cleanser: {
    icon: Drop as PhosphorIcon,
    gradient: [palette.clayPaper, palette.clayLight ?? palette.clayPaper],
    accent: palette.clay,
  },
  toner: {
    icon: CircleDashed as PhosphorIcon,
    gradient: [palette.mossLight, palette.mossLight],
    accent: palette.mossDeep,
  },
  serum: {
    icon: Sparkle as PhosphorIcon,
    gradient: [palette.clayPaper, palette.sandPaper],
    accent: palette.clay,
  },
  moisturizer: {
    icon: Sun as PhosphorIcon,
    gradient: [palette.sandPaper, palette.sandPaper],
    accent: palette.amber,
  },
  spf: {
    icon: Lightning as PhosphorIcon,
    gradient: [palette.sandPaper, palette.clayPaper],
    accent: palette.amber,
  },
  treatment: {
    icon: Moon as PhosphorIcon,
    gradient: [palette.bgDeep, palette.clayPaper],
    accent: palette.clayDeep,
  },
  mask: {
    icon: Leaf as PhosphorIcon,
    gradient: [palette.mossLight, palette.bgDeep],
    accent: palette.mossDeep,
  },
};

export interface ProductPlaceholderImageProps {
  product: Pick<Product, 'brand' | 'category' | 'tint'>;
  /** Visual size of the rendered icon. */
  iconSize?: number;
  /** When true, the brand wordmark renders below the icon (cards). */
  showBrandWord?: boolean;
}

export function ProductPlaceholderImage({
  product,
  iconSize = 36,
  showBrandWord = true,
}: ProductPlaceholderImageProps) {
  const meta = CATEGORY_META[product.category];
  const Icon = meta.icon;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={meta.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center} pointerEvents="none">
        <Icon size={iconSize} color={meta.accent} weight="duotone" />
        {showBrandWord ? (
          <Text
            style={[styles.brandWord, { color: meta.accent }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {brandShort(product.brand)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function brandShort(brand: string): string {
  // Strip apostrophes + smart quotes, uppercase, take first 14 chars.
  // Keeps "PAULA'S CHOICE" → "PAULAS CHOICE", "BEAUTY OF JOSEON"
  // un-truncated.
  const cleaned = brand
    .replace(/[\u2018\u2019']/g, '')
    .toUpperCase()
    .trim();
  return cleaned.length > 14 ? cleaned.slice(0, 14) : cleaned;
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  brandWord: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
});
