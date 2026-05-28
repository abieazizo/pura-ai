/**
 * SkinMapOverlayV34 — premium real-photo overlay.
 *
 * Renders the user's ACTUAL captured photograph as the base layer and
 * paints backend-supplied `ZoneOverlayV2[]` on top using canonical
 * face-zone anchors (`ZONE_COORDS`). Every overlay is anchored to a
 * named zone, so the result tracks the photo without depending on
 * pixel-perfect AI polygon geometry (which the model rarely returns
 * reliably).
 *
 * Why this exists:
 *   The previous implementation rendered overlays from AI-supplied
 *   `region_polygon` arrays that were often missing, generic, or
 *   placed against a stylized SVG face instead of the real image.
 *   The user wanted: "use the user's REAL uploaded scan image as the
 *   base. Use the backend to determine which concerns are visible.
 *   Render premium overlays directly on top of the original image."
 *
 * Approach:
 *   • Show the captured photo at full quality.
 *   • For each ZoneOverlayV2 returned by the backend, draw a soft
 *     mask at the canonical zone anchor. Bilateral concerns produce
 *     two overlays (left + right) which renders symmetrically.
 *   • Overlay style switches:
 *       soft_mask → translucent radial wash (tonal areas like dark
 *                   circles, redness, dryness)
 *       heatmap   → broader radial wash w/ stronger center
 *       outline   → thin contoured ring (fine lines, wrinkles)
 *       pin       → small targeted dot + halo (blemishes, marks)
 *   • Concern → color: peach for texture, plum for dark circles,
 *     rose for redness, etc. — calibrated to the Pura palette.
 *   • Tap-to-toggle: pressing an overlay (or its chip) emphasises
 *     that zone and dims the others.
 *
 * Performance:
 *   All overlays render in a single SVG layer. No native deps; works
 *   on web + native.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Path,
  Mask,
  Rect,
} from 'react-native-svg';
import {
  ZONE_COORDS,
  type ZoneId,
  type ConcernId,
  type OverlayStyle,
  type ZoneOverlayV2,
} from '@/types/scanResultV2';

// ---------------------------------------------------------------------------
// Concern → swatch. Calibrated to the Pura palette: warm ivory, blush,
// peach-coral, muted plum, sage. Premium, restrained, beauty-tech polish.
// ---------------------------------------------------------------------------

const CONCERN_SWATCH: Record<ConcernId, { core: string; halo: string }> = {
  texture:           { core: '#E8A985', halo: '#F4D2BB' }, // warm peach
  enlarged_pores:    { core: '#D6A87A', halo: '#EBD2B8' }, // sandy gold
  dark_circles:      { core: '#9B86A8', halo: '#D2C5DA' }, // muted plum
  puffiness:         { core: '#A998B1', halo: '#D8CCDE' },
  redness:           { core: '#D7807A', halo: '#EFBDB7' }, // muted rose
  hyperpigmentation: { core: '#B1854F', halo: '#E1C9A3' }, // honey amber
  uneven_tone:       { core: '#C6976A', halo: '#E5CCAE' },
  sun_damage:        { core: '#A66E47', halo: '#D7B696' },
  dryness:           { core: '#94A8BA', halo: '#C7D4DE' }, // soft mineral blue
  oiliness:          { core: '#A5A77A', halo: '#D2D3B5' }, // sage-gold
  dullness:          { core: '#A89B8E', halo: '#D3CABF' },
  blemishes:         { core: '#C66060', halo: '#ECB3B3' }, // coral-red
  fine_lines:        { core: '#B89A82', halo: '#DCCBB9' }, // editorial taupe
  wrinkles:          { core: '#A1846C', halo: '#CDB99F' },
  elasticity:        { core: '#B69279', halo: '#D8C0AB' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SkinMapOverlayV34Props {
  photoUri: string;
  width: number;
  height: number;
  overlays: ZoneOverlayV2[];
  /** Currently selected finding id (drives emphasis). */
  selectedFindingId: string | null;
  /** Tapped a zone overlay → caller selects the finding. */
  onZonePress(findingId: string | null): void;
}

export function SkinMapOverlayV34({
  photoUri,
  width,
  height,
  overlays,
  selectedFindingId,
  onZonePress,
}: SkinMapOverlayV34Props) {
  // Reanimated overlay opacity — gently fades all overlays in on mount,
  // and dims unselected overlays when a chip is active.
  const enter = useSharedValue(0);
  React.useEffect(() => {
    enter.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter]);
  const overlayWrapStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
  }));

  // Deduplicate overlays by zone+concern so the same zone isn't painted
  // twice. The backend already does this, but defensive.
  const renderableOverlays = useMemo(() => {
    const seen = new Set<string>();
    const out: ZoneOverlayV2[] = [];
    for (const o of overlays) {
      const key = `${o.zone}:${o.concern}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(o);
    }
    return out;
  }, [overlays]);

  // viewBox is sized so the face frame's normalized [0..1] coords land
  // on a stable internal grid regardless of the parent width/height.
  const VB_W = 1000;
  const VB_H = 1000;

  return (
    <View
      style={[
        styles.frame,
        { width, height, borderRadius: 18, overflow: 'hidden' },
      ]}
    >
      <Image
        source={photoUri}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={220}
      />

      {/* Quiet vignette so overlays read clearly without darkening the face. */}
      <View pointerEvents="none" style={styles.vignette} />

      <Animated.View
        style={[StyleSheet.absoluteFillObject, overlayWrapStyle]}
        pointerEvents="box-none"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          pointerEvents="none"
        >
          <Defs>
            {renderableOverlays.map((o, i) => {
              const swatch = CONCERN_SWATCH[o.concern];
              const id = `grad-${i}-${o.zone}`;
              return (
                <RadialGradient
                  key={id}
                  id={id}
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                  fx="50%"
                  fy="50%"
                >
                  <Stop offset="0%" stopColor={swatch.core} stopOpacity={0.9} />
                  <Stop offset="55%" stopColor={swatch.halo} stopOpacity={0.55} />
                  <Stop offset="100%" stopColor={swatch.halo} stopOpacity={0} />
                </RadialGradient>
              );
            })}
          </Defs>

          {renderableOverlays.map((o, i) => {
            const anchor = ZONE_COORDS[o.zone];
            const cx = anchor.cx * VB_W;
            const cy = anchor.cy * VB_H;
            const isSelected = selectedFindingId === o.findingId;
            const isDimmed = selectedFindingId !== null && !isSelected;
            const baseOpacity = o.opacity * (isDimmed ? 0.35 : 1);
            const emphasis = isSelected ? 1.18 : 1;

            return (
              <OverlayShape
                key={`shape-${i}-${o.zone}-${o.concern}`}
                style={o.style}
                cx={cx}
                cy={cy}
                gradientId={`grad-${i}-${o.zone}`}
                core={CONCERN_SWATCH[o.concern].core}
                opacity={baseOpacity}
                emphasis={emphasis}
              />
            );
          })}
        </Svg>

        {/* Touch hit-targets — small absolute zones placed over each
            overlay so tapping the photo selects the finding. */}
        {renderableOverlays.map((o, i) => {
          const anchor = ZONE_COORDS[o.zone];
          const hit = 64;
          return (
            <Pressable
              key={`hit-${i}-${o.zone}`}
              onPress={() =>
                onZonePress(
                  selectedFindingId === o.findingId ? null : o.findingId,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Toggle ${o.concern.replace('_', ' ')} on ${o.zone.replace('_', ' ')}`}
              hitSlop={6}
              style={{
                position: 'absolute',
                left: anchor.cx * width - hit / 2,
                top: anchor.cy * height - hit / 2,
                width: hit,
                height: hit,
                borderRadius: hit / 2,
              }}
            />
          );
        })}

        {/* Tap-anywhere-else deselect — sits beneath the per-zone hits. */}
        <Pressable
          onPress={() => onZonePress(null)}
          style={StyleSheet.absoluteFillObject}
          accessibilityLabel="Deselect"
          pointerEvents={selectedFindingId ? 'auto' : 'none'}
        />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// OverlayShape — switches on style to render the right shape.
// ---------------------------------------------------------------------------

function OverlayShape({
  style,
  cx,
  cy,
  gradientId,
  core,
  opacity,
  emphasis,
}: {
  style: OverlayStyle;
  cx: number;
  cy: number;
  gradientId: string;
  core: string;
  opacity: number;
  emphasis: number;
}) {
  if (style === 'pin') {
    // Localized spot — small filled dot with a thin halo ring.
    const r = 26 * emphasis;
    return (
      <>
        <Circle
          cx={cx}
          cy={cy}
          r={r * 1.7}
          fill={core}
          opacity={opacity * 0.18}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r * 0.55}
          fill={core}
          opacity={opacity * 0.9}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={core}
          strokeWidth={1.5}
          opacity={opacity * 0.7}
        />
      </>
    );
  }

  if (style === 'outline') {
    // Sharp contoured ring — for fine lines / wrinkles. Two thin
    // concentric strokes give an editorial annotation feel.
    const r = 120 * emphasis;
    return (
      <>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={core}
          strokeWidth={1.2}
          opacity={opacity * 1.3}
          strokeDasharray="6 6"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r * 0.6}
          fill={`url(#${gradientId})`}
          opacity={opacity * 0.6}
        />
      </>
    );
  }

  if (style === 'heatmap') {
    // Broader radial wash with stronger center — diffuse signals
    // like oiliness or hydration.
    const r = 180 * emphasis;
    return (
      <>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill={`url(#${gradientId})`}
          opacity={opacity * 1.05}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r * 0.35}
          fill={core}
          opacity={opacity * 0.4}
        />
      </>
    );
  }

  // soft_mask (default) — translucent radial wash, premium and quiet.
  const r = 160 * emphasis;
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={r}
      fill={`url(#${gradientId})`}
      opacity={opacity}
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#F5EDE2',
    position: 'relative',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.06)',
  },
});

// ---------------------------------------------------------------------------
// Public helpers for the parent UI.
// ---------------------------------------------------------------------------

/** Surface color for a concern (used by chip + callout). */
export function concernColor(concern: ConcernId): string {
  return CONCERN_SWATCH[concern].core;
}

/** Soft halo color for a concern. */
export function concernHaloColor(concern: ConcernId): string {
  return CONCERN_SWATCH[concern].halo;
}
