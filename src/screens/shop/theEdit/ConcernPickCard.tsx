/**
 * Card B — a concern PICK, tied to one finding. A 2px LEFT tint-stripe in the
 * finding's color is the at-a-glance thread to the face; the echo breathes
 * inside. LEFT: a 96px studio tile with the bottle bleeding ~12px above it
 * (contact shadow) and, BEHIND it, THE FINDING ECHO — a soft glow in the
 * finding's tint. RIGHT: name · ONE why-line tinted toward the finding · a
 * calibrated label chip · price (tabular) (+ a quiet budget-alternate link with
 * a muted tier hint). A round add(+) fills + scale 1→0.9→1 and brightens the
 * echo. The whole card's prominence is graded by `fitScore` (best pick full,
 * lower picks recede). On reveal, the FIRST pick of a section blooms its echo
 * once (driven by TheEditScreen via the optional `bloom` shared value). Honest
 * labels: good match / optional / "skip for now"; "one step better" only when
 * the finding actually improved (echo.direction === 'better').
 */

import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import type { ConcernPick, PickLabel } from '@/screens/shop/skinShop/types';
import { EchoGlow } from './EchoGlow';
import { usePressScale } from './pressFeedback';
import { cardElevation, edit, priceTabular, productShadow, radius, space, type } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TILE = 96;

const LABEL_TEXT: Record<PickLabel, string> = {
  good_match: 'Good match',
  optional: 'Optional',
  skippable: 'Skip for now',
};

const PRICE_TIER_HINT: Record<NonNullable<ConcernPick['product']['priceTier']>, string> = {
  budget: 'gentle on the wallet',
  mid: 'mid-range',
  premium: 'a splurge',
};

/** Blend a hex (#RRGGBB) toward an alpha channel for an rgba() string. The one
 *  feasible helper for tinting the why-line in the finding's color at ~85%. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ConcernPickCard({
  pick,
  reduceMotion,
  inRoutine,
  onAdd,
  bloom,
}: {
  pick: ConcernPick;
  reduceMotion: boolean;
  inRoutine: boolean;
  onAdd: (id: string) => void;
  /** One-shot reveal bloom, driven by the section's onReveal in TheEditScreen
   *  (the first pick only). Combined with the add-brighten into the echo boost. */
  bloom?: SharedValue<number>;
}) {
  const { product, echo } = pick;
  const addScale = useSharedValue(1);
  const addBoost = useSharedValue(0);
  const press = usePressScale(0.985);

  // The echo's brighten channel = the add-interaction pulse + the optional
  // reveal bloom (own no recipe here; TheEditScreen runs the bloom sequence).
  const echoBoost = useDerivedValue(
    () => addBoost.value + (bloom ? bloom.value : 0),
    [bloom],
  );

  const handleAdd = useCallback(() => {
    hapt.tap();
    onAdd(product.id);
    if (!reduceMotion) {
      addScale.value = withSequence(
        withTiming(0.9, { duration: 80, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
      );
      addBoost.value = withSequence(
        withTiming(0.12, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withDelay(120, withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) })),
      );
    }
  }, [onAdd, product.id, reduceMotion, addScale, addBoost]);

  const addStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));

  // Grade prominence by fit — best pick full, weaker picks recede. No scale
  // change so tap targets stay stable; opacity only.
  const cardOpacity = 0.78 + 0.22 * Math.max(0, Math.min(1, pick.fitScore));

  // The finding's tint, used as the thread: the 2px left stripe + the why-line.
  const tint = echo.tintHex || edit.blue;
  const whyColor = withAlpha(tint, 0.85);

  const tierHint = product.priceTier ? PRICE_TIER_HINT[product.priceTier] : null;

  return (
    <AnimatedPressable
      onPress={handleAdd}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={inRoutine ? `${product.name} in your routine` : `Add ${product.name} for ${echo.label}`}
      style={[styles.card, cardElevation, { opacity: cardOpacity }, press.style]}
    >
      {/* The one visible finding-color frame — sharp left, curved right. */}
      <View pointerEvents="none" style={[styles.stripe, { backgroundColor: tint }]} />

      {/* LEFT — tile + echo + bled bottle */}
      <View style={styles.tileWrap}>
        <View style={styles.echoBox}>
          <EchoGlow tint={tint} reduceMotion={reduceMotion} boost={echoBoost} id={pick.forFindingId} />
        </View>
        <View style={styles.tile}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={`tile-${pick.forFindingId}`} cx="50%" cy="32%" r="74%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="100%" stopColor="#EFF3F9" stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#tile-${pick.forFindingId})`} />
          </Svg>
          {product.image ? (
            <Image
              source={product.image}
              resizeMode="contain"
              style={[styles.bottle, productShadow]}
            />
          ) : null}
        </View>
      </View>

      {/* RIGHT — name · why · label · price */}
      <View style={styles.body}>
        <Text style={type.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[type.why, { marginTop: 2, color: whyColor }]} numberOfLines={2}>
          {pick.whyLine}
        </Text>
        {echo.direction === 'better' ? (
          <View style={[styles.successChip, { backgroundColor: edit.successTint }]}>
            <Text style={[type.label, { color: edit.successTintText }]} numberOfLines={1}>
              One step better — calmer than last scan.
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <LabelChip label={pick.label} />
          <Text style={priceTabular}>{product.priceUsd != null ? `$${product.priceUsd}` : ''}</Text>
        </View>

        {pick.budgetAlternative ? (
          <Text style={[type.sub, { marginTop: space.xs }]} numberOfLines={1}>
            or a budget pick · ${pick.budgetAlternative.priceUsd}
            {tierHint ? <Text style={{ color: edit.muted }}>{`  ·  ${tierHint}`}</Text> : null}
          </Text>
        ) : tierHint ? (
          <Text style={[type.sub, { marginTop: space.xs, color: edit.muted }]} numberOfLines={1}>
            {tierHint}
          </Text>
        ) : null}
      </View>

      {/* add(+) — visual affordance; the whole card is the tap target */}
      <Animated.View style={[styles.addWrap, addStyle]} pointerEvents="none">
        <View style={[styles.add, inRoutine && styles.addDone]}>
          <Text style={styles.addGlyph}>{inRoutine ? '✓' : '+'}</Text>
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
}

function LabelChip({ label }: { label: PickLabel }) {
  if (label === 'good_match') {
    return (
      <View style={[styles.chip, { backgroundColor: edit.blueTint }]}>
        <Text style={[type.label, { color: edit.blueTintText }]}>{LABEL_TEXT.good_match}</Text>
      </View>
    );
  }
  if (label === 'optional') {
    return (
      <View style={[styles.chip, { backgroundColor: edit.greyTint }]}>
        <Text style={[type.label, { color: edit.muted }]}>{LABEL_TEXT.optional}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.chip, styles.chipOutline]}>
      <Text style={[type.label, { color: edit.muted }]}>{LABEL_TEXT.skippable}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: edit.white,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: edit.hairline,
    padding: space.cardPad,
    minHeight: 120,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 2,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  tileWrap: { width: TILE, height: TILE, justifyContent: 'center', alignItems: 'center' },
  echoBox: { position: 'absolute', width: TILE * 1.5, height: TILE * 1.5 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.tile,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bottle: { position: 'absolute', top: -12, width: TILE * 0.92, height: TILE * 1.04 },
  body: { flex: 1, paddingLeft: space.m, paddingRight: space.s },
  successChip: { alignSelf: 'flex-start', marginTop: space.xs, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.s },
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipOutline: { borderWidth: StyleSheet.hairlineWidth, borderColor: edit.hairlineStrong, backgroundColor: 'transparent' },
  addWrap: { position: 'absolute', top: space.m, right: space.m },
  add: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: edit.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDone: { backgroundColor: '#0E63CC' },
  addGlyph: { color: edit.white, fontSize: 22, lineHeight: 24, fontFamily: 'Inter-Regular' },
});
