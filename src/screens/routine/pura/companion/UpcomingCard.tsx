/**
 * Upcoming card — one row of Zone 4's "coming up" preview.
 *
 * A quiet, soft-pillar-gradient card: the product photo floating on its
 * pillar halo, the pillar name + product, and a caret. Tapping it asks
 * the host to promote this step into the hero (the host plays the rise).
 * Presentational — it reads a single CompanionRow.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretRight } from 'phosphor-react-native';
import { PILLAR_IDENTITY } from '@/components/routine/pillarIdentity';
import { hapt } from '@/utils/haptics';
import {
  CC,
  PILLAR_ATMOSPHERE,
  companionGeo,
  companionShadows,
  companionType,
} from './companionTokens';
import { resolveRoutineProductImage } from './productImage';
import type { CompanionRow } from './companionModel';

export interface UpcomingCardProps {
  row: CompanionRow;
  onPress: (row: CompanionRow) => void;
}

export function UpcomingCard({ row, onPress }: UpcomingCardProps) {
  const { step, pillar, label } = row;
  const atmosphere = PILLAR_ATMOSPHERE[pillar];
  const identity = PILLAR_IDENTITY[pillar];
  const packshot = resolveRoutineProductImage(step.product);
  const productName = step.product?.name ?? step.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${productName}. Tap to focus.`}
      onPress={() => {
        hapt.select();
        onPress(row);
      }}
      style={({ pressed }) => [
        styles.card,
        companionShadows.upcoming,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={atmosphere.upcoming}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={styles.gradient}
      />
      <View style={[styles.imageWrap, { backgroundColor: atmosphere.halo }]}>
        {packshot ? (
          <Image
            source={packshot}
            style={styles.image}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <identity.Icon size={24} weight="regular" color={identity.accent} />
        )}
      </View>
      <View style={styles.meta}>
        <Text style={[companionType.upcomingPillar, styles.pillar]}>{label}</Text>
        <Text style={companionType.upcomingProduct} numberOfLines={1}>
          {productName}
        </Text>
      </View>
      <CaretRight size={18} weight="bold" color={CC.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: companionGeo.upcomingRadius,
    backgroundColor: CC.white,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  imageWrap: {
    width: companionGeo.upcomingImage,
    height: companionGeo.upcomingImage,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 40,
    height: 40,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  pillar: {
    // Tighten the row title a hair so it reads as the anchor of the pair.
    letterSpacing: -0.1,
  },
});
