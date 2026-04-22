import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { HeartStraight } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import type { Product, ProductTint } from '@/types';
import { BottleSilhouette } from './BottleSilhouette';

export interface ProductCardHorizontalProps {
  product: Product;
  /** Only true on the "Best for you" row per §2.12. */
  showMatch?: boolean;
  /** Override width (used by SearchResults grid). Default 160 per spec. */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * v7.6 catalog card (§2.8). 160×220 pill-radiused tile tinted by the
 * product's `tint` token. Warm paper variants — the saturated sand/clay/moss
 * are reserved for primary brand touches (see delivery note).
 *
 * Tap: selection haptic, press-scale bloom, then navigate to ProductDetail
 * with the card's tint passed through so the hero matches exactly (§1).
 */
const TINT_MAP: Record<ProductTint, string> = {
  sand: palette.sandPaper,
  clay: palette.clayPaper,
  moss: palette.mossLight,
};

const CARD_W = 160;
const CARD_H = 220;

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

  const tint = TINT_MAP[product.tint];
  const showPill = !!showMatch && product.matchScore >= 80;

  return (
    <Animated.View
      style={[
        styles.card,
        { width, height: CARD_H, backgroundColor: tint },
        animated,
        style,
      ]}
    >
      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}`}
        style={styles.pressable}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={onHeartPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save product'}
            style={styles.heartButton}
          >
            <HeartStraight
              size={16}
              weight={isSaved ? 'fill' : 'duotone'}
              color={isSaved ? palette.clay : 'rgba(26,22,20,0.6)'}
            />
          </Pressable>

          {showPill ? (
            <View style={styles.matchPill}>
              <Text style={styles.matchText}>{product.matchScore} match</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottleWrap}>
          <BottleSilhouette tint={palette.ink} opacity={0.15} size={60} />
        </View>

        <View style={styles.bottom}>
          <Text style={styles.brand} numberOfLines={1}>
            {product.brand.toUpperCase()}
          </Text>
          <Text
            style={styles.productName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={1.15}
          >
            {product.name}
          </Text>
          <Text style={styles.price}>${product.price}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    padding: 14,
  },
  topRow: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heartButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(250,247,244,0.9)', // paper @ 90%
    alignItems: 'center',
    justifyContent: 'center',
  },
  // v9.3 — premium green match badge. Solid moss with paper text for
  // bolder signal than the old paper-on-paper pill. Tighter corners,
  // tabular-nums so the percentage stays aligned regardless of digits.
  matchPill: {
    backgroundColor: palette.moss,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  matchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: palette.inkInverse,
    fontVariant: ['tabular-nums'],
  },
  bottleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {},
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(26,22,20,0.7)',
    marginBottom: 2,
  },
  productName: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 15,
    lineHeight: 15 * 1.15,
    color: palette.ink,
    marginBottom: 6,
  },
  price: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
});
