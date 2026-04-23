import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartStraight, Drop as DropIcon } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import type { Product, ProductTint } from '@/types';

export interface ProductCardHorizontalProps {
  product: Product;
  /** Only true on the "Best for you" row — match badge renders. */
  showMatch?: boolean;
  /** Override width (used by SearchResults grid). Default 164. */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * ProductCardHorizontal — v9.6 premium catalog card.
 *
 * Previous versions (v7.6 → v9.5) shipped a BottleSilhouette on a flat
 * tinted paper square. Out of step with every other v9 surface. This
 * rewrite aligns the card with the rest of the app:
 *
 *   • Top region: 154pt-tall image area with a subtle tint-gradient
 *     backdrop and a 1pt hairline border so the card reads as a framed
 *     object, not a colored block.
 *   • If the product has an `imageUri`, the actual image fills the area.
 *     If not, a Drop glyph renders at 36pt, low-opacity, centered — same
 *     placeholder the brand uses everywhere else.
 *   • Heart pinned top-left in a paper-bg circle. Taps save to wishlist.
 *   • Match badge pinned top-right as a moss-green capsule (same treatment
 *     as the Plan page best-product overlay) — the match signal is now
 *     visually consistent across the app.
 *   • Bottom region: 94pt-tall text block with brand / name / price. Name
 *     is set in Instrument Serif SemiBold to feel premium, not utility.
 *
 * Tap: selection haptic, press-scale bloom, navigate to ProductDetail
 * carrying the product's tint so the hero matches.
 */

const TINT_MAP: Record<ProductTint, { from: string; to: string }> = {
  sand: { from: '#F4F7FC', to: '#E9EEF7' },
  clay: { from: '#F1F5FD', to: '#E2EBF9' },
  moss: { from: '#EDF3EF', to: '#DCE8E0' },
};

const CARD_W = 164;
const CARD_H = 252;
const IMAGE_H = 158;

export function ProductCardHorizontal({
  product,
  showMatch,
  width = CARD_W,
  style,
}: ProductCardHorizontalProps) {
  const nav = useNavigation<any>();
  const scale = useSharedValue(1);
  const isSaved = useAppStore((s) => s.wishlist.includes(product.id));
  const toggleSave = useAppStore((s) => s.toggleWishlist);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const openDetail = () => {
    hapt.select();
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1, { damping: 20, stiffness: 200 })
    );
    nav.navigate('ProductDetail', {
      productId: product.id,
      tint: product.tint,
    });
  };

  const onHeartPress = () => {
    hapt.select();
    toggleSave(product.id);
  };

  const tint = TINT_MAP[product.tint] ?? TINT_MAP.sand;
  const showPill = !!showMatch && product.matchScore >= 80;

  const priceDisplay = Number.isInteger(product.price)
    ? `$${product.price}`
    : `$${product.price.toFixed(2)}`;

  return (
    <Animated.View style={[styles.card, { width, height: CARD_H }, animated, style]}>
      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}, ${priceDisplay}`}
        style={styles.pressable}
      >
        {/* IMAGE AREA ------------------------------------------------- */}
        <View style={styles.imageArea}>
          <LinearGradient
            colors={[tint.from, tint.to]}
            style={StyleSheet.absoluteFillObject}
          />
          {product.imageUri ? (
            <Image
              source={{ uri: product.imageUri }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.fallbackWrap} pointerEvents="none">
              <DropIcon
                size={36}
                color={palette.ink}
                weight="duotone"
                style={{ opacity: 0.32 }}
              />
            </View>
          )}

          {/* Heart — top-left */}
          <Pressable
            onPress={onHeartPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save product'}
            style={({ pressed }) => [
              styles.heartButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
          >
            <HeartStraight
              size={14}
              weight={isSaved ? 'fill' : 'duotone'}
              color={isSaved ? palette.clay : palette.ink}
            />
          </Pressable>

          {/* Match badge — top-right, moss-green premium pill */}
          {showPill ? (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeNum} maxFontSizeMultiplier={1.1}>
                {product.matchScore}%
              </Text>
              <Text style={styles.matchBadgeLabel} maxFontSizeMultiplier={1.1}>
                MATCH
              </Text>
            </View>
          ) : null}

          {/* Hairline along the bottom of the image region — reads as the
              seam between image and copy. */}
          <View style={styles.imageSeam} pointerEvents="none" />
        </View>

        {/* TEXT AREA -------------------------------------------------- */}
        <View style={styles.textArea}>
          <Text style={styles.brand} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {product.brand.toUpperCase()}
          </Text>
          <Text
            style={styles.productName}
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
          >
            {product.name}
          </Text>
          <Text style={styles.price} maxFontSizeMultiplier={1.1}>
            {priceDisplay}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  pressable: {
    flex: 1,
  },

  // IMAGE AREA
  imageArea: {
    height: IMAGE_H,
    position: 'relative',
    overflow: 'hidden',
  },
  fallbackWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(248,250,252,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: palette.moss,
    alignItems: 'center',
  },
  matchBadgeNum: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 14,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
  matchBadgeLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    lineHeight: 9,
    letterSpacing: 1.0,
    color: 'rgba(248,250,252,0.80)',
    marginTop: 1,
  },
  imageSeam: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.hairline,
  },

  // TEXT AREA
  textArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  productName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: -0.2,
    color: palette.ink,
    flex: 1,
  },
  price: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 15,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
    marginTop: 4,
  },
});
