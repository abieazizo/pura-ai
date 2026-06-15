/**
 * Card A — a COLLECTION piece (reorder source). The product photo sits in the
 * top stage, oversized and BLEEDING past the top + right edges (front plane,
 * overflow visible) with a soft contact shadow, so it reads as an object
 * resting ABOVE its card. Below: name, the step it covers, and the restock
 * control — a calm "Restock soon" pill + Reorder when (and ONLY when) the
 * restock estimate is REAL; otherwise a quiet "Reorder" link. Never fake urgency.
 *
 * Card A-Featured (the one hero piece) is the same anatomy at ~1.4×, the photo
 * more dramatically bled, a soft glow pool behind it — one focal point.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import type { CollectionItem } from '@/screens/shop/skinShop/types';
import type { RoutineStepKind } from '@/commerce/types';
import { cardElevation, edit, productShadow, radius, space, type, motion } from './tokens';
import { usePressScale } from './pressFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STEP_LABEL: Record<RoutineStepKind, string> = {
  cleanse: 'Cleanse step',
  treat: 'Treat step',
  moisturize: 'Moisturize step',
  protect: 'Protect step',
};

const BASE_W = 260;

export function CollectionCard({
  item,
  featured,
  scrollY,
  onReorder,
}: {
  item: CollectionItem;
  featured?: boolean;
  scrollY: SharedValue<number>;
  onReorder: (url: string) => void;
}) {
  const { product, restock } = item;
  const W = featured ? Math.round(BASE_W * 1.4) : BASE_W;
  const stageH = featured ? 196 : 150;
  const press = usePressScale(0.98);

  // FRONT PLANE — the photo drifts a touch faster than its card (bounded).
  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -Math.min(scrollY.value * motion.frontDrift, motion.frontDriftMaxPx) },
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        hapt.select();
        onReorder(item.reorderUrl);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Reorder ${product.brand} ${product.name}`}
      style={[styles.card, { width: W }, cardElevation, press.style]}
    >
      {/* faint inner-top highlight */}
      <View pointerEvents="none" style={styles.innerTop} />

      <View style={[styles.stage, { height: stageH, overflow: 'visible' }]}>
        {featured ? <GlowPool /> : null}
        <Animated.View style={[styles.photoWrap, photoStyle]}>
          {product.image ? (
            <Image
              source={product.image}
              resizeMode="contain"
              style={[
                styles.photo,
                {
                  width: W * (featured ? 0.92 : 0.86),
                  height: stageH * 1.28, // oversized → bleeds past the top
                },
                productShadow,
              ]}
            />
          ) : (
            <PackshotFallback width={W * (featured ? 0.8 : 0.74)} height={stageH * 1.1} />
          )}
        </Animated.View>
      </View>

      <View style={styles.body}>
        <Text style={[featured ? type.name : type.name, { fontSize: featured ? 17 : 16 }]} numberOfLines={2}>
          {product.brand} {product.name}
        </Text>
        <Text style={[type.sub, { marginTop: space.xs }]} numberOfLines={1}>
          {product.step ? STEP_LABEL[product.step] : 'In your routine'}
        </Text>

        <View style={styles.restockRow}>
          {restock.isReal && restock.restockSoon ? (
            <>
              <View style={styles.restockPill}>
                <Text style={[type.label, { color: edit.blueTintText }]}>Restock soon</Text>
              </View>
              <View style={styles.reorderBtn}>
                <Text style={[type.label, { color: edit.white }]}>Reorder</Text>
              </View>
            </>
          ) : (
            <Text style={[type.label, { color: edit.blue }]}>Reorder</Text>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

function GlowPool() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="edit-glowpool" cx="50%" cy="42%" r="55%">
            <Stop offset="0%" stopColor={edit.blue} stopOpacity={0.08} />
            <Stop offset="60%" stopColor={edit.blue} stopOpacity={0.02} />
            <Stop offset="100%" stopColor={edit.blue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#edit-glowpool)" />
      </Svg>
    </View>
  );
}

/** A soft-lit studio tile for the rare SKU without a packshot (no text/emoji). */
function PackshotFallback({ width, height }: { width: number; height: number }) {
  return (
    <View style={[{ width, height, borderRadius: radius.tile, overflow: 'hidden' }, productShadow]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="edit-fallback" cx="50%" cy="34%" r="72%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="100%" stopColor="#EEF2F8" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#edit-fallback)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: edit.white,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: edit.hairline,
    paddingBottom: space.cardPad,
  },
  innerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  stage: { justifyContent: 'flex-end', alignItems: 'center' },
  photoWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  photo: { marginTop: -28, marginRight: -18 }, // bleed top + right
  body: { paddingHorizontal: space.cardPad, paddingTop: space.m },
  restockRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.m },
  restockPill: {
    backgroundColor: edit.blueTint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reorderBtn: {
    backgroundColor: edit.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
