/**
 * Hero Focus Card — the companion's centerpiece.
 *
 * One step, rendered large: a pillar-keyed atmospheric gradient, the
 * product photo floating in a soft coloured halo that breathes at rest,
 * an editorial serif name, the application guidance, an inline
 * "Why this?" expansion, and a single Ink "Mark as done" button.
 *
 * This file owns the *static* composition + the ambient breath. The
 * completion choreography (button fill → checkmark draws across the
 * product → card departs) and the entrance reveal are layered on by the
 * host through the optional `breathPaused` / reveal props without
 * touching this composition.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { stepTypeToPillarKey, type RoutineStep } from '@/types/routine';
import { PILLAR_IDENTITY } from '@/components/routine/pillarIdentity';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import {
  CC,
  PILLAR_ATMOSPHERE,
  companionGeo,
  companionMotion,
  companionShadows,
  companionType,
} from './companionTokens';
import { resolveRoutineProductImage } from './productImage';
import { ProductCheckmark } from './ProductCheckmark';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Eased sub-progress for one element's slice of the master reveal clock.
 * `reveal` is the 0→1 master (driven linearly by the host over ~700ms);
 * `[start, end]` is this element's window in that 0→1 space. Returns an
 * ease-out cubic 0→1 so each layer settles softly on its own beat.
 */
function revAt(reveal: number, start: number, end: number): number {
  'worklet';
  const t = (reveal - start) / (end - start);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - c) * (1 - c) * (1 - c);
}

/** Compose the 2–3 sentence "why this" body from grounded step fields. */
function whyThisCopy(step: RoutineStep): string {
  const parts: string[] = [];
  if (step.product?.whyMatched) parts.push(step.product.whyMatched.trim());
  if (step.purpose && !parts.join(' ').includes(step.purpose.trim())) {
    parts.push(step.purpose.trim());
  }
  if (step.frequency) parts.push(`Use ${step.frequency.toLowerCase()}.`);
  return parts.filter(Boolean).join(' ');
}

export interface HeroFocusCardProps {
  step: RoutineStep;
  /** 0-based index within the active list. */
  stepIndex: number;
  totalSteps: number;
  onMarkDone: () => void;
  onOpenDetail: () => void;
  /** Host pauses the ambient breath during the completion choreography. */
  breathPaused?: boolean;
  /**
   * 0→1 master reveal clock (host-owned, driven on tab focus). Each inner
   * layer reads its own window off this for the staggered entrance. When
   * omitted the card renders fully settled (used during slot swaps).
   */
  reveal?: SharedValue<number>;
}

export function HeroFocusCard({
  step,
  stepIndex,
  totalSteps,
  onMarkDone,
  onOpenDetail,
  breathPaused = false,
  reveal,
}: HeroFocusCardProps) {
  const reduceMotion = useReduceMotion();
  const { height: vh } = useWindowDimensions();
  const compact = vh < companionGeo.compactBelow;

  const pillar = stepTypeToPillarKey(step.type);
  const atmosphere = PILLAR_ATMOSPHERE[pillar];
  const identity = PILLAR_IDENTITY[pillar];

  const packshot = resolveRoutineProductImage(step.product);
  const productName = step.product?.name ?? step.title;
  const brand = step.product?.brand;
  const guidance = step.directions || step.purpose;
  const why = React.useMemo(() => whyThisCopy(step), [step]);

  const [whyOpen, setWhyOpen] = React.useState(false);

  const imageSize = compact
    ? companionGeo.productImageCompact
    : companionGeo.productImage;
  const haloSize = compact ? companionGeo.haloCompact : companionGeo.halo;

  // Completion choreography -------------------------------------------------
  // The card owns the *intrinsic* completion visuals (button fill +
  // checkmark draw + haptics + hold); the host owns the slot depart/rise
  // and only learns we're done via onMarkDone, fired at the end of hold.
  const [completing, setCompleting] = React.useState(false);
  const [draw, setDraw] = React.useState(0);
  const fill = useSharedValue(0);
  const rafRef = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Ambient breath ----------------------------------------------------------
  const breath = useSharedValue(0);
  React.useEffect(() => {
    if (reduceMotion || breathPaused || completing) {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 220 });
      return;
    }
    breath.value = withRepeat(
      withTiming(1, {
        duration: companionMotion.breathMs,
        easing: companionMotion.breath,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduceMotion, breathPaused, completing, breath]);

  const imageBreath = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.015]) }],
  }));
  const haloBreath = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.5, 0.64]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.06]) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  // Entrance reveal --------------------------------------------------------
  // One master clock (host-owned) feeds five overlapping windows so the
  // card assembles itself top-to-bottom: wash blooms from the corner,
  // product rises, name fades, brand/guidance follow, button slides up.
  const internalReveal = useSharedValue(1);
  const R = reveal ?? internalReveal;
  const washStyle = useAnimatedStyle(() => {
    const w = revAt(R.value, 0, 0.571);
    return { opacity: w, transform: [{ scale: 0.72 + 0.28 * w }] };
  });
  const productStyle = useAnimatedStyle(() => {
    const p = revAt(R.value, 0.143, 0.857);
    return { opacity: p, transform: [{ translateY: 30 * (1 - p) }] };
  });
  const nameStyle = useAnimatedStyle(() => {
    const n = revAt(R.value, 0.286, 0.714);
    return { opacity: n, transform: [{ translateY: 10 * (1 - n) }] };
  });
  const metaStyle = useAnimatedStyle(() => {
    const m = revAt(R.value, 0.429, 0.857);
    return { opacity: m, transform: [{ translateY: 8 * (1 - m) }] };
  });
  const buttonStyle = useAnimatedStyle(() => {
    const b = revAt(R.value, 0.571, 1);
    return { opacity: b, transform: [{ translateY: 16 * (1 - b) }] };
  });

  const handleMark = () => {
    if (completing) return;
    setCompleting(true);
    hapt.tap();

    // Reduce motion / static preview: resolve instantly, no draw.
    if (reduceMotion) {
      fill.value = 1;
      setDraw(1);
      hapt.success();
      onMarkDone();
      return;
    }

    // Button fills L→R (Reanimated transform — safe in Expo Go).
    fill.value = withTiming(1, {
      duration: companionMotion.fill,
      easing: companionMotion.entrance,
    });

    // One rAF timeline: fill (350) → checkmark draw (450) → hold (200).
    const FILL = companionMotion.fill;
    const DRAW = companionMotion.checkmark;
    const HOLD = 200;
    let start = 0;
    let successFired = false;

    const tick = (t: number) => {
      if (!start) start = t;
      const elapsed = t - start;
      const raw = DRAW <= 0 ? 1 : (elapsed - FILL) / DRAW;
      const p = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
      // ease in-out (matches the spec's 450ms ease-in-out draw).
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setDraw(eased);

      if (!successFired && elapsed >= FILL + DRAW) {
        successFired = true;
        hapt.success();
      }
      if (elapsed >= FILL + DRAW + HOLD) {
        rafRef.current = null;
        onMarkDone();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <View
      style={[
        styles.card,
        companionShadows.hero,
        { minHeight: compact ? companionGeo.heroHeightCompact : companionGeo.heroHeight },
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.gradient, washStyle]}>
        <LinearGradient
          colors={atmosphere.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[styles.inner, compact && styles.innerCompact]}>
        {/* Top row: STEP x OF y · Why this? */}
        <Animated.View style={[styles.topRow, nameStyle]}>
          <View style={styles.stepPill}>
            <Text style={companionType.stepPill}>
              STEP {stepIndex + 1} OF {totalSteps}
            </Text>
          </View>
          {why ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                hapt.select();
                setWhyOpen((v) => !v);
              }}
            >
              <Text style={companionType.whyLink}>
                {whyOpen ? 'Hide' : 'Why this?'}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.Text style={[companionType.pillarLabel, styles.pillarLabel, nameStyle]}>
          {identity.label}
        </Animated.Text>

        {/* Product stage — halo + breathing image. */}
        <Animated.View style={[styles.stage, { height: haloSize }, productStyle]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              haloBreath,
              {
                width: haloSize,
                height: haloSize,
                borderRadius: haloSize / 2,
                backgroundColor: atmosphere.halo,
                shadowColor: atmosphere.halo,
              },
            ]}
          />
          <AnimatedPressable
            onPress={onOpenDetail}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${productName}. Tap for details.`}
            style={[styles.imageWrap, imageBreath]}
          >
            {packshot ? (
              <Image
                source={packshot}
                style={{ width: imageSize, height: imageSize, borderRadius: 16 }}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <View
                style={[
                  styles.placeholder,
                  {
                    width: imageSize,
                    height: imageSize,
                    backgroundColor: identity.tint,
                  },
                ]}
              >
                <identity.Icon
                  size={Math.round(imageSize * 0.42)}
                  weight="regular"
                  color={identity.accent}
                />
              </View>
            )}
          </AnimatedPressable>

          {completing ? (
            <View pointerEvents="none" style={styles.checkOverlay}>
              <ProductCheckmark
                size={imageSize}
                progress={draw}
                strokeWidth={compact ? 4.5 : 5.5}
              />
            </View>
          ) : null}
        </Animated.View>

        {/* Product identity. */}
        <View style={styles.meta}>
          {brand ? (
            <Animated.Text style={[companionType.brand, metaStyle]}>
              {brand}
            </Animated.Text>
          ) : null}
          <Animated.Text style={[companionType.productName, nameStyle]} numberOfLines={2}>
            {productName}
          </Animated.Text>
          {guidance ? (
            <Animated.Text
              style={[companionType.guidance, styles.guidance, metaStyle]}
              numberOfLines={3}
            >
              {guidance}
            </Animated.Text>
          ) : null}
        </View>

        {whyOpen && why ? (
          <Animated.View
            entering={FadeIn.duration(companionMotion.whyExpand)}
            exiting={FadeOut.duration(160)}
            style={styles.whyBox}
          >
            <Text style={companionType.whyBody}>{why}</Text>
          </Animated.View>
        ) : null}

        <Animated.View style={[styles.buttonSlot, buttonStyle]}>
          <Pressable
            onPress={handleMark}
            disabled={completing}
            accessibilityRole="button"
            accessibilityLabel="Mark as done"
            style={({ pressed }) => [
              styles.button,
              companionShadows.button,
              pressed && !completing && styles.buttonPressed,
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.buttonFill, fillStyle]}
            />
            <Text style={companionType.button}>Mark as done</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: companionGeo.heroRadius,
    backgroundColor: CC.white,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: companionGeo.heroRadius,
    overflow: 'hidden',
    transformOrigin: 'top left',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  innerCompact: {
    paddingTop: 14,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: CC.bluePill,
  },
  pillarLabel: {
    marginTop: 12,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  halo: {
    position: 'absolute',
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    marginTop: 10,
    alignItems: 'center',
    gap: 4,
  },
  guidance: {
    textAlign: 'center',
    marginTop: 2,
  },
  whyBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CC.hairline,
  },
  buttonSlot: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  button: {
    height: companionGeo.buttonHeight,
    borderRadius: companionGeo.buttonRadius,
    backgroundColor: CC.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CC.blue,
    transformOrigin: 'left',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.96,
  },
});
