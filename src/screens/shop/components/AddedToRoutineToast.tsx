/**
 * AddedToRoutineToast — the floating confirmation pill that drops in
 * the moment a product is added to the user's evening routine.
 *
 * v32 — optional secondary "bundle" action.
 *   When the parent supplies a `bundle` prop, the toast renders an
 *   inline "+ Complete routine (2)" pill alongside Undo. Tapping it
 *   adds the supporting products in one shot and morphs the toast
 *   copy to "Routine ready" briefly before dismissing. This is the
 *   single most conversion-critical moment in the storefront so it
 *   gets first-class treatment.
 *
 * Visual contract preserved from v31:
 *   • Floats above the dock, full-width minus screen padding.
 *   • Tiny clean packshot thumbnail on the left.
 *   • Two-line confirmation copy + actions on the right.
 *   • Springs in / lives 2.8s / springs out.
 *   • Undo removes the product from the routine and dismisses.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowCounterClockwise,
  Check,
  Plus,
} from 'phosphor-react-native';
import {
  puraShop,
  puraShopLayout,
  puraShopRadius,
  puraShopShadow,
  puraShopType,
} from '@/theme';
import type { ShopCatalogProduct } from '../shopCatalog';
import { hapt } from '@/utils/haptics';

const TOAST_LIFETIME_MS = 3400; // bumped from 2.8s — bundle CTA needs reading time
const ENTRY_DURATION_MS = 320;
const EXIT_DURATION_MS = 220;

export interface AddedToRoutineToastBundle {
  /** How many additional products will be added by the bundle CTA. */
  count: number;
  /** Click handler — should add the supporting products. */
  onAdd: () => void;
}

export interface AddedToRoutineToastProps {
  product: ShopCatalogProduct | null;
  tick: number;
  bottomOffset: number;
  /** Optional "Complete routine" CTA shown alongside Undo. */
  bundle?: AddedToRoutineToastBundle;
  onUndo: () => void;
  onDismiss: () => void;
}

export function AddedToRoutineToast({
  product,
  tick,
  bottomOffset,
  bundle,
  onUndo,
  onDismiss,
}: AddedToRoutineToastProps) {
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);
  const [bundleConfirmed, setBundleConfirmed] = useState(false);
  // Track which tick the bundleConfirmed state corresponds to, so
  // a fresh toast resets the state automatically.
  const bundleTickRef = useRef(0);

  useEffect(() => {
    if (!product) return;
    if (bundleTickRef.current !== tick) {
      setBundleConfirmed(false);
      bundleTickRef.current = tick;
    }
    translateY.value = withSpring(0, {
      damping: 22,
      stiffness: 280,
      mass: 0.85,
    });
    opacity.value = withTiming(1, { duration: ENTRY_DURATION_MS });

    const dismissAt = TOAST_LIFETIME_MS;
    opacity.value = withDelay(
      dismissAt,
      withTiming(0, {
        duration: EXIT_DURATION_MS,
        easing: Easing.in(Easing.cubic),
      }),
    );
    translateY.value = withDelay(
      dismissAt,
      withTiming(
        80,
        { duration: EXIT_DURATION_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onDismiss)();
        },
      ),
    );
  }, [product, tick, opacity, translateY, onDismiss]);

  const handleUndo = () => {
    hapt.select();
    translateY.value = withTiming(80, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
    opacity.value = withTiming(0, { duration: 160 });
    onUndo();
  };

  const handleBundle = () => {
    if (!bundle) return;
    hapt.success();
    setBundleConfirmed(true);
    bundle.onAdd();
  };

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!product) return null;

  const headLine = bundleConfirmed
    ? 'Routine ready'
    : 'Added to tonight’s routine';
  const bodyLine = bundleConfirmed
    ? `${(bundle?.count ?? 0) + 1} products added`
    : product.shortName ?? product.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { bottom: bottomOffset }]}
    >
      <Animated.View style={[styles.toast, animated]}>
        <View style={styles.thumbWrap}>
          <Image
            source={product.catalogPackshot}
            style={styles.thumb}
            resizeMode="contain"
            fadeDuration={100}
          />
        </View>

        <View style={styles.copy}>
          <View style={styles.headRow}>
            <View style={styles.checkWrap}>
              <Check size={10} color={puraShop.inkOnDark} weight="bold" />
            </View>
            <Text
              style={styles.head}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {headLine}
            </Text>
          </View>
          <Text
            style={styles.body}
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
          >
            {bodyLine}
          </Text>
        </View>

        {/* Action stack — bundle CTA (if supplied + not yet confirmed)
            then Undo. Undo always available. */}
        <View style={styles.actions}>
          {bundle && !bundleConfirmed ? (
            <Pressable
              onPress={handleBundle}
              accessibilityRole="button"
              accessibilityLabel={`Complete routine. Adds ${bundle.count} supporting products.`}
              hitSlop={4}
              style={({ pressed }) => [
                styles.bundle,
                pressed && { opacity: 0.86, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Plus size={11} color={puraShop.inkOnDark} weight="bold" />
              <Text style={styles.bundleText} maxFontSizeMultiplier={1.15}>
                {`Routine · ${bundle.count}`}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleUndo}
            accessibilityRole="button"
            accessibilityLabel="Undo. Remove from tonight's routine"
            hitSlop={6}
            style={({ pressed }) => [
              styles.undo,
              pressed && { opacity: 0.78 },
            ]}
          >
            <ArrowCounterClockwise
              size={13}
              color={puraShop.coralDeep}
              weight="bold"
            />
            <Text style={styles.undoText} maxFontSizeMultiplier={1.15}>
              Undo
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: puraShopLayout.horizontalPadding,
    zIndex: 30,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.borderWarm,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 12,
    ...puraShopShadow.hero,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: puraShop.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: '88%',
    height: '88%',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: puraShop.plusBgConfirmed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
  body: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bundle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: puraShopRadius.pricePill,
    backgroundColor: puraShop.ink,
  },
  bundleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: puraShop.inkOnDark,
    letterSpacing: -0.1,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: puraShopRadius.pricePill,
    backgroundColor: puraShop.coralSoft,
  },
  undoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: puraShop.coralDeep,
    letterSpacing: -0.1,
  },
});
