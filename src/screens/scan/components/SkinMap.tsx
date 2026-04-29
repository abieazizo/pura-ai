/**
 * SkinMap — v16.0 visual-proof skin map overlay.
 *
 * The user's demand: "show WHERE issues are detected on the face,
 * in a premium and elegant way, not creepy and not medically
 * alarming."
 *
 * The face-scan AI already returns each finding with a normalized
 * `regions: FaceRegion[]` array (forehead / t_zone / left_cheek /
 * right_cheek / nose / chin / jawline / under_eyes / across_face).
 * SkinMap renders the captured photo with elegant translucent
 * overlay shapes that visualise those regions, concern-by-concern.
 *
 * Visual grammar (one concern visible at a time by default):
 *   • Redness            → soft coral wash (rgba 230 100 92 / 0.18)
 *   • Pigmentation/Tone  → warm gold speckle on pigmented zones
 *   • Texture / Pores    → fine cool dot matrix grid
 *   • Breakouts          → pinpoint markers with halo on hotspots
 *   • Hydration          → cool blue tint over driest regions
 *   • Sensitivity        → hairline soft outline along the region
 *   • Oiliness           → subtle pearl sheen across T-zone
 *   • Under-eyes         → lavender contour glow under eyes only
 *
 * Premium principles:
 *   • One mask visible at a time (chip switches the active concern).
 *   • Soft edges via SVG radial gradients, never hard shapes.
 *   • Always translucent so the user's face is always visible.
 *   • No medical iconography, no pulsing red dots, no cross-hairs.
 *
 * Geometry: the 9 FaceRegion values map to fixed anatomical
 * polygons normalised within the photo box (same coordinate
 * convention the rest of the app uses). The overlay is illustrative
 * — the AI does not return pixel-accurate masks — but the regions
 * are anatomically consistent so the user reads them as "yes, that's
 * roughly where my forehead / chin / cheeks are."
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { Concern, ConcernCategory } from '@/types';
import type { FaceRegion } from '@/ai/ai-contracts';
import { CATEGORY_LABEL } from '@/utils/concerns';

// ---------------------------------------------------------------------------
// Region geometry — normalised within the photo box (0..1 on each axis).
//
// Each polygon is hand-tuned against the v8.2 face-portrait conventions
// already used by the rest of the app (oval centred, hairline ~22%,
// chin tip ~92%). Polygons return SVG path strings so the renderer
// can clip a translucent fill to each.
// ---------------------------------------------------------------------------

interface RegionPath {
  /** SVG path command string normalised to a 1×1 box. */
  d: string;
  /** Center point (used for marker / dot placement). */
  cx: number;
  cy: number;
  /** Approximate axes for ellipse-style overlays. */
  rx: number;
  ry: number;
}

function pathFromPoints(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const head = `M ${first[0]} ${first[1]}`;
  const tail = rest.map(([x, y]) => `L ${x} ${y}`).join(' ');
  return `${head} ${tail} Z`;
}

const REGION_PATHS: Record<FaceRegion, RegionPath> = {
  forehead: {
    d: pathFromPoints([
      [0.28, 0.22],
      [0.72, 0.22],
      [0.78, 0.32],
      [0.66, 0.40],
      [0.34, 0.40],
      [0.22, 0.32],
    ]),
    cx: 0.5,
    cy: 0.32,
    rx: 0.28,
    ry: 0.10,
  },
  t_zone: {
    d: pathFromPoints([
      [0.42, 0.40],
      [0.58, 0.40],
      [0.56, 0.66],
      [0.44, 0.66],
    ]),
    cx: 0.5,
    cy: 0.52,
    rx: 0.10,
    ry: 0.13,
  },
  left_cheek: {
    d: pathFromPoints([
      [0.18, 0.50],
      [0.36, 0.50],
      [0.40, 0.66],
      [0.22, 0.72],
    ]),
    cx: 0.28,
    cy: 0.60,
    rx: 0.12,
    ry: 0.12,
  },
  right_cheek: {
    d: pathFromPoints([
      [0.64, 0.50],
      [0.82, 0.50],
      [0.78, 0.72],
      [0.60, 0.66],
    ]),
    cx: 0.72,
    cy: 0.60,
    rx: 0.12,
    ry: 0.12,
  },
  nose: {
    d: pathFromPoints([
      [0.46, 0.46],
      [0.54, 0.46],
      [0.56, 0.62],
      [0.50, 0.66],
      [0.44, 0.62],
    ]),
    cx: 0.5,
    cy: 0.56,
    rx: 0.06,
    ry: 0.10,
  },
  chin: {
    d: pathFromPoints([
      [0.36, 0.78],
      [0.64, 0.78],
      [0.58, 0.92],
      [0.42, 0.92],
    ]),
    cx: 0.5,
    cy: 0.85,
    rx: 0.14,
    ry: 0.07,
  },
  jawline: {
    d: pathFromPoints([
      [0.22, 0.74],
      [0.78, 0.74],
      [0.66, 0.88],
      [0.34, 0.88],
    ]),
    cx: 0.5,
    cy: 0.81,
    rx: 0.28,
    ry: 0.07,
  },
  under_eyes: {
    d: pathFromPoints([
      [0.26, 0.46],
      [0.46, 0.46],
      [0.46, 0.52],
      [0.26, 0.52],
    ]),
    cx: 0.36,
    cy: 0.49,
    rx: 0.10,
    ry: 0.03,
  },
  across_face: {
    d: pathFromPoints([
      [0.16, 0.30],
      [0.84, 0.30],
      [0.80, 0.84],
      [0.20, 0.84],
    ]),
    cx: 0.5,
    cy: 0.57,
    rx: 0.34,
    ry: 0.27,
  },
};

// Categories the SkinMap supports. Each one defines the visual
// language used to render its regions.
type MaskKind =
  | 'wash' // soft solid translucent fill
  | 'speckle' // small dots scattered inside the region
  | 'grid' // fine dot matrix
  | 'pinpoints' // a few prominent markers with halos
  | 'sheen' // soft pearl sheen
  | 'glow'; // soft radial glow

interface ConcernVisual {
  label: string;
  color: string;
  kind: MaskKind;
}

const CONCERN_VISUAL: Record<ConcernCategory, ConcernVisual> = {
  breakouts: { label: 'Breakouts', color: '#E66B5C', kind: 'pinpoints' },
  hydration: { label: 'Hydration', color: '#7CB0FF', kind: 'wash' },
  texture: { label: 'Texture', color: '#A8C7C0', kind: 'grid' },
  tone: { label: 'Tone', color: '#D9A75E', kind: 'speckle' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SkinMapProps {
  photoUri: string;
  concerns: Concern[];
  /** When provided, the AI's findings (with raw FaceRegion arrays)
   *  are used to map each concern to its anatomical regions. When
   *  not provided, the deterministic concern.region string is mapped
   *  via a best-guess lookup. */
  aiRegionsByCategory?: Partial<Record<ConcernCategory, FaceRegion[]>>;
  /** Photo aspect ratio (height / width). Default 1.32. */
  aspectRatio?: number;
}

export function SkinMap({
  photoUri,
  concerns,
  aiRegionsByCategory,
  aspectRatio = 1.32,
}: SkinMapProps) {
  // Tabs only render concerns we have data for AND that have a
  // visual treatment defined. Calm concerns are excluded — there's
  // nothing to highlight.
  const tabs = useMemo(() => {
    return concerns
      .filter((c) => c.severity !== 'calm')
      .filter((c) => CONCERN_VISUAL[c.category])
      .map((c) => c.category);
  }, [concerns]);

  const [activeTab, setActiveTab] = useState<ConcernCategory | null>(
    tabs[0] ?? null
  );

  const photoSize = { w: 1, h: aspectRatio }; // SVG viewBox is normalised
  const visual = activeTab ? CONCERN_VISUAL[activeTab] : null;
  const activeConcern = concerns.find((c) => c.category === activeTab) ?? null;

  // Build the region list for the active concern. Prefer AI regions;
  // fall back to deterministic concern.region string mapping.
  const regions: FaceRegion[] = useMemo(() => {
    if (!activeTab) return [];
    if (aiRegionsByCategory && aiRegionsByCategory[activeTab]) {
      return aiRegionsByCategory[activeTab]!;
    }
    if (activeConcern) {
      return regionsFromConcernText(activeConcern.region);
    }
    return [];
  }, [activeTab, aiRegionsByCategory, activeConcern]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.photoFrame, { aspectRatio: 1 / aspectRatio }]}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
        />
        {visual && regions.length > 0 ? (
          <MaskOverlay
            regions={regions}
            visual={visual}
            photoSize={photoSize}
          />
        ) : null}
      </View>

      {tabs.length > 0 ? (
        <View style={styles.tabRow}>
          {tabs.map((cat) => {
            const v = CONCERN_VISUAL[cat];
            const active = activeTab === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveTab(active ? null : cat)}
                accessibilityRole="button"
                accessibilityLabel={`${v.label} overlay${
                  active ? ', active' : ''
                }`}
                style={({ pressed }) => [
                  styles.tab,
                  active && styles.tabActive,
                  active && { borderColor: v.color },
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.tabDot, { backgroundColor: v.color }]} />
                <Text
                  style={[
                    styles.tabLabel,
                    active && styles.tabLabelActive,
                  ]}
                  maxFontSizeMultiplier={1.1}
                >
                  {CATEGORY_LABEL[cat]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.calmCaption} maxFontSizeMultiplier={1.2}>
          No noticeable concerns to highlight in this scan.
        </Text>
      )}

      {activeConcern ? (
        <Text
          style={styles.maskCaption}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
        >
          {activeConcern.finding}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mask overlay — animated SVG, swaps as the active concern changes.
// ---------------------------------------------------------------------------

function MaskOverlay({
  regions,
  visual,
  photoSize,
}: {
  regions: FaceRegion[];
  visual: ConcernVisual;
  photoSize: { w: number; h: number };
}) {
  const opacity = useSharedValue(0);
  React.useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [visual.kind, visual.color, regions, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // SVG uses normalised coords (0..1 wide × 0..aspect tall).
  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, animatedStyle]}
      pointerEvents="none"
    >
      <Svg
        viewBox={`0 0 ${photoSize.w} ${photoSize.h}`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <RadialGradient id="soft-radial" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
            <Stop offset="0" stopColor={visual.color} stopOpacity={0.6} />
            <Stop offset="0.7" stopColor={visual.color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={visual.color} stopOpacity={0} />
          </RadialGradient>
          {regions.map((r, i) => {
            const path = REGION_PATHS[r];
            return (
              <ClipPath key={`clip-${i}`} id={`clip-${i}`}>
                <Path d={path.d} />
              </ClipPath>
            );
          })}
        </Defs>

        {/* Render each region according to the visual.kind */}
        {regions.map((r, i) => {
          const path = REGION_PATHS[r];
          const id = `clip-${i}`;
          switch (visual.kind) {
            case 'wash':
              return (
                <Path
                  key={`wash-${i}`}
                  d={path.d}
                  fill={visual.color}
                  fillOpacity={0.18}
                />
              );
            case 'glow':
              return (
                <Ellipse
                  key={`glow-${i}`}
                  cx={path.cx}
                  cy={path.cy}
                  rx={path.rx * 1.1}
                  ry={path.ry * 1.1}
                  fill="url(#soft-radial)"
                />
              );
            case 'sheen':
              return (
                <Path
                  key={`sheen-${i}`}
                  d={path.d}
                  fill={visual.color}
                  fillOpacity={0.10}
                />
              );
            case 'speckle':
              return (
                <SpeckleField
                  key={`speckle-${i}`}
                  region={path}
                  clipId={id}
                  color={visual.color}
                />
              );
            case 'grid':
              return (
                <DotGrid
                  key={`grid-${i}`}
                  region={path}
                  clipId={id}
                  color={visual.color}
                />
              );
            case 'pinpoints':
              return (
                <Pinpoints
                  key={`pinpoints-${i}`}
                  region={path}
                  color={visual.color}
                />
              );
          }
        })}
      </Svg>
    </Animated.View>
  );
}

// Speckle: 12 small irregular dots inside the region.
function SpeckleField({
  region,
  clipId,
  color,
}: {
  region: RegionPath;
  clipId: string;
  color: string;
}) {
  const SEED = [
    [0.42, 0.34],
    [0.58, 0.36],
    [0.34, 0.5],
    [0.62, 0.55],
    [0.46, 0.6],
    [0.32, 0.62],
    [0.7, 0.62],
    [0.4, 0.7],
    [0.55, 0.74],
    [0.28, 0.78],
    [0.66, 0.78],
    [0.5, 0.4],
  ] as const;
  return (
    <>
      {SEED.map(([x, y], i) => (
        <Circle
          key={i}
          cx={region.cx + (x - 0.5) * region.rx * 1.6}
          cy={region.cy + (y - 0.5) * region.ry * 1.8}
          r={0.006 + ((i % 3) * 0.002)}
          fill={color}
          fillOpacity={0.7}
          clipPath={`url(#${clipId})`}
        />
      ))}
    </>
  );
}

// DotGrid: regular fine dots inside the region (texture treatment).
function DotGrid({
  region,
  clipId,
  color,
}: {
  region: RegionPath;
  clipId: string;
  color: string;
}) {
  const dots: Array<{ x: number; y: number }> = [];
  const step = 0.018;
  for (
    let x = region.cx - region.rx;
    x <= region.cx + region.rx;
    x += step
  ) {
    for (
      let y = region.cy - region.ry;
      y <= region.cy + region.ry;
      y += step
    ) {
      dots.push({ x, y });
    }
  }
  return (
    <>
      {dots.map((d, i) => (
        <Circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={0.0035}
          fill={color}
          fillOpacity={0.62}
          clipPath={`url(#${clipId})`}
        />
      ))}
    </>
  );
}

// Pinpoints: a few prominent markers with halos for breakout regions.
function Pinpoints({
  region,
  color,
}: {
  region: RegionPath;
  color: string;
}) {
  const POSITIONS = [
    [0, 0],
    [0.35, -0.25],
    [-0.30, 0.15],
    [0.20, 0.30],
  ] as const;
  return (
    <>
      {POSITIONS.map(([dx, dy], i) => {
        const cx = region.cx + dx * region.rx;
        const cy = region.cy + dy * region.ry;
        return (
          <React.Fragment key={i}>
            <Circle cx={cx} cy={cy} r={0.022} fill={color} fillOpacity={0.18} />
            <Circle cx={cx} cy={cy} r={0.014} fill={color} fillOpacity={0.32} />
            <Circle cx={cx} cy={cy} r={0.006} fill={color} fillOpacity={0.95} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// Map the deterministic concern.region string back to FaceRegion[].
function regionsFromConcernText(region: string): FaceRegion[] {
  const r = region.toLowerCase();
  if (r.includes('forehead')) return ['forehead'];
  if (r.includes('chin') || r.includes('jaw')) return ['chin'];
  if (r.includes('cheek')) return ['left_cheek', 'right_cheek'];
  if (r.includes('nose') || r.includes('t-zone') || r.includes('t zone')) {
    return ['t_zone'];
  }
  if (r.includes('eye')) return ['under_eyes'];
  return ['across_face'];
}

// Suppress lint — palette import preserved for future tonal mapping.
void palette;
void Rect;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  photoFrame: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tabRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  tabActive: {
    backgroundColor: palette.bgDeep,
    borderWidth: 1.5,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.inkSecondary,
  },
  tabLabelActive: {
    color: palette.ink,
  },
  maskCaption: {
    marginTop: 14,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkSecondary,
  },
  calmCaption: {
    marginTop: 14,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkTertiary,
  },
});
