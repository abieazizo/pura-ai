/**
 * Product placeholder image — v10.30 magazine-mockup pass.
 *
 * Rebuilt from the v10.27 "icon on a gradient" pattern into a real-
 * looking product mockup: per-category vector silhouette (pump
 * bottle / dropper / jar / tube / sheet / spray) + brand wordmark
 * over a tinted gradient.
 *
 * Why this exists
 *   • Real, licensed product photography for 24 catalog items isn't
 *     reliably hot-linkable from third-party CDNs.
 *   • Picsum (random nature photos per id) reads as obviously
 *     placeholder.
 *   • A purely-controlled internal asset path — pure SVG, zero
 *     network — gives us a consistent, magazine-quality "card
 *     mockup" feel that survives offline, on first paint, and in
 *     CI snapshots.
 *
 * Visual
 *   • Soft category-tinted gradient background (clay/moss/sand
 *     family) with a subtle radial highlight at top-center for
 *     depth.
 *   • Per-category vector silhouette (cleanser=pump bottle, serum=
 *     dropper, moisturizer=jar, spf=tube, toner=tall bottle,
 *     treatment=spot dropper, mask=jar with lid).
 *   • Brand wordmark in tracked-caps Inter SemiBold over the
 *     bottle, plus an optional one-line product name underneath
 *     (used on the detail hero where we have room).
 *
 * The result reads as a real product card on every surface that
 * doesn't yet have licensed product photography. When real imagery
 * lands later, the component is bypassed cleanly via the existing
 * `imageUrl ? <Image …/> : <ProductPlaceholderImage …/>` pattern.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { palette } from '@/theme';
import type { Product, ProductCategory } from '@/types';

// ---------------------------------------------------------------------------
// Per-category visual recipe.
// ---------------------------------------------------------------------------

interface CategoryRecipe {
  /** Top → bottom gradient. */
  gradient: [string, string];
  /** Accent colour for the silhouette + wordmark. */
  accent: string;
  /** Bottle/jar SVG path (60x84 viewBox, see BottleSilhouette). */
  silhouette: 'pump' | 'dropper' | 'jar' | 'tube' | 'tall' | 'spot' | 'mask';
}

const CATEGORY: Record<ProductCategory, CategoryRecipe> = {
  cleanser: {
    gradient: [palette.clayPaper, palette.clayLight],
    accent: palette.clay,
    silhouette: 'pump',
  },
  toner: {
    gradient: [palette.mossLight, palette.bgDeep],
    accent: palette.mossDeep,
    silhouette: 'tall',
  },
  serum: {
    gradient: [palette.clayPaper, palette.sandPaper],
    accent: palette.clay,
    silhouette: 'dropper',
  },
  moisturizer: {
    gradient: [palette.sandPaper, palette.bgDeep],
    accent: palette.amber,
    silhouette: 'jar',
  },
  spf: {
    gradient: [palette.sandPaper, palette.clayPaper],
    accent: palette.amber,
    silhouette: 'tube',
  },
  treatment: {
    gradient: [palette.bgDeep, palette.clayPaper],
    accent: palette.clayDeep,
    silhouette: 'spot',
  },
  mask: {
    gradient: [palette.mossLight, palette.bgDeep],
    accent: palette.mossDeep,
    silhouette: 'mask',
  },
};

const SILHOUETTE_PATHS: Record<CategoryRecipe['silhouette'], string> = {
  // Cleanser pump bottle: cylinder + dispenser collar + nozzle.
  pump:
    'M 26 2 L 34 2 L 34 8 L 36 10 L 36 16 L 24 16 L 24 10 L 26 8 Z ' +
    'M 22 18 L 38 18 L 40 22 L 40 78 Q 40 82 36 82 L 24 82 Q 20 82 20 78 L 20 22 Z',
  // Dropper bottle: cap + neck + bulbous body.
  dropper:
    'M 24 2 L 36 2 L 36 14 L 38 18 L 38 24 L 22 24 L 22 18 L 24 14 Z ' +
    'M 18 26 L 42 26 L 42 76 Q 42 82 36 82 L 24 82 Q 18 82 18 76 Z',
  // Jar: low wide cylinder with thick lid.
  jar:
    'M 14 18 L 46 18 L 46 30 L 14 30 Z ' +
    'M 16 32 L 44 32 L 44 78 Q 44 82 40 82 L 20 82 Q 16 82 16 78 Z',
  // Tube: rounded shoulders, flat base.
  tube:
    'M 28 2 L 32 2 L 32 8 L 36 10 L 36 14 L 24 14 L 24 10 L 28 8 Z ' +
    'M 18 18 Q 18 14 22 14 L 38 14 Q 42 14 42 18 L 42 80 Q 42 82 40 82 L 20 82 Q 18 82 18 80 Z',
  // Tall slim bottle: narrow body, defined shoulder.
  tall:
    'M 26 2 L 34 2 L 34 12 L 36 16 L 36 22 L 24 22 L 24 16 L 26 12 Z ' +
    'M 22 24 L 38 24 L 40 28 L 40 78 Q 40 82 36 82 L 24 82 Q 20 82 20 78 L 20 28 Z',
  // Spot-treatment small dropper: short body + dropper.
  spot:
    'M 26 2 L 34 2 L 34 12 L 36 16 L 36 20 L 24 20 L 24 16 L 26 12 Z ' +
    'M 22 24 L 38 24 L 38 70 Q 38 78 32 78 L 28 78 Q 22 78 22 70 Z',
  // Mask jar: square-ish wide jar with a clear lid line.
  mask:
    'M 12 14 L 48 14 L 48 24 L 12 24 Z ' +
    'M 14 26 L 46 26 L 46 78 Q 46 82 42 82 L 18 82 Q 14 82 14 78 Z',
};

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface ProductPlaceholderImageProps {
  product: Pick<Product, 'brand' | 'category' | 'name'>;
  /** Render the brand wordmark band under the silhouette. */
  showBrandWord?: boolean;
  /** Render the product name as a second line under the brand wordmark.
   *  Use on the detail hero, not on grid cards (too cluttered there). */
  showProductName?: boolean;
  /** Visual silhouette size; auto-scales label font sizes. */
  silhouetteSize?: number;
}

export function ProductPlaceholderImage({
  product,
  showBrandWord = true,
  showProductName = false,
  silhouetteSize = 84,
}: ProductPlaceholderImageProps) {
  const recipe = CATEGORY[product.category];
  const path = SILHOUETTE_PATHS[recipe.silhouette];
  const gradientId = React.useMemo(
    () => `pp-${Math.round(Math.random() * 1e6)}`,
    []
  );

  const brand = brandShort(product.brand);
  const productName = product.name;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={recipe.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle radial highlight at top-center — gives the tile depth
          so it reads as "lit product shot" not "flat colour block". */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="32%" r="60%">
            <Stop offset="0" stopColor={palette.bg} stopOpacity={0.32} />
            <Stop offset="0.55" stopColor={palette.bg} stopOpacity={0.06} />
            <Stop offset="1" stopColor={palette.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#${gradientId})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Svg
          width={silhouetteSize}
          height={silhouetteSize * 1.4}
          viewBox="0 0 60 84"
        >
          <Path d={path} fill={recipe.accent} opacity={0.22} />
        </Svg>
        {showBrandWord || showProductName ? (
          <View style={styles.labels}>
            {showBrandWord ? (
              <Text
                style={[
                  styles.brandWord,
                  {
                    color: recipe.accent,
                    fontSize: Math.max(8, Math.round(silhouetteSize * 0.11)),
                  },
                ]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {brand}
              </Text>
            ) : null}
            {showProductName ? (
              <Text
                style={[
                  styles.productName,
                  { fontSize: Math.max(11, Math.round(silhouetteSize * 0.16)) },
                ]}
                numberOfLines={2}
                allowFontScaling={false}
              >
                {productName}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function brandShort(brand: string): string {
  return brand
    .replace(/[‘’']/g, '')
    .toUpperCase()
    .trim()
    .slice(0, 16);
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  labels: {
    marginTop: 10,
    alignItems: 'center',
    gap: 4,
  },
  brandWord: {
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  productName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    color: palette.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: undefined, // let RN auto-fit
  },
});
