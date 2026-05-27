/**
 * ProductStage — editorial product visual stage.
 *
 * Lit warm clay/ivory pedestal with a contained product image. Uses
 * the bundled local asset where one exists, falls back to the
 * existing ProductPlaceholderImage (per-category bottle silhouette
 * + brand wordmark) when not — never initials.
 *
 * Three sizes:
 *   • hero   — full-bleed inside the hero card
 *   • detail — top of the verdict page
 *   • tile   — inside an editorial tile / honesty card
 */

import React, { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { palette } from '@/theme';
import type { Product } from '@/types';
import { localProductImageFor } from '@/data/seed';
import { ProductPlaceholderImage } from '../ProductPlaceholderImage';

export type StageSize = 'hero' | 'detail' | 'tile';

interface ProductStageProps {
  product: Pick<Product, 'id' | 'brand' | 'category' | 'name'>;
  imageUrl?: string;
  size: StageSize;
  /** Override the warm tint surface. */
  surface?: string;
  /** Override the inner round radius. */
  radius?: number;
  /** Accessible label override. */
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const STAGE_DIMENSIONS: Record<StageSize, { aspect: number; radius: number; contentWidth: string; silhouette: number }> = {
  hero: { aspect: 1.15, radius: 22, contentWidth: '70%', silhouette: 130 },
  detail: { aspect: 1.32, radius: 26, contentWidth: '70%', silhouette: 160 },
  tile: { aspect: 1.0, radius: 18, contentWidth: '78%', silhouette: 96 },
};

export function ProductStage({
  product,
  imageUrl,
  size,
  surface,
  radius,
  accessibilityLabel,
  style,
}: ProductStageProps) {
  const dims = STAGE_DIMENSIONS[size];
  const [imageErrored, setImageErrored] = useState(false);
  const localSrc = localProductImageFor(product.id);
  const useLocal = !imageErrored && !!localSrc;
  const useUrl =
    !useLocal && !imageErrored && !!imageUrl && imageUrl.trim().length > 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          aspectRatio: dims.aspect,
          borderRadius: radius ?? dims.radius,
          backgroundColor: surface ?? palette.clayPaper,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? `${product.brand} ${product.name}`}
      accessibilityRole="image"
    >
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient id={`stage-${product.id}-${size}`} cx="50%" cy="40%" r="65%">
            <Stop offset="0" stopColor={palette.bg} stopOpacity={0.5} />
            <Stop offset="0.6" stopColor={palette.bg} stopOpacity={0.12} />
            <Stop offset="1" stopColor={palette.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#stage-${product.id}-${size})`}
        />
      </Svg>

      <View style={[styles.shadowEllipse, size === 'tile' ? styles.shadowEllipseTile : null]} pointerEvents="none" />

      <View style={[styles.content, { width: dims.contentWidth as `${number}%` }]}>
        {useLocal ? (
          <Image
            source={localSrc!}
            style={styles.image}
            contentFit="contain"
            onError={() => setImageErrored(true)}
            accessibilityIgnoresInvertColors
          />
        ) : useUrl ? (
          <Image
            source={imageUrl}
            style={styles.image}
            contentFit="contain"
            onError={() => setImageErrored(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.placeholderFill}>
            <ProductPlaceholderImage
              product={product}
              showBrandWord={size !== 'tile'}
              showProductName={size === 'detail'}
              silhouetteSize={dims.silhouette}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  shadowEllipse: {
    position: 'absolute',
    bottom: '14%',
    width: '52%',
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(92, 64, 51, 0.10)',
    transform: [{ scaleY: 0.55 }],
  },
  shadowEllipseTile: {
    bottom: '12%',
    width: '60%',
    height: 10,
  },
});
