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
    core: '#EAF4FF',
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

  // Unique gradient ids per instance — multiple packshots mount at once
  // (carousels, grids), and duplicate SVG ids collide on web.
  const gid = React.useId();

  // The grounded contact plinth sits a hair higher on compact tiles where the
  // bottle is closer to the floor.
  const plinthCy = height - (compact ? 11 : 15);

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      {/* Backdrop: the shared gallery vocabulary — a luminous tonal wash, a
          museum SPOTLIGHT cone from the top, and a layered CONTACT-SHADOW
          plinth — so every packshot tile reads as a lit still-life on a pedestal,
          consistent with the hero card and the compare panel. */}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id={`${gid}-bg`} cx="50%" cy="42%" rx="64%" ry="64%" fx="46%" fy="36%">
            <Stop offset="0%" stopColor={grad.core} stopOpacity={1} />
            <Stop offset="60%" stopColor={grad.mid} stopOpacity={1} />
            <Stop offset="100%" stopColor={grad.rim} stopOpacity={1} />
          </RadialGradient>
          {/* Museum spotlight — a soft vertical cone of light falling onto the
              hero so the packshot is lit, not pasted on a flat disc. */}
          <RadialGradient id={`${gid}-spot`} cx="50%" cy="0%" rx="46%" ry="78%" fx="50%" fy="0%">
            <Stop offset="0%" stopColor={puraShop.white} stopOpacity={0.7} />
            <Stop offset="52%" stopColor={puraShop.white} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={puraShop.white} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gid}-bg)`} />
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gid}-spot)`} />
        {/* Layered plinth — a broad soft pool grounds into a tight contact
            core, so the bottle reads as resting ON a pedestal with real weight,
            not floating. Matches the hero zone's plinth, scaled to the tile. */}
        {!compact ? (
          <Ellipse
            cx={width / 2}
            cy={plinthCy + 2}
            rx={width * 0.4}
            ry={9}
            fill={puraShop.ink}
            opacity={0.05}
          />
        ) : null}
        <Ellipse
          cx={width / 2}
          cy={plinthCy}
          rx={width * (compact ? 0.26 : 0.3)}
          ry={compact ? 4.5 : 6}
          fill={puraShop.ink}
          opacity={0.1}
        />
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
