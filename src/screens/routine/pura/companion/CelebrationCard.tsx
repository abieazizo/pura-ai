/**
 * Celebration hero — the all-complete state of the hero slot, and the
 * companion's emotional payoff.
 *
 * When every step for the active time of day is done, the focus card gives
 * way to this ceremony: soft Pura Blue rings bloom outward from a sparkle that
 * pops in with a spring overshoot, an eyebrow + serif "complete" line stagger
 * up behind it, and — when a streak is alive — a "days in a row" chip ticks in.
 * A single quiet "View what you did →" hands back to the host (it scrolls the
 * surface down to the completed tail). The vertical spine is full and blooming
 * behind it; the host has already fired the fuller ritual-complete haptic.
 *
 * Presentational. The host swaps this into the hero slot when the model
 * reports allComplete; it owns no routine state of its own. Because it mounts
 * fresh on entry, the ceremony plays once per completion. Reduce-motion →
 * everything renders settled, no rings.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkle, Flame } from 'phosphor-react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import { tnum } from '@/theme';
import type { RoutineTimeOfDay } from '@/types/routine';
import {
  CC,
  CELEBRATION_GRADIENT,
  companionGeo,
  companionMotion,
  companionShadows,
  companionType,
} from './companionTokens';

/** Eased sub-progress for one element's slice of the ceremony clock. */
function cAt(c: number, start: number, end: number): number {
  'worklet';
  const t = (c - start) / (end - start);
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - v) * (1 - v) * (1 - v);
}

export interface CelebrationCardProps {
  timeOfDay: RoutineTimeOfDay;
  /** Consecutive-day streak (count includes today once anything is done). */
  streak: { count: number; includesToday: boolean };
  /** Reveal the completed tail — host scrolls the surface down to it. */
  onViewWhatYouDid: () => void;
}

export function CelebrationCard({
  timeOfDay,
  streak,
  onViewWhatYouDid,
}: CelebrationCardProps) {
  const reduceMotion = useReduceMotion();
  const morning = timeOfDay === 'morning';
  const title = morning ? 'Morning routine, complete.' : 'Tonight’s routine, complete.';
  const eyebrow = morning ? 'MORNING RITUAL' : 'EVENING RITUAL';

  const showStreak = streak.includesToday && streak.count >= 1;
  const streakLabel =
    streak.count >= 2 ? `${streak.count} days in a row` : 'Streak started';

  // Ceremony clock — one master 0→1 the eyebrow/title/chip/CTA read windows
  // off, plus a dedicated spring for the sparkle pop (it overshoots, so it
  // can't share the linear master).
  const c = useSharedValue(reduceMotion ? 1 : 0);
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  React.useEffect(() => {
    if (reduceMotion) {
      c.value = 1;
      pop.value = 1;
      return;
    }
    c.value = 0;
    pop.value = 0;
    c.value = withTiming(1, {
      duration: companionMotion.celebrationReveal,
      easing: Easing.linear,
    });
    pop.value = withDelay(70, withSpring(1, companionMotion.orbPopSpring));
    return () => {
      cancelAnimation(c);
      cancelAnimation(pop);
    };
  }, [reduceMotion, c, pop]);

  const ring1Style = useAnimatedStyle(() => {
    const r = cAt(c.value, 0.0, 0.5);
    return { opacity: (1 - r) * 0.4, transform: [{ scale: 0.5 + r * 1.7 }] };
  });
  const ring2Style = useAnimatedStyle(() => {
    const r = cAt(c.value, 0.1, 0.64);
    return { opacity: (1 - r) * 0.3, transform: [{ scale: 0.5 + r * 2.3 }] };
  });
  const orbStyle = useAnimatedStyle(() => ({
    opacity: pop.value < 0.5 ? pop.value * 2 : 1,
    transform: [{ scale: pop.value }],
  }));
  const eyebrowStyle = useAnimatedStyle(() => {
    const v = cAt(c.value, 0.22, 0.6);
    return { opacity: v, transform: [{ translateY: 8 * (1 - v) }] };
  });
  const titleStyle = useAnimatedStyle(() => {
    const v = cAt(c.value, 0.3, 0.74);
    return { opacity: v, transform: [{ translateY: 10 * (1 - v) }] };
  });
  const chipStyle = useAnimatedStyle(() => {
    const v = cAt(c.value, 0.48, 0.9);
    return { opacity: v, transform: [{ scale: 0.85 + 0.15 * v }] };
  });
  const ctaStyle = useAnimatedStyle(() => {
    const v = cAt(c.value, 0.62, 1);
    return { opacity: v, transform: [{ translateY: 8 * (1 - v) }] };
  });

  return (
    <View style={[styles.card, companionShadows.hero]}>
      <LinearGradient
        colors={CELEBRATION_GRADIENT}
        locations={[0, 0.5, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <View style={styles.orbStage}>
          {!reduceMotion ? (
            <>
              <Animated.View pointerEvents="none" style={[styles.ring, ring2Style]} />
              <Animated.View pointerEvents="none" style={[styles.ring, ring1Style]} />
            </>
          ) : null}
          <Animated.View style={[styles.halo, orbStyle]}>
            <LinearGradient
              colors={['rgba(20, 124, 255, 0.18)', 'rgba(20, 124, 255, 0.04)']}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 0.95 }}
              style={[StyleSheet.absoluteFill, { borderRadius: ORB / 2 }]}
            />
            <Sparkle size={44} weight="fill" color={CC.blue} />
          </Animated.View>
        </View>

        <Animated.Text style={[companionType.celebrationEyebrow, styles.eyebrow, eyebrowStyle]}>
          {eyebrow}
        </Animated.Text>
        <Animated.Text style={[companionType.celebrationTitle, styles.title, titleStyle]}>
          {title}
        </Animated.Text>

        {showStreak ? (
          <Animated.View style={[styles.streakChip, chipStyle]}>
            <Flame size={15} weight="fill" color={CC.blue} />
            <Text style={[companionType.streakLabel, styles.streakLabel]}>
              {streakLabel}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View style={ctaStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View what you did"
            hitSlop={8}
            onPress={() => {
              hapt.select();
              onViewWhatYouDid();
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>View what you did →</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const ORB = 100;
const RING = 128;

const styles = StyleSheet.create({
  card: {
    borderRadius: companionGeo.heroRadius,
    backgroundColor: CC.white,
    // Cycle 11 — the payoff card now matches the bolder hero footprint so the
    // all-complete ceremony lands as the surface's biggest, most present moment.
    minHeight: companionGeo.heroHeight,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  orbStage: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: CC.blueRing,
  },
  halo: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    backgroundColor: 'rgba(20, 124, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyebrow: {
    marginBottom: 12,
  },
  title: {
    // The emotional climax — the boldest serif moment on the surface.
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: -0.7,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CC.streakBg,
    marginBottom: 20,
  },
  streakLabel: {
    // Tabular streak count so "11 days" lines up under "1 day".
    ...tnum,
  },
  cta: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  ctaText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: CC.blue,
  },
  pressed: {
    opacity: 0.6,
  },
});
