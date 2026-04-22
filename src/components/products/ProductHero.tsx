import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { ProductTint } from '@/types';
import { BottleSilhouette } from './BottleSilhouette';

export interface ProductHeroProps {
  tint: ProductTint;
  imageUrl?: string;
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
export function ProductHero({ tint, imageUrl }: ProductHeroProps) {
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

  return (
    <View
      style={[styles.wrap, { backgroundColor: TINT_MAP[tint] }]}
    >
      <Animated.View style={[styles.content, contentStyle]}>
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={styles.image}
            contentFit="contain"
          />
        ) : (
          <BottleSilhouette tint={palette.ink} opacity={0.35} size={180} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 12,
    aspectRatio: 1.1,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '70%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
