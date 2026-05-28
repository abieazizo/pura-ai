/**
 * PremiumRoutineReadyV34 — restrained celebration moment.
 *
 * Big serif "Your Routine is Ready", a soft glowing orb that breathes,
 * three small trust pills tied back to the scan, primary CTA "See my
 * routine", secondary "Not now". No confetti, no childish flourish.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ArrowRight, Check, Sparkle } from 'phosphor-react-native';
import type { ScanFlowViewModel } from '@/state/scanFlowV34';
import { premiumPalette as C, premiumType as T } from '../scan-results/PremiumScanResultsV34';

export interface PremiumRoutineReadyV34Props {
  vm: ScanFlowViewModel;
  onSeeRoutine(): void;
  onNotNow?(): void;
}

export function PremiumRoutineReadyV34({
  vm,
  onSeeRoutine,
  onNotNow,
}: PremiumRoutineReadyV34Props) {
  const heroOpacity = useSharedValue(0);
  const heroOffset = useSharedValue(14);
  const orbScale = useSharedValue(0.92);
  const orbGlow = useSharedValue(0.65);

  useEffect(() => {
    heroOpacity.value = withTiming(1, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
    heroOffset.value = withTiming(0, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    orbScale.value = withSequence(
      withTiming(1.04, { duration: 720, easing: Easing.out(Easing.cubic) }),
      withRepeat(
        withSequence(
          withTiming(0.98, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    orbGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(heroOpacity);
      cancelAnimation(heroOffset);
      cancelAnimation(orbScale);
      cancelAnimation(orbGlow);
    };
  }, [heroOpacity, heroOffset, orbScale, orbGlow]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroOffset.value }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
    opacity: orbGlow.value,
  }));

  const intensityLabel = vm.routineSeed.intensity[0].toUpperCase() + vm.routineSeed.intensity.slice(1);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.orbWrap, orbStyle]}>
        <Orb />
      </Animated.View>

      <Animated.View style={[styles.contentWrap, heroStyle]}>
        <Text style={T.eyebrow}>YOUR ROUTINE</Text>
        <Text style={[T.serifHeadline, styles.headline]}>
          Your routine{'\n'}
          <Text style={[T.serifHeadline, { fontFamily: 'InstrumentSerif-Italic', color: C.coral }]}>
            is ready.
          </Text>
        </Text>

        <Text style={[T.body, styles.subBody]}>
          Built from your scan. Calibrated to your skin. Designed for
          consistency, not noise.
        </Text>

        <View style={styles.trustList}>
          <ReadyTrustRow
            label="Based on your scan"
            detail={vm.headline}
          />
          <ReadyTrustRow
            label={`${intensityLabel} intensity`}
            detail={vm.routineSeed.skinNeeds.slice(0, 2).join(' · ')}
          />
          <ReadyTrustRow
            label={`${vm.routineSeed.recommendedStepTypes.length}-step routine`}
            detail={vm.routineSeed.recommendedStepTypes.map(capitalize).join(' → ')}
          />
        </View>

        <Pressable style={styles.primaryBtn} onPress={onSeeRoutine}>
          <Text style={styles.primaryLabel}>See my routine</Text>
          <ArrowRight size={14} weight="bold" color="#FFFFFF" />
        </Pressable>

        {onNotNow ? (
          <Pressable style={styles.secondaryBtn} onPress={onNotNow} hitSlop={8}>
            <Text style={styles.secondaryLabel}>Not right now</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

function ReadyTrustRow({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={styles.trustRow}>
      <View style={styles.trustCheck}>
        <Check size={11} weight="bold" color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.trustLabel}>{label}</Text>
        <Text style={styles.trustDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function Orb() {
  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Defs>
        <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="40%" stopColor={C.blush} stopOpacity={0.8} />
          <Stop offset="80%" stopColor={C.coralSoft} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={C.coral} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={110} cy={110} r={110} fill="url(#orb)" />
      <Circle cx={110} cy={110} r={70} fill={C.cardElevated} opacity={0.62} />
      <Circle cx={110} cy={110} r={48} fill="#FFFFFF" opacity={0.9} />
      <Circle cx={110} cy={110} r={30} fill={C.coralBgVeil} opacity={0.7} />
    </Svg>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 24,
    justifyContent: 'center',
  },
  orbWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  contentWrap: {
    paddingHorizontal: 6,
  },
  headline: {
    marginTop: 10,
    fontSize: 38,
    lineHeight: 42,
  },
  subBody: {
    marginTop: 14,
    maxWidth: 320,
  },
  trustList: {
    marginTop: 28,
    gap: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  trustCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.ink,
  },
  trustDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: C.inkSoft,
    marginTop: 2,
  },
  primaryBtn: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.coral,
    paddingVertical: 16,
    borderRadius: 999,
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  secondaryBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  secondaryLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: C.muted,
  },
});
