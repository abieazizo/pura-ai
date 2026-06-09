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
import { FramedProductImage } from './FramedProductImage';
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
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        pointerEvents="none"
        style={styles.gradient}
      />
      <View style={[styles.imageWrap, { backgroundColor: atmosphere.haloDeep }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          start={{ x: 0.25, y: 0.15 }}
          end={{ x: 0.9, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {/* Cycle 12 — shared product-image treatment, grounded on the halo. */}
        <FramedProductImage
          source={packshot}
          size={40}
          PlaceholderIcon={identity.Icon}
          placeholderColor={identity.accent}
          transition={150}
        />
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CC.cardLine,
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
  meta: {
    flex: 1,
    gap: 3,
  },
  pillar: {
    // Tighten the row title a hair so it reads as the anchor of the pair.
    letterSpacing: -0.1,
  },
});
