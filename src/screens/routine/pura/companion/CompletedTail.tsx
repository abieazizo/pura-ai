/**
 * Completed tail — Zone 5's horizontally-scrolling record of what's
 * already done for this time of day. Each finished step becomes a small
 * pill: its product photo in a pillar-tinted circle with a Pura Blue
 * check badge, and the pillar name beneath. Hidden entirely when nothing
 * is done yet. Presentational — reads the model's `completed` rows.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'phosphor-react-native';
import { PILLAR_IDENTITY } from '@/components/routine/pillarIdentity';
import {
  CC,
  PILLAR_ATMOSPHERE,
  companionGeo,
  companionType,
} from './companionTokens';
import { resolveRoutineProductImage } from './productImage';
import type { CompanionRow } from './companionModel';
import type { RoutineTimeOfDay } from '@/types/routine';

export interface CompletedTailProps {
  rows: CompanionRow[];
  timeOfDay: RoutineTimeOfDay;
}

export function CompletedTail({ rows, timeOfDay }: CompletedTailProps) {
  if (rows.length === 0) return null;
  const eyebrow = timeOfDay === 'morning' ? 'DONE THIS MORNING' : 'DONE TONIGHT';

  return (
    <View style={styles.wrap}>
      <Text style={[companionType.eyebrow, styles.eyebrow]}>{eyebrow}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {rows.map((r) => {
          const identity = PILLAR_IDENTITY[r.pillar];
          const atmosphere = PILLAR_ATMOSPHERE[r.pillar];
          const packshot = resolveRoutineProductImage(r.step.product);
          return (
            <View key={r.step.id} style={styles.pill}>
              <View style={[styles.imageCircle, { backgroundColor: atmosphere.haloDeep }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                  start={{ x: 0.25, y: 0.15 }}
                  end={{ x: 0.9, y: 1 }}
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                />
                {packshot ? (
                  <Image source={packshot} style={styles.image} contentFit="contain" />
                ) : (
                  <identity.Icon size={18} weight="regular" color={identity.accent} />
                )}
                <View style={styles.checkBadge}>
                  <Check size={10} weight="bold" color={CC.white} />
                </View>
              </View>
              <Text style={[companionType.tailLabel, styles.label]} numberOfLines={1}>
                {r.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 20,
  },
  eyebrow: {
    paddingHorizontal: 20,
    marginBottom: 14,
    // Match the surface's other caps eyebrows for a consistent track.
    letterSpacing: 2,
  },
  row: {
    paddingHorizontal: 20,
    gap: 10,
  },
  pill: {
    width: companionGeo.tailPill,
    height: companionGeo.tailPillHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: CC.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CC.lineTrack,
  },
  imageCircle: {
    width: companionGeo.tailImage,
    height: companionGeo.tailImage,
    borderRadius: companionGeo.tailImage / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 30,
    height: 30,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    // "Done" reads as success green (shared success ramp) — semantically
    // consistent with completion everywhere, and it lets blue rest here.
    backgroundColor: CC.done,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CC.white,
  },
  label: {
    maxWidth: 68,
    textAlign: 'center',
  },
});
