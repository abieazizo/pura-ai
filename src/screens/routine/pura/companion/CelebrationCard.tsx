/**
 * Celebration hero — the all-complete state of the hero slot. When every
 * step for the active time of day is done, the focus card gives way to
 * this: a soft blue wash, a sparkle, the "complete" line, and a single
 * quiet "View what you did →" that hands back to the host (it scrolls the
 * surface down to the completed tail). The vertical spine is full and
 * glowing behind it.
 *
 * Presentational. The host swaps this into the hero slot when the model
 * reports allComplete; it owns no routine state of its own.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkle } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import type { RoutineTimeOfDay } from '@/types/routine';
import {
  CC,
  CELEBRATION_GRADIENT,
  companionGeo,
  companionShadows,
  companionType,
} from './companionTokens';

export interface CelebrationCardProps {
  timeOfDay: RoutineTimeOfDay;
  /** Reveal the completed tail — host scrolls the surface down to it. */
  onViewWhatYouDid: () => void;
}

export function CelebrationCard({
  timeOfDay,
  onViewWhatYouDid,
}: CelebrationCardProps) {
  const title =
    timeOfDay === 'morning'
      ? 'Morning routine, complete.'
      : 'Tonight’s routine, complete.';

  return (
    <View style={[styles.card, companionShadows.hero]}>
      <LinearGradient
        colors={CELEBRATION_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <View style={styles.halo}>
          <Sparkle size={34} weight="fill" color={CC.blue} />
        </View>
        <Text style={[companionType.celebrationTitle, styles.title]}>{title}</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: companionGeo.heroRadius,
    backgroundColor: CC.white,
    minHeight: 300,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  halo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(20, 124, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    marginBottom: 22,
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
