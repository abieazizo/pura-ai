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

import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  clamp,
  runOnJS,
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
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Check, ArrowsLeftRight, X } from 'phosphor-react-native';

import {
  dsElevation,
  warning,
  neutral,
  puraShop,
  puraShopHome,
  puraShopRadius,
  puraShopSpace,
  puraShopType,
  tnum,
} from '@/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { shopHomeMotion } from '../shopHomeTokens';
import type { StackCard } from '../shopStackModel';
import { MatchOrb } from './MatchOrb';
import { AddButton } from './AddButton';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = puraShopSpace.xl; // 20

// ---------------------------------------------------------------------------
// Cycle-10 color harmonization (component-local, derived from the design
// system — no new brand hue introduced).
//
// SPLURGE ROUTE: the legacy splurge tint was a one-off amethyst
// (`puraShopHome.splurgeTint/Ink`) — a violet that fought the locked
// porcelain/ink/blue DNA and agreed with nothing else on the surface. We
// re-point the "invest / premium" route to the shared WARNING (amber) ramp,
// so it now harmonizes with the amber rating star and reads as a coherent
// "spend more" signal beside the green BUDGET route (success ramp). Budget
// keeps its existing green tokens, which already come from the success ramp.
const ROUTE = {
  splurgeTint: warning.tint,
  splurgeInk: warning.text,
} as const;

// CARD SURFACE: a near-white vertical wash (luminous porcelain top → a hair
// cooler at the foot, from the neutral ramp) so a resting card carries
// color-based depth, not shadow alone — the fix for "white card on white
// field" flatness. Kept extremely subtle so the surface still reads as clean
// ivory.
const CARD_FIELD = [puraShopHome.white, neutral[50]] as [string, string];
// A soft ink scrim that grounds the price/footer zone against the field.
const FOOTER_SCRIM = ['rgba(8,22,56,0)', 'rgba(8,22,56,0.035)'] as [
  string,
  string,
];

export interface StackCardViewProps {
  card: StackCard;
  /** Card width. Defaults to the screen width minus the home gutter. */
  width?: number;
  /** Stack depth (0 = resting top). Drives the per-card lift shadow. */
  depth?: number;
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
  depth = 0,
  animate = true,
  onPressProduct,
  onToggleSave,
  onAdd,
  endActions,
}: StackCardViewProps) {
  const reduceMotion = useReduceMotion();

  // Per-depth lift: the resting top card genuinely FLOATS (e3); peek cards
  // recede to a hairline (e1) so picking the deck up has real parallax —
  // the fix for the "white card on a white screen" flatness.
  const liftShadow = depth <= 0 ? dsElevation.e3 : depth === 1 ? dsElevation.e1 : dsElevation.e0;

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

  // ----- Side-by-side comparison (budget / splurge cards vs the pick). -----
  // A budget / splurge card carries `compareTo` — the pick it's priced against.
  // Tapping the compare chip flips the card's face to a side-by-side: the pick
  // and this product weighed together, with each price and the delta on the
  // divider between them. A tap anywhere on the panel closes it. The horizontal
  // swipe axis belongs to the deck (KEEP / SKIP), so the comparison is a tap —
  // never a competing drag — and the reveal is motion-gated.
  const [comparing, setComparing] = useState(false);
  // The panel is an opaque, full-card overlay. Keep it OUT of the tree unless
  // it is open or animating closed: an always-mounted invisible overlay can
  // intercept taps meant for the card beneath it (on web a child <button>'s
  // pointer-events can defeat the wrapper's `none`), which would steal the very
  // compare chip that opens it. Mount on open; unmount once the close settles.
  const [panelMounted, setPanelMounted] = useState(false);
  const compareV = useSharedValue(0);
  useEffect(() => {
    if (comparing) {
      setPanelMounted(true);
      compareV.value = reduceMotion
        ? 1
        : withSpring(1, { damping: 19, stiffness: 240, mass: 0.8 });
    } else if (reduceMotion) {
      compareV.value = 0;
      setPanelMounted(false);
    } else {
      compareV.value = withTiming(
        0,
        { duration: 180, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(setPanelMounted)(false);
        },
      );
    }
  }, [comparing, reduceMotion, compareV]);
  const comparePanelStyle = useAnimatedStyle(() => ({
    opacity: compareV.value,
    transform: [
      { translateY: (1 - compareV.value) * 16 },
      { scale: 0.97 + 0.03 * compareV.value },
    ],
  }));

  // ----- Terminal card (no product, hosts the escape hatches). -----
  if (card.type === 'end' || !card.product) {
    return (
      <View style={[styles.card, liftShadow, styles.endCard, { width }]}>
        {/* Same porcelain luminosity as the product cards so the deck's
            sign-off closes on a card with tone-depth, not a flat white slab. */}
        <LinearGradient
          colors={CARD_FIELD}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
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
    <Animated.View style={[styles.card, liftShadow, { width }, pressStyle]}>
      {/* Surface luminosity — a near-white porcelain wash gives the card
          color-based depth so it lifts off the field by tone, not shadow
          alone. Behind all content; clipped by the card's rounded overflow. */}
      <LinearGradient
        colors={CARD_FIELD}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Footer scrim — a faint ink gather at the foot so the price + add zone
          reads as grounded weight, not floating type on white. */}
      <LinearGradient
        colors={FOOTER_SCRIM}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0.72 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header — editorial eyebrow + save heart. */}
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          {/* The pillar accent now PUNCTUATES through the tick alone — the
              eyebrow text reads in ink so the blue (the dominant "treat"
              pillar's #147CFF) no longer repeats as a full coloured run on
              every card. The accent re-earns attention at the match orb and
              the save state instead of flooding the header. */}
          <View style={[styles.eyebrowTick, { backgroundColor: accent }]} />
          <Text style={styles.eyebrow} numberOfLines={1}>
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
                {/* Richer four-stop falloff (was 3) — a brighter concentrated
                    core that eases through a soft mid-bloom to nothing, so the
                    product sits in a luminous pool of its pillar's atmosphere
                    rather than on a flat tinted disc. */}
                <Stop offset="0%" stopColor={halo} stopOpacity={1} />
                <Stop offset="34%" stopColor={halo} stopOpacity={0.78} />
                <Stop offset="66%" stopColor={halo} stopOpacity={0.42} />
                <Stop offset="100%" stopColor={halo} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={zoneH} fill="url(#halo)" />
            {/* Two-layer contact shadow — a wide soft pool + a tighter core —
                so the floating product reads as grounded still-life, not a
                sticker on a flat ellipse. */}
            <Ellipse
              cx={width / 2}
              cy={zoneH - 16}
              rx={imgW * 0.46}
              ry={13}
              fill={puraShopHome.ink}
              opacity={0.05}
            />
            <Ellipse
              cx={width / 2}
              cy={zoneH - 16}
              rx={imgW * 0.3}
              ry={7}
              fill={puraShopHome.ink}
              opacity={0.09}
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
        </View>
      </Pressable>

      {/* Compare chip — a sibling Pressable (never nested in the open zone), so
          the web build keeps every tap target a separate <button>. Tapping it
          flips the card face to the side-by-side panel below. */}
      {compare ? (
        <Pressable
          style={styles.compareChipWrap}
          onPress={() => {
            hapt.select();
            setComparing(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Compare ${productLabel} with the ${compare.shortName}`}
          accessibilityHint="Opens a side-by-side price comparison"
        >
          <View
            style={[
              styles.comparePill,
              {
                backgroundColor: compareLess
                  ? puraShopHome.budgetTint
                  : ROUTE.splurgeTint,
              },
            ]}
          >
            <ArrowsLeftRight
              size={13}
              weight="bold"
              color={compareLess ? puraShopHome.budgetInk : ROUTE.splurgeInk}
            />
            <Text
              style={[
                styles.compareText,
                {
                  color: compareLess
                    ? puraShopHome.budgetInk
                    : ROUTE.splurgeInk,
                },
              ]}
              numberOfLines={1}
            >
              {compareLess ? '−' : '+'}
              {formatPrice(Math.abs(compare.priceDelta))} vs {compare.shortName}
            </Text>
          </View>
        </Pressable>
      ) : null}

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

      {/* Side-by-side comparison — the card's alternate face. Absolute over the
          whole (clipped, rounded) card; opaque card surface so nothing ghosts
          through. A single Pressable IS the close target (no nested buttons). */}
      {compare && panelMounted ? (
        <Animated.View
          pointerEvents={comparing ? 'auto' : 'none'}
          style={[styles.comparePanel, comparePanelStyle]}
        >
          <Pressable
            style={styles.comparePanelInner}
            onPress={() => setComparing(false)}
            accessibilityRole="button"
            accessibilityLabel="Close comparison"
          >
            <View style={styles.compareHead}>
              <Text style={styles.compareEyebrow}>
                {compareLess ? 'SAME STEP · LESS' : 'SAME STEP · MORE'}
              </Text>
              <View style={styles.compareClose}>
                <X size={14} weight="bold" color={puraShopHome.quietInk} />
              </View>
            </View>

            <View style={styles.compareCols}>
              {/* The anchor — the pick I recommended above. */}
              <CompareCol
                roleLabel="I RECOMMENDED"
                brand={compare.brand}
                name={compare.shortName}
                price={compare.price}
                packshot={compare.packshot}
                halo={halo}
              />

              {/* Divider carrying the price delta. */}
              <View style={styles.compareDivider}>
                <View style={styles.compareDividerLine} />
                <View
                  style={[
                    styles.compareDeltaBadge,
                    {
                      backgroundColor: compareLess
                        ? puraShopHome.budgetInk
                        : ROUTE.splurgeInk,
                    },
                  ]}
                >
                  <Text style={styles.compareDeltaText}>
                    {compareLess ? '−' : '+'}
                    {formatPrice(Math.abs(compare.priceDelta))}
                  </Text>
                </View>
                <View style={styles.compareDividerLine} />
              </View>

              {/* This card — the alternative being weighed. */}
              <CompareCol
                roleLabel={compareLess ? 'BUDGET PICK' : 'THE UPGRADE'}
                brand={p.brand}
                name={p.shortName ?? p.name}
                price={p.price}
                packshot={p.catalogPackshot}
                halo={halo}
                emphasisColor={
                  compareLess ? puraShopHome.budgetInk : ROUTE.splurgeInk
                }
              />
            </View>

            <Text style={styles.compareFoot}>
              {compareLess
                ? `${formatPrice(Math.abs(compare.priceDelta))} less than the ${compare.shortName}. Same step in your routine.`
                : `${formatPrice(Math.abs(compare.priceDelta))} more than the ${compare.shortName}. Same step — if you'd rather invest here.`}
            </Text>

            <Text style={styles.compareDismiss}>TAP TO CLOSE</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

// One column of the side-by-side comparison: a haloed packshot over brand,
// name, and price. The alternative column tints its price with the route
// accent (green for budget, amethyst for splurge); the anchor stays ink.
function CompareCol({
  roleLabel,
  brand,
  name,
  price,
  packshot,
  halo,
  emphasisColor,
}: {
  roleLabel: string;
  brand: string;
  name: string;
  price: number;
  packshot: ImageSourcePropType;
  halo: string;
  emphasisColor?: string;
}) {
  return (
    <View style={styles.compareCol}>
      <Text style={styles.compareRole} numberOfLines={1}>
        {roleLabel}
      </Text>
      <View style={styles.compareImgWrap}>
        <View style={[styles.compareHalo, { backgroundColor: halo }]} />
        <Image
          source={packshot}
          style={styles.compareImg}
          resizeMode="contain"
          accessibilityLabel={`${brand} ${name}`}
        />
      </View>
      <Text style={styles.compareBrand} numberOfLines={1}>
        {brand.toUpperCase()}
      </Text>
      <Text style={styles.compareName} numberOfLines={2}>
        {name}
      </Text>
      <Text
        style={[styles.comparePrice, emphasisColor ? { color: emphasisColor } : null]}
      >
        {formatPrice(price)}
      </Text>
    </View>
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
    // Lift shadow is applied per-depth at the call site (liftShadow) so the
    // top card floats and the peek cards recede — see StackCardView.
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
    // Tracked uppercase eyebrow — wider positive tracking reads as a deliberate
    // editorial kicker, not a cramped tag. Inked (not pillar-accent) so the
    // blue stops flooding the header; the coloured tick beside it carries the
    // pillar signal. Strong ink keeps it AA over the porcelain card.
    ...puraShopType.tagLabel,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: puraShop.inkSecondary,
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
    // Tracked uppercase brand line — sits as a quiet eyebrow above the serif.
    ...puraShopType.brand,
    letterSpacing: 1.3,
    color: puraShopHome.quietInk,
    marginBottom: 5,
  },
  name: {
    // Hero product name — the editorial display moment of the card. Sized up
    // and tracked tighter than the legacy token so the serif lands with
    // confidence instead of reading timid.
    ...puraShopType.heroProductSerif,
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: -0.8,
    color: puraShopHome.ink,
    marginBottom: 9,
  },
  reason: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: -0.1,
    color: puraShop.inkSecondary,
  },
  compareChipWrap: {
    paddingHorizontal: H_PAD,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  comparePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  compareText: {
    // Carries a price delta — tabular figures so the digit can't jitter the
    // chip width as it animates in.
    ...tnum,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // ----- Side-by-side comparison panel (the card's alternate face) -----
  comparePanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: puraShopHome.cardSurface,
  },
  comparePanelInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: puraShopSpace.lg,
    paddingBottom: puraShopSpace.lg,
    justifyContent: 'center',
  },
  compareHead: {
    position: 'absolute',
    top: puraShopSpace.lg,
    left: H_PAD,
    right: H_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareEyebrow: {
    ...puraShopType.tagLabel,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
  },
  compareClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: puraShopHome.canvasDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareCols: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  compareRole: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
    marginBottom: 8,
  },
  compareImgWrap: {
    width: 100,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  compareHalo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  compareImg: {
    width: 80,
    height: 94,
  },
  compareBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
    marginBottom: 3,
    textAlign: 'center',
  },
  compareName: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 17,
    color: puraShopHome.ink,
    textAlign: 'center',
    marginBottom: 7,
    paddingHorizontal: 4,
  },
  comparePrice: {
    ...tnum,
    fontFamily: 'Inter-Bold',
    fontSize: 16.5,
    letterSpacing: -0.3,
    color: puraShopHome.ink,
  },
  compareDivider: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareDividerLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: puraShopHome.hairline,
  },
  compareDeltaBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    marginVertical: 6,
  },
  compareDeltaText: {
    // The delta badge on the divider — tabular figures keep the ± amount
    // optically centered in its pill.
    ...tnum,
    fontFamily: 'Inter-Bold',
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: puraShopHome.white,
  },
  compareFoot: {
    // Leads with a price figure — tabular so it doesn't shimmy against the
    // surrounding sentence.
    ...tnum,
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: -0.05,
    color: puraShop.inkSecondary,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 6,
  },
  compareDismiss: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: puraShopHome.quietInk,
    textAlign: 'center',
    marginTop: 12,
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
    // Primary price figure — sized up a touch and tracked tighter so it lands
    // as the footer's confident data moment. Tabular figures (shared tnum) keep
    // the digits column-aligned and jitter-free.
    ...puraShopType.priceLarge,
    ...tnum,
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: -0.4,
    color: puraShopHome.ink,
  },
  priceWas: {
    ...puraShopType.price,
    ...tnum,
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
    letterSpacing: 0.3,
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
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: puraShopHome.quietInk,
    textAlign: 'center',
    marginBottom: 16,
  },
  endReason: {
    // Terminal-card sign-off — a confident editorial serif moment to close the
    // deck. Larger and tracked tighter than before so it reads as a statement.
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 29,
    lineHeight: 33,
    letterSpacing: -0.7,
    color: puraShopHome.ink,
    textAlign: 'center',
  },
  endActions: {
    marginTop: 26,
    width: '100%',
  },
});
