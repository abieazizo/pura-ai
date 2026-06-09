/**
 * Framed Product Image — Cycle 12's consistent product-image treatment.
 *
 * Every product packshot across the Routine companion (the hero focus card,
 * the "coming up" rows, the completed tail) is rendered through this one
 * component so the framing never drifts: a contain-fit packshot, centered,
 * grounded by a soft CONTACT SHADOW ellipse so it reads as resting in the
 * pillar halo's light rather than pasted flat. When no artwork resolves it
 * shows the pillar's identity glyph — an honest placeholder, never a gray box.
 *
 * Real data only: callers pass the source already resolved through
 * `resolveRoutineProductImage` (catalog packshot → bundled asset → remote).
 */

import React from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { companionGeo, companionShadows } from './companionTokens';

export interface FramedProductImageProps {
  /** Resolved packshot source, or undefined for the placeholder. */
  source?: ImageSourcePropType;
  /** The rendered packshot edge length (square). */
  size: number;
  /** Pillar identity fallbacks (glyph + accent) when no source resolves. */
  PlaceholderIcon: React.ComponentType<PhosphorIconProps>;
  placeholderColor: string;
  /** Image cross-fade. */
  transition?: number;
  /** Hide the contact shadow (e.g. tiny tail thumbnails where it'd muddy). */
  grounded?: boolean;
}

export function FramedProductImage({
  source,
  size,
  PlaceholderIcon,
  placeholderColor,
  transition = 200,
  grounded = true,
}: FramedProductImageProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {grounded ? (
        <View
          pointerEvents="none"
          style={[
            styles.contact,
            companionShadows.productContact,
            {
              width: size * companionGeo.productContactWidth,
              height: companionGeo.productContactHeight,
              bottom: Math.round(size * 0.02),
            },
          ]}
        />
      ) : null}
      {source ? (
        <Image
          source={source}
          style={{ width: size, height: size }}
          contentFit="contain"
          transition={transition}
        />
      ) : (
        <PlaceholderIcon
          size={Math.round(size * 0.42)}
          weight="regular"
          color={placeholderColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The grounding ellipse — a soft, wide cool-ink pool centered under the
  // packshot. It carries the contact shadow; its own fill is faint so on a
  // tinted halo it reads as the product's shadow, not a drawn shape.
  contact: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(8, 26, 47, 0.16)',
    transform: [{ scaleX: 1.4 }],
  },
});
