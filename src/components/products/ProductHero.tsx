import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { Product, ProductTint } from '@/types';
import { BottleSilhouette } from './BottleSilhouette';
import { ProductPlaceholderImage } from './ProductPlaceholderImage';

export interface ProductHeroProps {
  tint: ProductTint;
  imageUrl?: string;
  /**
   * v10.30 — when no `imageUrl` is available, the hero now renders
   * the upgraded `ProductPlaceholderImage` (per-category bottle
   * silhouette + brand wordmark + product name) instead of falling
   * through to the generic `BottleSilhouette`. Pass the full product
   * to get that richer mockup; pass nothing and the hero degrades
   * gracefully to the legacy generic silhouette.
   */
  product?: Pick<Product, 'brand' | 'category' | 'name'>;
}

const TINT_MAP: Record<ProductTint, string> = {
  sand: palette.sandPaper,
  clay: palette.clayPaper,
  moss: palette.mossLight,
};

/**
 * Product Detail hero (§3.4). Tint MUST match the card tint the user
 * tapped — passed through nav params. Image centered and sized to 70%
 * max; fallback to the shared `BottleSilhouette` if no image is present.
 *
 * Entrance: opacity 0→1 over 500ms, scale 1.04→1.0 over 600ms easeOut,
 * 100ms delay after mount.
 */
export function ProductHero({ tint, imageUrl, product }: ProductHeroProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1.04);

  useEffect(() => {
    opacity.value = withDelay(
      100,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(
      100,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [opacity, scale]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // v10.2 — luminance depth. The tile picks up a subtle radial gradient
  // from the center (paper white at ~35% opacity) fading to transparent
  // at the edges. That one addition turns a flat color block into a
  // lit product tile — the image feels staged, not laid on paper.
  const gradientId = useMemo(
    () => `product-hero-${Math.round(Math.random() * 1e6)}`,
    []
  );

  return (
    <View
      style={[styles.wrap, { backgroundColor: TINT_MAP[tint] }]}
    >
      <Svg
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id={gradientId}
            cx="50%"
            cy="42%"
            r="62%"
          >
            <Stop offset="0" stopColor={palette.bg} stopOpacity={0.35} />
            <Stop offset="0.55" stopColor={palette.bg} stopOpacity={0.08} />
            <Stop offset="1" stopColor={palette.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      <Animated.View style={[styles.content, contentStyle]}>
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={styles.image}
            contentFit="contain"
          />
        ) : product ? (
          <View style={styles.placeholderFill}>
            <ProductPlaceholderImage
              product={product}
              showBrandWord
              showProductName
              silhouetteSize={140}
            />
          </View>
        ) : (
          <BottleSilhouette tint={palette.ink} opacity={0.35} size={180} />
        )}
      </Animated.View>
    </View>
  );
}

// v10.12 — hero compressed. aspectRatio 1.1 → 1.3 (short edge down,
// wide feel preserved), marginTop 12 → 4, borderRadius 28 → 22. The
// tile stops reading as a poster and starts reading as a premium
// product shot. Saves ~90pt of vertical cost without losing luminance
// depth or the tint system.
const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 4,
    aspectRatio: 1.3,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '66%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // v10.30 — full-bleed wrap so ProductPlaceholderImage's
  // absolute-fill layout has a sized parent to render into.
  placeholderFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
