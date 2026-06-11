/**
 * Packshot — the actual product photo, rendered calm.
 *
 * Resolution order mirrors the companion's resolver: the shop catalog's
 * bundled, offline-safe packshot first (`pick.id === ShopCatalogProduct.id`),
 * then a require()'d asset carried on the product, then a remote URL as the
 * last resort. Rendered on a porcelain chip with a hairline so white-field
 * product photography reads correctly on the night surface too.
 *
 * IMPORTANT: this is the ONLY routine-experience module that may import the
 * shop catalog — the catalog require()s .jpg files, which the Node-run
 * headless verify (model/fixtures) cannot load. Components only.
 */

import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { findShopProduct } from '@/screens/shop/shopCatalog';
import type { PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { neutral } from '@/theme/ds';

export interface PackshotRef {
  id: string;
  imageAsset?: number;
  imageUrl?: string;
}

export function resolvePackshot(ref: PackshotRef): ImageSourcePropType | undefined {
  const catalog = findShopProduct(ref.id);
  if (catalog?.catalogPackshot) return catalog.catalogPackshot;
  if (ref.imageAsset != null) return ref.imageAsset;
  if (ref.imageUrl) return { uri: ref.imageUrl };
  return undefined;
}

/** The product photo on its quiet chip. Renders nothing when no art exists —
 *  the routine works product-free, and so does its layout. */
export function Packshot({
  pick,
  size,
  atmo,
  radius = 12,
}: {
  pick: PackshotRef;
  size: number;
  atmo: PeriodAtmosphere;
  radius?: number;
}) {
  const source = resolvePackshot(pick);
  if (!source) return null;
  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: atmo.hairline,
          // Packshots are shot on white — keep their field porcelain even on
          // the night card, so the photo reads as an object, not a hole.
          backgroundColor: neutral[0],
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={source}
        resizeMode="contain"
        style={{ width: size - 8, height: size - 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
