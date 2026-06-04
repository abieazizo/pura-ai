/**
 * StackCard — the core editorial recommendation card for the Pura Shop home
 * feed. This is the centerpiece the swipeable stack (Step 2) is built around:
 * one product floating on its routine pillar's atmospheric halo, with the
 * consultant's reason for surfacing it tonight.
 *
 * It renders ONE `StackCard` value from the model (`shopStackModel.ts`) and
 * reads no store, no raw AI output — every string, score, and price framing is
 * already resolved upstream. The match % only appears when personalization is
 * real (`hasRealPersonalization`), so the card never fakes precision.
 *
 * Motion: the floating product breathes (a slow scale + vertical drift on a
 * sine loop), gated by `useReduceMotion()` AND by `animate` so only the resting
 * top card of the stack breathes. The MatchOrb carries its own independent
 * breath. A restrained press-scale acknowledges taps into the product detail.
 */

import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { Heart, Check } from 'phosphor-react-native';

import {
  puraShop,
  puraShopHome,
  puraShopRadius,
  puraShopShadow,
  puraShopSpace,
  puraShopType,
} from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { shopHomeMotion } from '../shopHomeTokens';
import type { StackCard } from '../shopStackModel';
import { MatchOrb } from './MatchOrb';
import { AddButton } from './AddButton';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = puraShopSpace.xl; // 20

export interface StackCardViewProps {
  card: StackCard;
  /** Card width. Defaults to the screen width minus the home gutter. */
  width?: number;
  /** Only the resting top card breathes; deeper / off-screen cards pass false. */
  animate?: boolean;
  onPressProduct?: (productId: string) => void;
  onToggleSave?: (productId: string) => void;
  onAdd?: (productId: string) => void;
  /** Terminal-card escape hatches, supplied by the screen in a later step. */
  endActions?: React.ReactNode;
}

export function StackCardView({
  card,
  width = SCREEN_W - puraShopSpace.gutter * 2,
  animate = true,
  onPressProduct,
  onToggleSave,
  onAdd,
  endActions,
}: StackCardViewProps) {
  const reduceMotion = useReduceMotion();

  // ----- Breathing float (top card only, motion-gated). -----
  const breath = useSharedValue(0);
  useEffect(() => {
    if (animate && !reduceMotion) {
      breath.value = withRepeat(
        withTiming(1, {
          duration: shopHomeMotion.breathePeriodMs,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 220 });
    }
    return () => cancelAnimation(breath);
  }, [animate, reduceMotion, breath]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -breath.value * shopHomeMotion.breatheDriftPx },
      { scale: 1 + breath.value * shopHomeMotion.breatheScale },
    ],
  }));

  // ----- Press feedback on the card body. -----
  const press = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * (reduceMotion ? 0 : 0.014) }],
  }));
  const onPressIn = () => {
    press.value = withTiming(1, { duration: 120 });
  };
  const onPressOut = () => {
    press.value = withSpring(0, { damping: 18, stiffness: 280 });
  };

  // ----- Post-add inline transformation (routine commitment). -----
  // On the moment a product joins tonight's routine, the footer action zone
  // morphs from the "+" add affordance into a committed "in routine" pill, and
  // a soft success wash blooms across the card. The committed state is derived
  // purely from `card.isInRoutine` (re-derivable, no local truth); the wash and
  // pill entrance are one-time motion, gated by `useReduceMotion()`.
  const inRoutine = card.isInRoutine ?? false;
  const routineV = useSharedValue(inRoutine ? 1 : 0);
  const addWash = useSharedValue(0);
  const prevInRoutine = useRef(inRoutine);
  useEffect(() => {
    const was = prevInRoutine.current;
    if (was !== inRoutine) {
      routineV.value = reduceMotion
        ? inRoutine
          ? 1
          : 0
        : inRoutine
          ? withSpring(1, { damping: 15, stiffness: 320, mass: 0.7 })
          : withTiming(0, { duration: 200 });
      if (!was && inRoutine && !reduceMotion) {
        addWash.value = withSequence(
          withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 460, easing: Easing.in(Easing.quad) }),
        );
      }
    }
    prevInRoutine.current = inRoutine;
  }, [inRoutine, reduceMotion, routineV, addWash]);

  const washStyle = useAnimatedStyle(() => ({ opacity: addWash.value }));
  const addedPillStyle = useAnimatedStyle(() => {
    const v = clamp(routineV.value, 0, 1);
    return { opacity: v, transform: [{ scale: 0.85 + 0.15 * v }] };
  });

  // ----- Terminal card (no product, hosts the escape hatches). -----
  if (card.type === 'end' || !card.product) {
    return (
      <View style={[styles.card, styles.endCard, { width }]}>
        <View style={[styles.eyebrowTick, styles.endTick]} />
        <Text style={styles.endEyebrow}>{card.eyebrow}</Text>
        <Text style={styles.endReason}>{card.reason}</Text>
        {endActions ? <View style={styles.endActions}>{endActions}</View> : null}
      </View>
    );
  }

  const p = card.product;
  const theme = card.pillarTheme;
  const accent = theme?.accent ?? puraShopHome.ink;
  const halo = theme?.halo ?? puraShopHome.treatHalo;

  const zoneH = Math.round(width * 0.78);
  const imgW = Math.round(width * 0.6);
  const imgH = Math.round(zoneH * 0.84);

  const showOrb = card.hasRealPersonalization && card.matchPercent != null;
  const productLabel = `${p.brand} ${p.shortName ?? p.name}`;

  const compare = card.compareTo;
  const compareLess = compare ? compare.priceDelta < 0 : false;

  // The card hosts three independent tap targets (open detail / save / add).
  // They are kept as SIBLINGS — never nested — so the web build never emits a
  // <button> inside a <button> (RN Pressable → <button> on react-native-web).
  return (
    <Animated.View style={[styles.card, { width }, pressStyle]}>
      {/* Header — editorial eyebrow + save heart. */}
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={[styles.eyebrowTick, { backgroundColor: accent }]} />
          <Text style={[styles.eyebrow, { color: accent }]} numberOfLines={1}>
            {card.eyebrow}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            hapt.select();
            onToggleSave?.(p.id);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            card.isSaved
              ? `Remove ${productLabel} from saved`
              : `Save ${productLabel}`
          }
          accessibilityState={{ selected: card.isSaved }}
        >
          <Heart
            size={22}
            weight={card.isSaved ? 'fill' : 'regular'}
            color={card.isSaved ? accent : puraShopHome.quietInk}
          />
        </Pressable>
      </View>

      {/* Tap-to-open zone — the product + the consultant's reason. */}
      <Pressable
        onPress={() => onPressProduct?.(p.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${productLabel}. ${card.reason}`}
      >
        {/* The floating product on its pillar halo. */}
        <View style={[styles.zone, { width, height: zoneH }]}>
          <Svg
            width={width}
            height={zoneH}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <RadialGradient
                id="halo"
                cx="50%"
                cy="44%"
                rx="58%"
                ry="58%"
                fx="48%"
                fy="38%"
              >
                <Stop offset="0%" stopColor={halo} stopOpacity={1} />
                <Stop offset="62%" stopColor={halo} stopOpacity={0.5} />
                <Stop offset="100%" stopColor={halo} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={zoneH} fill="url(#halo)" />
            {/* Soft contact shadow that grounds the float. */}
            <Ellipse
              cx={width / 2}
              cy={zoneH - 18}
              rx={imgW * 0.4}
              ry={9}
              fill={puraShopHome.ink}
              opacity={0.07}
            />
          </Svg>

          <Animated.View
            style={[styles.imgWrap, { width: imgW, height: imgH }, floatStyle]}
          >
            <Image
              source={p.catalogPackshot}
              style={styles.img}
              resizeMode="contain"
              accessibilityLabel={productLabel}
            />
          </Animated.View>

          {showOrb ? (
            <View style={[styles.orb, { right: H_PAD }]} pointerEvents="none">
              <MatchOrb percent={card.matchPercent!} size={64} />
            </View>
          ) : null}
        </View>

        {/* Text block — brand, name, the consultant's reason. */}
        <View style={styles.body}>
          <Text style={styles.brand} numberOfLines={1}>
            {p.brand.toUpperCase()}
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {p.name}
          </Text>
          <Text style={styles.reason} numberOfLines={3}>
            {card.reason}
          </Text>

          {compare ? (
            <View
              style={[
                styles.comparePill,
                {
                  backgroundColor: compareLess
                    ? puraShopHome.budgetTint
                    : puraShopHome.splurgeTint,
                },
              ]}
            >
              <Text
                style={[
                  styles.compareText,
                  {
                    color: compareLess
                      ? puraShopHome.budgetInk
                      : puraShopHome.splurgeInk,
                  },
                ]}
                numberOfLines={1}
              >
                {compareLess ? '−' : '+'}
                {formatPrice(Math.abs(compare.priceDelta))} vs {compare.shortName}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Footer — price + add-to-routine. */}
      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(p.price)}</Text>
          {p.compareAtPrice && p.compareAtPrice > p.price ? (
            <Text style={styles.priceWas}>{formatPrice(p.compareAtPrice)}</Text>
          ) : null}
        </View>
        {inRoutine ? (
          <Animated.View
            style={[styles.addedPill, addedPillStyle]}
            accessibilityRole="text"
            accessibilityLabel={`${productLabel} is in tonight's routine`}
          >
            <Check size={15} color={puraShopHome.budgetInk} weight="bold" />
            <Text style={styles.addedPillText}>In routine</Text>
          </Animated.View>
        ) : (
          <AddButton
            size="lg"
            confirmed={false}
            productLabel={productLabel}
            onPress={() => onAdd?.(p.id)}
          />
        )}
      </View>

      {/* Success wash — blooms once over the card the instant it's added. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.addWash, washStyle]}
      />
    </Animated.View>
  );
}

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: puraShopHome.cardSurface,
    borderRadius: puraShopRadius.hero,
    borderWidth: 1,
    borderColor: puraShopHome.cardEdge,
    overflow: 'hidden',
    ...puraShopShadow.hero,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: puraShopSpace.lg,
    paddingBottom: puraShopSpace.xs,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  eyebrowTick: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginRight: 8,
  },
  eyebrow: {
    ...puraShopType.tagLabel,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flexShrink: 1,
  },

  // Product zone
  zone: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  orb: {
    position: 'absolute',
    top: puraShopSpace.md,
  },

  // Body
  body: {
    paddingHorizontal: H_PAD,
    paddingTop: puraShopSpace.md,
  },
  brand: {
    ...puraShopType.brand,
    color: puraShopHome.quietInk,
    marginBottom: 4,
  },
  name: {
    ...puraShopType.heroProductSerif,
    color: puraShopHome.ink,
    marginBottom: 8,
  },
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.1,
    color: puraShop.inkSecondary,
  },
  comparePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  compareText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: puraShopSpace.lg,
    paddingBottom: puraShopSpace.xl,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    ...puraShopType.priceLarge,
    color: puraShopHome.ink,
  },
  priceWas: {
    ...puraShopType.price,
    color: puraShopHome.quietInk,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },

  // Committed "in routine" confirmation pill (replaces the add button).
  addedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: puraShopHome.budgetTint,
  },
  addedPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: puraShopHome.budgetInk,
  },

  // Success wash bloom — clipped to the card's rounded corners (overflow
  // hidden on `card`), painted above content, fades to nothing.
  addWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: puraShopHome.saveReveal,
  },

  // Terminal card
  endCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 28,
    minHeight: 340,
  },
  endTick: {
    width: 28,
    backgroundColor: puraShopHome.quietInk,
    marginRight: 0,
    marginBottom: 18,
  },
  endEyebrow: {
    ...puraShopType.tagLabel,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
    textAlign: 'center',
    marginBottom: 14,
  },
  endReason: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: puraShopHome.ink,
    textAlign: 'center',
  },
  endActions: {
    marginTop: 26,
    width: '100%',
  },
});
