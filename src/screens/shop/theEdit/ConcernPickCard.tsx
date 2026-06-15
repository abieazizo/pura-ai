/**
 * Card B — a concern PICK, tied to one finding. LEFT: a 96px studio tile with
 * the bottle bleeding ~12px above it (contact shadow) and, BEHIND it, THE
 * FINDING ECHO — a soft breathing glow in the finding's tint (the visual thread
 * to the face). RIGHT: name · ONE why-line tied to the finding · a calibrated
 * label chip · price (+ a quiet budget-alternate link). A round add(+) fills +
 * scale 1→0.9→1 and brightens the echo. Honest labels: good match / optional /
 * "skip for now"; "less needed now" when the finding has improved.
 */

import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { hapt } from '@/utils/haptics';
import type { ConcernPick, PickLabel } from '@/screens/shop/skinShop/types';
import { EchoGlow } from './EchoGlow';
import { usePressScale } from './pressFeedback';
import { cardElevation, edit, productShadow, radius, space, type, motion } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TILE = 96;

const LABEL_TEXT: Record<PickLabel, string> = {
  good_match: 'Good match',
  optional: 'Optional',
  skippable: 'Skip for now',
};

export function ConcernPickCard({
  pick,
  reduceMotion,
  inRoutine,
  onAdd,
}: {
  pick: ConcernPick;
  reduceMotion: boolean;
  inRoutine: boolean;
  onAdd: (id: string) => void;
}) {
  const { product, echo } = pick;
  const addScale = useSharedValue(1);
  const echoBoost = useSharedValue(0);
  const press = usePressScale(0.985);

  const handleAdd = useCallback(() => {
    hapt.tap();
    onAdd(product.id);
    if (!reduceMotion) {
      addScale.value = withSequence(
        withTiming(0.9, { duration: 80, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
      );
      echoBoost.value = withSequence(
        withTiming(0.12, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withDelay(120, withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) })),
      );
    }
  }, [onAdd, product.id, reduceMotion, addScale, echoBoost]);

  const addStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));

  return (
    <AnimatedPressable
      onPress={handleAdd}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={inRoutine ? `${product.name} in your routine` : `Add ${product.name} for ${echo.label}`}
      style={[styles.card, cardElevation, press.style]}
    >
      <View pointerEvents="none" style={styles.innerTop} />

      {/* LEFT — tile + echo + bled bottle */}
      <View style={styles.tileWrap}>
        <View style={styles.echoBox}>
          <EchoGlow tint={echo.tintHex} reduceMotion={reduceMotion} boost={echoBoost} id={pick.forFindingId} />
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
        <Text style={[type.why, { marginTop: 2 }]} numberOfLines={2}>
          {pick.whyLine}
        </Text>
        {pick.lessNeededNow ? (
          <Text style={[type.sub, { marginTop: 2, color: edit.blueTintText }]} numberOfLines={1}>
            Less needed now — it's calmer than last scan.
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <LabelChip label={pick.label} />
          <Text style={type.price}>{product.priceUsd != null ? `$${product.priceUsd}` : ''}</Text>
        </View>

        {pick.budgetAlternative ? (
          <Text style={[type.sub, { marginTop: space.xs }]} numberOfLines={1}>
            or a budget pick · ${pick.budgetAlternative.priceUsd}
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
  },
  innerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: 'rgba(255,255,255,0.5)',
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
  addGlyph: { color: edit.white, fontSize: 20, lineHeight: 22, fontFamily: 'Inter-Regular' },
});
