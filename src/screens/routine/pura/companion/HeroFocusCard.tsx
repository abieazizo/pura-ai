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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
}

export function HeroFocusCard({
  step,
  stepIndex,
  totalSteps,
  onMarkDone,
  onOpenDetail,
  breathPaused = false,
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

  // Ambient breath ----------------------------------------------------------
  const breath = useSharedValue(0);
  React.useEffect(() => {
    if (reduceMotion || breathPaused) {
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
  }, [reduceMotion, breathPaused, breath]);

  const imageBreath = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.015]) }],
  }));
  const haloBreath = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.4, 0.52]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.05]) }],
  }));

  const handleMark = () => {
    hapt.tap();
    onMarkDone();
  };

  return (
    <View
      style={[
        styles.card,
        companionShadows.hero,
        { minHeight: compact ? companionGeo.heroHeightCompact : companionGeo.heroHeight },
      ]}
    >
      <LinearGradient
        colors={atmosphere.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={styles.gradient}
      />

      <View style={[styles.inner, compact && styles.innerCompact]}>
        {/* Top row: STEP x OF y · Why this? */}
        <View style={styles.topRow}>
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
        </View>

        <Text style={[companionType.pillarLabel, styles.pillarLabel]}>
          {identity.label}
        </Text>

        {/* Product stage — halo + breathing image. */}
        <View style={[styles.stage, { height: haloSize }]}>
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
        </View>

        {/* Product identity. */}
        <View style={styles.meta}>
          {brand ? <Text style={companionType.brand}>{brand}</Text> : null}
          <Text style={companionType.productName} numberOfLines={2}>
            {productName}
          </Text>
          {guidance ? (
            <Text style={[companionType.guidance, styles.guidance]} numberOfLines={3}>
              {guidance}
            </Text>
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

        <View style={styles.buttonSlot}>
          <Pressable
            onPress={handleMark}
            accessibilityRole="button"
            accessibilityLabel="Mark as done"
            style={({ pressed }) => [
              styles.button,
              companionShadows.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={companionType.button}>Mark as done</Text>
          </Pressable>
        </View>
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
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
});
