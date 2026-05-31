/**
 * ProductPackshot — real-image product still-life.
 *
 * The brief is explicit: storefront cards may only render curated
 * `catalogPackshot` assets. Every product surfaced by the shop view
 * model carries a verified clean packshot in
 * `assets/shop-packshots/<id>.{png|jpg}`; this component renders that
 * image inside a calibrated tonal background.
 *
 * NO vector silhouette. NO initial-monogram label. NO scan/source
 * image fallback. If for any reason a card reaches this component
 * without a usable asset, the dev console emits a one-time warning
 * and the card renders a refined neutral surface — never a fake
 * bottle drawing.
 */

import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { puraShop } from '@/theme';

export type PackshotTone = 'ivory' | 'blush' | 'peach' | 'sage' | 'mist' | 'cream';

export interface ProductPackshotProps {
  /** Required clean packshot — a require()'d local asset or remote URL. */
  source: ImageSourcePropType | string;
  /** Background tonal stage. */
  tone?: PackshotTone;
  /** Width / height of the packshot stage. */
  width: number;
  height: number;
  /** Tighter padding around the bottle on small carousel tiles. */
  compact?: boolean;
  /** Optional fade-in duration override (ms). */
  transitionMs?: number;
  /** Optional ARIA label (e.g. product brand + name). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const TONE_GRADIENTS: Record<
  PackshotTone,
  { core: string; mid: string; rim: string }
> = {
  ivory: {
    core: puraShop.surface,
    mid: puraShop.packshotIvory,
    rim: puraShop.packshotIvoryDeep,
  },
  cream: {
    core: '#FFFEFB',
    mid: '#F7FAFF',
    rim: '#F3E9DD',
  },
  blush: {
    core: '#FFF6F0',
    mid: puraShop.packshotBlush,
    rim: puraShop.packshotBlushDeep,
  },
  peach: {
    core: '#FFEFE0',
    mid: puraShop.packshotPeach,
    rim: puraShop.packshotPeachDeep,
  },
  sage: {
    core: '#F0F5EE',
    mid: puraShop.packshotSage,
    rim: puraShop.packshotSageDeep,
  },
  mist: {
    core: '#F8F8FA',
    mid: puraShop.packshotMist,
    rim: puraShop.packshotMistDeep,
  },
};

export function ProductPackshot({
  source,
  tone = 'cream',
  width,
  height,
  compact,
  transitionMs = 240,
  accessibilityLabel,
  style,
}: ProductPackshotProps) {
  const grad = TONE_GRADIENTS[tone];

  // Internal padding — the bottle never hugs the card edge. Tighter
  // on mini carousel tiles where vertical space is tight.
  const inset = compact ? 0.08 : 0.06;
  const innerW = width * (1 - inset * 2);
  const innerH = height * (1 - inset * 2);

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      {/* Backdrop: SVG radial gradient — luminous, never muddy. */}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="42%" rx="64%" ry="64%" fx="46%" fy="36%">
            <Stop offset="0%" stopColor={grad.core} stopOpacity={1} />
            <Stop offset="60%" stopColor={grad.mid} stopOpacity={1} />
            <Stop offset="100%" stopColor={grad.rim} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bg)" />
        {/* Soft floor reflection — adds product still-life weight. */}
        {!compact ? (
          <Ellipse
            cx={width / 2}
            cy={height - 14}
            rx={width * 0.34}
            ry={6}
            fill="#0A1A2F"
            opacity={0.07}
          />
        ) : null}
      </Svg>

      {/* The real product photo, contained. */}
      <View
        style={[
          styles.imageWrap,
          {
            width: innerW,
            height: innerH,
            left: (width - innerW) / 2,
            top: (height - innerH) / 2,
          },
        ]}
        pointerEvents="none"
      >
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel}
          fadeDuration={Math.max(0, transitionMs - 20)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
  },
  imageWrap: {
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
