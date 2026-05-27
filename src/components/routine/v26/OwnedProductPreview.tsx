import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Check } from 'phosphor-react-native';
import { Eyebrow } from './primitives';
import { V26, V26_RADIUS, V26_TYPE } from './tokens';

interface OwnedProductPreviewProps {
  eyebrow?: string;
  /** Brand name, optional — rendered as a small uppercase line above the name. */
  brand?: string;
  /** Display name of the product. */
  name: string;
  /** "Good for tonight's gentle plan", etc. */
  status: string;
  imageUri?: string;
}

/**
 * v26 — Owned Product Preview.
 *
 * Compact "USING TONIGHT" row that sits beneath the hero on the
 * landing. Quietly demonstrates the routine is already mapped onto
 * the user's existing shelf — no shopping ad, no "Add product"
 * pressure.
 */
export function OwnedProductPreview({
  eyebrow = 'USING TONIGHT',
  brand,
  name,
  status,
  imageUri,
}: OwnedProductPreviewProps) {
  const source: ImageSourcePropType | null = imageUri ? { uri: imageUri } : null;
  return (
    <View style={s.row}>
      <View style={s.thumb}>
        {source ? (
          <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={s.thumbLetter} maxFontSizeMultiplier={1.1}>
            {(brand ?? name).charAt(0)}
          </Text>
        )}
      </View>
      <View style={s.copy}>
        <Eyebrow style={s.eyebrow}>{eyebrow}</Eyebrow>
        {brand ? (
          <Text style={s.brand} maxFontSizeMultiplier={1.15}>
            {brand}
          </Text>
        ) : null}
        <Text style={s.name} maxFontSizeMultiplier={1.2}>
          {name}
        </Text>
        <View style={s.statusRow}>
          <View style={s.checkRing}>
            <Check size={11} color={V26.positive} weight="bold" />
          </View>
          <Text style={s.status} maxFontSizeMultiplier={1.2}>
            {status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: V26_RADIUS.cardSmall,
    backgroundColor: V26.surface,
    borderWidth: 1,
    borderColor: V26.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: V26.clayMist,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: V26.border,
  },
  thumbLetter: {
    fontFamily: V26_TYPE.serif,
    fontSize: 24,
    color: V26.terracottaText,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: V26.inkMuted,
    marginBottom: 2,
  },
  brand: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 11,
    color: V26.inkMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: V26_TYPE.sansSemi,
    fontSize: 15,
    lineHeight: 20,
    color: V26.ink,
    letterSpacing: -0.1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: V26.positiveWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontFamily: V26_TYPE.sansMed,
    fontSize: 13,
    color: V26.positive,
  },
});
