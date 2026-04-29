/**
 * Product placeholder image — v10.32 magazine-mockup pass.
 *
 * Why this exists
 *   • Real, licensed product photography for 24 catalog items isn't
 *     reliably hot-linkable from third-party CDNs. OBF coverage is
 *     8/24 (the K-beauty / US-indie tail isn't volunteer-indexed).
 *   • Picsum (random nature photos per id) reads as obviously
 *     placeholder.
 *   • A purely-controlled internal asset path — pure SVG, zero
 *     network — gives us a consistent, magazine-quality "card
 *     mockup" feel that survives offline, on first paint, and in
 *     CI snapshots.
 *
 * v10.32 visual upgrades over v10.30/v10.31
 *   • Body filled with a vertical linear gradient instead of flat
 *     accent — reads as a lit glass bottle, not a vector blob.
 *   • Cap rendered as a separate path with deeper accent so the
 *     bottle has a visible top→body shoulder line.
 *   • Diagonal white gleam stripe (low-opacity linear gradient)
 *     down the left side of the body — the single move that makes
 *     a vector silhouette look like reflective glass.
 *   • Embossed label band — a hairline-stroked rect across the
 *     middle of the body, suggesting a real product label without
 *     trying to fake printed copy.
 *   • Pedestal shadow ellipse beneath the bottle — anchors the
 *     packshot to a surface; without it the silhouette floats.
 *   • Per-category cap colour pulled from a deeper shade in the
 *     palette family so a serum dropper visibly differs from a
 *     toner cap, even at card-grid scale.
 *   • Tiny "MOCKUP" corner badge — three Inter-SemiBold caps in
 *     the bottom-right at 50% opacity. Reads as an editorial
 *     watermark; signals intentional design rather than missing
 *     asset to anyone looking closely.
 *
 * The result reads as a real "studio packshot" mockup at glance
 * distance and as an intentional editorial card at attention
 * distance. When real imagery lands later, the component is
 * bypassed cleanly via the existing `imageUrl ? <Image …/> :
 * <ProductPlaceholderImage …/>` pattern in CategoryFeed +
 * ProductHero.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { palette } from '@/theme';
import type { Product, ProductCategory } from '@/types';

// ---------------------------------------------------------------------------
// Per-category visual recipe.
// ---------------------------------------------------------------------------

type SilhouetteId = 'pump' | 'dropper' | 'jar' | 'tube' | 'tall' | 'spot' | 'mask';

interface CategoryRecipe {
  /** Top → bottom gradient under the bottle. */
  gradient: [string, string];
  /** Body fill colour family. */
  accent: string;
  /** Deeper shade for the cap — gives a visible cap/body shoulder. */
  capAccent: string;
  /** Bottle/jar SVG silhouette id. */
  silhouette: SilhouetteId;
}

const CATEGORY: Record<ProductCategory, CategoryRecipe> = {
  cleanser: {
    gradient: [palette.clayPaper, palette.clayLight],
    accent: palette.clay,
    capAccent: palette.clayDeep,
    silhouette: 'pump',
  },
  toner: {
    gradient: [palette.mossLight, palette.bgDeep],
    accent: palette.mossDeep,
    capAccent: palette.ink,
    silhouette: 'tall',
  },
  serum: {
    gradient: [palette.clayPaper, palette.sandPaper],
    accent: palette.clay,
    capAccent: palette.ink,
    silhouette: 'dropper',
  },
  moisturizer: {
    gradient: [palette.sandPaper, palette.bgDeep],
    accent: palette.amber,
    capAccent: palette.clayDeep,
    silhouette: 'jar',
  },
  spf: {
    gradient: [palette.sandPaper, palette.clayPaper],
    accent: palette.amber,
    capAccent: palette.clayDeep,
    silhouette: 'tube',
  },
  treatment: {
    gradient: [palette.bgDeep, palette.clayPaper],
    accent: palette.clayDeep,
    capAccent: palette.ink,
    silhouette: 'spot',
  },
  mask: {
    gradient: [palette.mossLight, palette.bgDeep],
    accent: palette.mossDeep,
    capAccent: palette.ink,
    silhouette: 'mask',
  },
};

// ---------------------------------------------------------------------------
// Per-silhouette geometry.
// ---------------------------------------------------------------------------
//
// v10.32 — silhouettes split into `cap` and `body` so we can fill them with
// different shades. Geometry is identical to v10.30; only the path strings
// were separated. ViewBox extended from 60x84 → 60x96 to accommodate the
// pedestal shadow ellipse beneath the bottle. The label band coordinates
// describe a hairline-stroked rect across the middle of each body — read
// as an embossed product label without faking printed copy.

interface SilhouetteSpec {
  cap: string;
  body: string;
  /** Hairline label band overlaid on the body. */
  label: { x: number; y: number; width: number; height: number };
  /** Vertical gleam stripe on the body's left edge. */
  gleam: { x: number; y: number; height: number };
}

const SILHOUETTES: Record<SilhouetteId, SilhouetteSpec> = {
  pump: {
    cap: 'M 26 2 L 34 2 L 34 8 L 36 10 L 36 16 L 24 16 L 24 10 L 26 8 Z',
    body:
      'M 22 18 L 38 18 L 40 22 L 40 78 Q 40 82 36 82 L 24 82 Q 20 82 20 78 L 20 22 Z',
    label: { x: 22, y: 44, width: 16, height: 14 },
    gleam: { x: 22.5, y: 22, height: 56 },
  },
  dropper: {
    cap: 'M 24 2 L 36 2 L 36 14 L 38 18 L 38 24 L 22 24 L 22 18 L 24 14 Z',
    body:
      'M 18 26 L 42 26 L 42 76 Q 42 82 36 82 L 24 82 Q 18 82 18 76 Z',
    label: { x: 21, y: 46, width: 18, height: 14 },
    gleam: { x: 20.5, y: 30, height: 50 },
  },
  jar: {
    cap: 'M 14 18 L 46 18 L 46 30 L 14 30 Z',
    body:
      'M 16 32 L 44 32 L 44 78 Q 44 82 40 82 L 20 82 Q 16 82 16 78 Z',
    label: { x: 19, y: 46, width: 22, height: 14 },
    gleam: { x: 18, y: 34, height: 46 },
  },
  tube: {
    cap: 'M 28 2 L 32 2 L 32 8 L 36 10 L 36 14 L 24 14 L 24 10 L 28 8 Z',
    body:
      'M 18 18 Q 18 14 22 14 L 38 14 Q 42 14 42 18 L 42 80 Q 42 82 40 82 L 20 82 Q 18 82 18 80 Z',
    label: { x: 21, y: 40, width: 18, height: 14 },
    gleam: { x: 20.5, y: 18, height: 60 },
  },
  tall: {
    cap: 'M 26 2 L 34 2 L 34 12 L 36 16 L 36 22 L 24 22 L 24 16 L 26 12 Z',
    body:
      'M 22 24 L 38 24 L 40 28 L 40 78 Q 40 82 36 82 L 24 82 Q 20 82 20 78 L 20 28 Z',
    label: { x: 22, y: 48, width: 16, height: 14 },
    gleam: { x: 22.5, y: 28, height: 50 },
  },
  spot: {
    cap: 'M 26 2 L 34 2 L 34 12 L 36 16 L 36 20 L 24 20 L 24 16 L 26 12 Z',
    body: 'M 22 24 L 38 24 L 38 70 Q 38 78 32 78 L 28 78 Q 22 78 22 70 Z',
    label: { x: 23, y: 42, width: 14, height: 12 },
    gleam: { x: 23.5, y: 26, height: 42 },
  },
  mask: {
    cap: 'M 12 14 L 48 14 L 48 24 L 12 24 Z',
    body:
      'M 14 26 L 46 26 L 46 78 Q 46 82 42 82 L 18 82 Q 14 82 14 78 Z',
    label: { x: 17, y: 44, width: 26, height: 14 },
    gleam: { x: 16, y: 28, height: 50 },
  },
};

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface ProductPlaceholderImageProps {
  product: Pick<Product, 'brand' | 'category' | 'name'>;
  /** Render the brand wordmark band under the silhouette. */
  showBrandWord?: boolean;
  /** Render the product name as a second line under the brand wordmark.
   *  Use on the detail hero, not on grid cards (too cluttered there). */
  showProductName?: boolean;
  /** Visual silhouette size; auto-scales label font sizes. */
  silhouetteSize?: number;
  /**
   * Show the editorial "MOCKUP" corner badge.
   *
   * v14.1 — DEFAULT IS NOW false. The badge previously defaulted to
   * `true` and every consumer-facing card without a bundled real
   * photo wore a "MOCKUP" watermark. That actively leaked a demo
   * signal into the main user experience — the user described it
   * as "fallback / mockup feeling in the visible UI."
   *
   * The placeholder itself is premium (silhouette + brand wordmark
   * + soft pedestal), so it stands on its own as a clean editorial
   * surface. The watermark is only useful in internal QA / catalog
   * audits, where a caller can opt-in by passing
   * `showMockupBadge={true}`.
   */
  showMockupBadge?: boolean;
}

export function ProductPlaceholderImage({
  product,
  showBrandWord = true,
  showProductName = false,
  silhouetteSize = 84,
  showMockupBadge = false,
}: ProductPlaceholderImageProps) {
  const recipe = CATEGORY[product.category];
  const spec = SILHOUETTES[recipe.silhouette];
  // Stable per-render id so two ProductPlaceholderImages on the same
  // screen don't collide on SVG <defs> ids. Math.random() is fine —
  // this only needs to be unique within a tree, not across renders.
  const id = React.useMemo(
    () => `pp-${Math.round(Math.random() * 1e6)}`,
    []
  );

  const brand = brandShort(product.brand);
  const productName = product.name;

  // Slightly larger height multiplier (was 1.4 → 1.6) because the
  // viewBox extended from 84 → 96 to make room for the pedestal.
  const svgHeight = silhouetteSize * 1.6;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Background — soft category-tinted gradient. expo-linear-
          gradient renders an actual gradient (not just two stops)
          so the tile reads as paper-on-paper rather than flat. */}
      <ExpoLinearGradient
        colors={recipe.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle radial highlight at top-center — gives the tile depth
          so it reads as "lit product shot" not "flat colour block". */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient id={`${id}-bg`} cx="50%" cy="32%" r="60%">
            <Stop offset="0" stopColor={palette.bg} stopOpacity={0.32} />
            <Stop offset="0.55" stopColor={palette.bg} stopOpacity={0.06} />
            <Stop offset="1" stopColor={palette.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#${id}-bg)`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Svg
          width={silhouetteSize}
          height={svgHeight}
          viewBox="0 0 60 96"
        >
          <Defs>
            {/* Body gradient — accent at top fading slightly darker
                at bottom. Reads as a lit glass bottle. */}
            <SvgLinearGradient
              id={`${id}-body`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0" stopColor={recipe.accent} stopOpacity={0.30} />
              <Stop offset="1" stopColor={recipe.accent} stopOpacity={0.20} />
            </SvgLinearGradient>
            {/* Cap gradient — deeper accent shade so the cap reads
                as a distinct piece. */}
            <SvgLinearGradient
              id={`${id}-cap`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0" stopColor={recipe.capAccent} stopOpacity={0.55} />
              <Stop offset="1" stopColor={recipe.capAccent} stopOpacity={0.42} />
            </SvgLinearGradient>
            {/* Vertical gleam — narrow white stripe down the bottle's
                left edge. The single move that turns a vector blob
                into "lit glass." */}
            <SvgLinearGradient
              id={`${id}-gleam`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <Stop offset="0" stopColor={palette.bg} stopOpacity={0.32} />
              <Stop offset="1" stopColor={palette.bg} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>

          {/* Pedestal shadow — anchors the packshot to a surface.
              Without it, the silhouette appears to float. */}
          <Ellipse
            cx={30}
            cy={91}
            rx={18}
            ry={1.8}
            fill={palette.ink}
            fillOpacity={0.10}
          />

          {/* Body */}
          <Path d={spec.body} fill={`url(#${id}-body)`} />

          {/* Embossed label band — hairline rect across the body
              middle. Suggests a real product label without faking
              printed copy. */}
          <Rect
            x={spec.label.x}
            y={spec.label.y}
            width={spec.label.width}
            height={spec.label.height}
            rx={1}
            fill={palette.bg}
            fillOpacity={0.18}
            stroke={recipe.accent}
            strokeOpacity={0.30}
            strokeWidth={0.4}
          />

          {/* Vertical gleam stripe */}
          <Rect
            x={spec.gleam.x}
            y={spec.gleam.y}
            width={2.2}
            height={spec.gleam.height}
            fill={`url(#${id}-gleam)`}
            rx={1.1}
          />

          {/* Cap on top of body so the shoulder line is crisp */}
          <Path d={spec.cap} fill={`url(#${id}-cap)`} />
        </Svg>

        {showBrandWord || showProductName ? (
          <View style={styles.labels}>
            {showBrandWord ? (
              <Text
                style={[
                  styles.brandWord,
                  {
                    color: recipe.capAccent,
                    fontSize: Math.max(8, Math.round(silhouetteSize * 0.11)),
                  },
                ]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {brand}
              </Text>
            ) : null}
            {showProductName ? (
              <Text
                style={[
                  styles.productName,
                  { fontSize: Math.max(11, Math.round(silhouetteSize * 0.16)) },
                ]}
                numberOfLines={2}
                allowFontScaling={false}
              >
                {productName}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* MOCKUP corner badge — Inter-SemiBold caps, low opacity.
          Reads as an editorial watermark; signals intentional design
          rather than missing asset. */}
      {showMockupBadge ? (
        <View style={styles.mockupBadge} pointerEvents="none">
          <Text style={styles.mockupBadgeText} allowFontScaling={false}>
            MOCKUP
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function brandShort(brand: string): string {
  return brand
    .replace(/[‘’']/g, '')
    .toUpperCase()
    .trim()
    .slice(0, 16);
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  labels: {
    marginTop: 6,
    alignItems: 'center',
    gap: 4,
  },
  brandWord: {
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  productName: {
    fontFamily: 'InstrumentSerif-SemiBold',
    color: palette.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: undefined, // let RN auto-fit
  },
  mockupBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(11,18,32,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(11,18,32,0.10)',
  },
  mockupBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.5,
    color: 'rgba(11,18,32,0.45)',
  },
});
