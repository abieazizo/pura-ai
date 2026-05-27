/**
 * RoutineReadyView — "Your routine is ready" reveal.
 *
 * Premium centered reveal moment.
 *   • Soft outer halo glow behind the orb
 *   • Editorial serif headline with the second line ("is ready.") in
 *     warm coral italic
 *   • Three trust rows in elegant cream pills with subtle borders
 *   • Coral primary CTA + quiet secondary ("I'll do this later")
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Check } from 'phosphor-react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineShadows as S,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  PuraButton,
  QuietTextButton,
} from './primitives';
import { BuildOrb } from './BuildOrb';

interface RoutineReadyViewProps {
  onReview: () => void;
  onLater: () => void;
}

const TRUST_ROWS = [
  'Based on your scan',
  'Matched to suitable step types',
  'Ready for product confirmation',
];

export function RoutineReadyView({ onReview, onLater }: RoutineReadyViewProps) {
  // Reveal animation — orb fades in, headline rises, trust rows
  // cascade in with a small stagger.
  const orbProgress = useSharedValue(0);
  const titleProgress = useSharedValue(0);
  const row1 = useSharedValue(0);
  const row2 = useSharedValue(0);
  const row3 = useSharedValue(0);
  const cta = useSharedValue(0);

  useEffect(() => {
    orbProgress.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    titleProgress.value = withDelay(
      150,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
    row1.value = withDelay(420, withTiming(1, { duration: 380 }));
    row2.value = withDelay(540, withTiming(1, { duration: 380 }));
    row3.value = withDelay(660, withTiming(1, { duration: 380 }));
    cta.value = withDelay(820, withTiming(1, { duration: 420 }));
  }, [orbProgress, titleProgress, row1, row2, row3, cta]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbProgress.value,
    transform: [{ scale: 0.94 + orbProgress.value * 0.06 }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: (1 - titleProgress.value) * 8 }],
  }));
  const trustStyle = (sv: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: sv.value,
      transform: [{ translateY: (1 - sv.value) * 6 }],
    }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: cta.value,
    transform: [{ translateY: (1 - cta.value) * 8 }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowSeg} />
        <View style={styles.eyebrowSeg} />
        <View style={styles.eyebrowSeg} />
        <Text style={[T.eyebrowMuted, { marginLeft: 10 }]}>ROUTINE CREATED</Text>
      </View>

      {/* Soft halo + orb */}
      <Animated.View style={[styles.orbWrap, orbStyle]}>
        <Svg
          width={360}
          height={360}
          viewBox="0 0 360 360"
          style={styles.haloAbs}
        >
          <Defs>
            <RadialGradient id="reveal-halo" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={C.peachGlow} stopOpacity={0.55} />
              <Stop offset="55%" stopColor={C.coralWash} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={C.background} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={180} cy={180} r={180} fill="url(#reveal-halo)" />
        </Svg>
        <BuildOrb size={160} animating={false} />
      </Animated.View>

      <Animated.View style={[styles.titleBlock, titleStyle]}>
        <EditorialHeading size="reveal" style={{ textAlign: 'center' }}>
          Your routine{'\n'}
          <Text style={{ color: C.coralDeep, fontFamily: 'InstrumentSerif-Italic' }}>
            is ready.
          </Text>
        </EditorialHeading>
        <Body
          size="large"
          style={{ marginTop: 12, textAlign: 'center', paddingHorizontal: 18 }}
        >
          Built from your scan and shaped around your skin's visible needs.
        </Body>
      </Animated.View>

      <View style={styles.trust}>
        <Animated.View style={trustStyle(row1)}>
          <TrustRow label={TRUST_ROWS[0]} />
        </Animated.View>
        <Animated.View style={trustStyle(row2)}>
          <TrustRow label={TRUST_ROWS[1]} />
        </Animated.View>
        <Animated.View style={trustStyle(row3)}>
          <TrustRow label={TRUST_ROWS[2]} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.cta, ctaStyle]}>
        <PuraButton
          label="Review my routine"
          variant="coral"
          onPress={onReview}
        />
        <QuietTextButton
          label="I'll do this later"
          tone="muted"
          onPress={onLater}
          style={{ marginTop: 10, alignSelf: 'center' }}
        />
      </Animated.View>
    </View>
  );
}

function TrustRow({ label }: { label: string }) {
  return (
    <View style={styles.trustRow}>
      <View style={styles.trustCheck}>
        <Check size={11} color={C.coralDeep} weight="bold" />
      </View>
      <Text style={[T.body, { color: C.ink, fontFamily: 'Inter-Medium' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 14,
    paddingBottom: SP.xl,
    alignItems: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrowSeg: {
    width: 16,
    height: 3,
    backgroundColor: C.coral,
    borderRadius: 2,
    marginRight: 4,
  },
  orbWrap: {
    marginTop: SP.lg,
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloAbs: {
    position: 'absolute',
  },
  titleBlock: {
    marginTop: -8,
    alignItems: 'center',
  },
  trust: {
    marginTop: SP.xxl,
    alignSelf: 'stretch',
    gap: 10,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    ...S.card,
  },
  trustCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.coralWash,
    borderWidth: 1,
    borderColor: C.coralWashStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    marginTop: SP.section,
    alignSelf: 'stretch',
  },
});
