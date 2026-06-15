/**
 * Card A — a COLLECTION piece (reorder source). The product photo sits in the
 * stage, oversized and BLEEDING past the top + right edges (front plane,
 * overflow visible) with a soft contact shadow, so it reads as an object
 * resting ABOVE its card. Below: name, the step it covers, and the restock
 * control — a calm "Restock soon" pill + Reorder when (and ONLY when) the
 * restock estimate is REAL; otherwise a quiet "Reorder" link. Never fake urgency.
 *
 * Card A-Featured is the FULL-WIDTH PORTRAIT HERO: it fills the parent, the
 * photo stage takes ~62% of a fixed card height with a dramatic top + side
 * bleed, a glow pool tinted to the finding it answers pools behind it, and the
 * footer stacks (status pill + full-width Reorder). One curated still-life that
 * knows your skin — not a shelf, not a carousel piece.
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
// Featured hero — a fixed portrait card; the stage is ~62% of its height.
const HERO_H = 360;
const HERO_STAGE_H = 224;

export function CollectionCard({
  item,
  featured,
  fullWidthHero,
  tint,
  scrollY,
  onReorder,
}: {
  item: CollectionItem;
  featured?: boolean;
  /** Featured portrait hero: fills the parent, photo stage ~62% of HERO_H. */
  fullWidthHero?: boolean;
  /** The finding's tint this hero answers; falls back to brand blue. */
  tint?: string;
  scrollY: SharedValue<number>;
  onReorder: (url: string) => void;
}) {
  const { product, restock } = item;
  const W = BASE_W;
  const stageH = fullWidthHero ? HERO_STAGE_H : featured ? 196 : 150;
  const press = usePressScale(0.98);

  // FRONT PLANE — the photo drifts a touch faster than its card (bounded).
  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -Math.min(scrollY.value * motion.frontDrift, motion.frontDriftMaxPx) },
    ],
  }));

  // Featured restock is the only honest urgency signal (gated below).
  const showRestockSoon = restock.isReal && restock.restockSoon;

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
      style={[
        styles.card,
        fullWidthHero ? styles.cardHero : { width: W },
        cardElevation,
        press.style,
      ]}
    >
      <View
        style={[
          styles.stage,
          { height: stageH, overflow: 'visible' },
          fullWidthHero && styles.stageHero,
        ]}
      >
        {featured || fullWidthHero ? <GlowPool tint={tint} /> : null}
        <Animated.View style={[styles.photoWrap, photoStyle]}>
          {product.image ? (
            <Image
              source={product.image}
              resizeMode="contain"
              style={[
                styles.photo,
                fullWidthHero ? styles.photoHero : null,
                {
                  width: fullWidthHero ? '92%' : W * (featured ? 0.92 : 0.86),
                  height: stageH * (fullWidthHero ? 1.18 : 1.28), // oversized → bleeds past the top
                },
                productShadow,
              ]}
            />
          ) : (
            <PackshotFallback
              width={fullWidthHero ? 220 : W * (featured ? 0.8 : 0.74)}
              height={stageH * (fullWidthHero ? 1.0 : 1.1)}
            />
          )}
        </Animated.View>
      </View>

      <View style={[styles.body, fullWidthHero && styles.bodyHero]}>
        <Text
          style={[type.name, { fontSize: featured || fullWidthHero ? 17 : 16 }]}
          numberOfLines={2}
        >
          {product.brand} {product.name}
        </Text>
        <Text style={[type.sub, styles.stepLabel]} numberOfLines={1}>
          {product.step ? STEP_LABEL[product.step] : 'In your routine'}
        </Text>

        {fullWidthHero ? (
          // Stacked, full-width footer — status pill (only when real) above a
          // full-width Reorder. No fake urgency, one emphasis mechanism.
          <View style={styles.heroFooter}>
            {showRestockSoon ? (
              <View style={styles.restockPill}>
                <Text style={styles.restockPillText}>
                  Restock soon
                  {restock.daysLeft != null ? ` · ~${restock.daysLeft} days` : ''}
                </Text>
              </View>
            ) : null}
            <View style={styles.reorderBtnFull}>
              <Text style={[type.label, { color: edit.white }]}>Reorder</Text>
            </View>
          </View>
        ) : (
          // Non-featured — the compact row, unchanged in spirit.
          <View style={styles.restockRow}>
            {showRestockSoon ? (
              <>
                <View style={styles.restockPill}>
                  <Text style={styles.restockPillText}>Restock soon</Text>
                </View>
                <View style={styles.reorderBtn}>
                  <Text style={[type.label, { color: edit.white }]}>Reorder</Text>
                </View>
              </>
            ) : (
              <Text style={[type.label, { color: edit.blue }]}>Reorder</Text>
            )}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

/**
 * The soft glow pool behind the hero photo, tinted to the finding it answers
 * (falls back to brand blue). Static gradient — no animation, reduce-motion safe.
 */
function GlowPool({ tint }: { tint?: string }) {
  const c = tint ?? edit.blue;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="edit-glowpool" cx="50%" cy="42%" r="55%">
            <Stop offset="0%" stopColor={c} stopOpacity={0.08} />
            <Stop offset="60%" stopColor={c} stopOpacity={0.02} />
            <Stop offset="100%" stopColor={c} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#edit-glowpool)" />
      </Svg>
    </View>
  );
}

/** A calm neutral tile for the rare SKU without a packshot (no text/emoji). */
function PackshotFallback({ width, height }: { width: number; height: number }) {
  return (
    <View
      style={[
        { width, height, borderRadius: radius.tile, backgroundColor: '#EEF2F8' },
        productShadow,
      ]}
    />
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
  cardHero: {
    width: '100%',
    minHeight: HERO_H,
  },
  stage: { justifyContent: 'flex-end', alignItems: 'center' },
  stageHero: { alignItems: 'center', justifyContent: 'flex-end' },
  photoWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  photo: { marginTop: -28, marginRight: -18 }, // bleed top + right
  photoHero: { marginTop: -40, marginRight: -24 }, // dramatic portrait bleed
  body: { paddingHorizontal: space.cardPad, paddingTop: space.m },
  bodyHero: { paddingHorizontal: space.gutter, paddingTop: space.m },
  stepLabel: { marginTop: space.s, opacity: 0.7 },
  restockRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.m },
  heroFooter: { marginTop: space.m, gap: space.s },
  restockPill: {
    alignSelf: 'flex-start',
    backgroundColor: edit.blueTint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restockPillText: {
    fontFamily: type.label.fontFamily,
    fontSize: 11,
    lineHeight: 11 * 1.2,
    letterSpacing: 0.5,
    color: edit.blueTintText,
  },
  reorderBtn: {
    backgroundColor: edit.blue,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reorderBtnFull: {
    alignItems: 'center',
    backgroundColor: edit.blue,
    borderRadius: radius.pill,
    paddingVertical: 12,
  },
});
