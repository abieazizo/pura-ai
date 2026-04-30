/**
 * FaceSkinMap — v17.1 honest, image-anchored, per-concern overlay.
 *
 * Hard requirements driving this rewrite:
 *
 *   1. Renders the ACTUAL captured face image, not a duplicate or
 *      diagram.
 *   2. AI returns image-anchored data (face_overlay + per-finding
 *      region_polygon, normalised 0..1). v17.1 trusts the contract
 *      and lays overlays directly on the captured image.
 *   3. Each concern type renders with its own VISUAL TREATMENT, not
 *      a copy-paste polygon. Premium and editorial; never clinical.
 *   4. Default state shows ONE concern (the primary). Concern chips
 *      let the user toggle which concern is isolated. Showing every
 *      overlay simultaneously was visually noisy and hid the story.
 *   5. When AI omits face_overlay (old persisted scans) OR every
 *      finding is below the visibility threshold, we show a clean
 *      fallback state — never a broken or empty overlay.
 *
 * Per-concern visual styles (the v17.1 brief):
 *   • redness → soft coral feathered wash (Gaussian blur, no stroke)
 *   • breakouts → clustered pinpoint halos (small radial dots
 *     scattered along the polygon centroid)
 *   • dark_marks / pigmentation → warm amber/golden soft patch
 *   • under_eyes → soft lilac arc band
 *   • texture / pores / oiliness → subtle micrograin sheen with
 *     a hairline stroke (no harsh fill)
 *   • hydration / sensitivity → cool blue feathered wash
 *
 * Render strategy notes:
 *   • viewBox = "0 0 1 1" + preserveAspectRatio="none" — coordinates
 *     map 1:1 to the captured image normalised 0..1 space.
 *   • Container's height is computed from the photo's natural aspect
 *     ratio via RNImage.getSize so contentFit="cover" doesn't crop
 *     and the SVG stays in lockstep with the visible photo.
 *   • Each visual style is implemented as its own renderer. Falls
 *     back to a plain feathered wash when the concern type isn't
 *     specifically styled.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeColorMatrix,
  FeGaussianBlur,
  Filter,
  G,
  LinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type {
  ConcernType,
  FaceConcernFinding,
  FaceRegion,
  FaceScanAnalysis,
} from '@/ai/ai-contracts';
import { palette, scanTypography } from '@/theme';
import type { ConcernCategory } from '@/types';

// ---------------------------------------------------------------------------
// Concern → category mapping. Mirrors translateAnalysis.ts.
// ---------------------------------------------------------------------------

const AI_TO_APP_CATEGORY: Record<ConcernType, ConcernCategory> = {
  breakouts: 'breakouts',
  hydration: 'hydration',
  texture: 'texture',
  dark_marks: 'tone',
  redness: 'breakouts',
  oiliness: 'breakouts',
  sensitivity: 'hydration',
  pores: 'texture',
};

// Per-CONCERN-TYPE visual treatment. Distinct from CATEGORY_COLOR
// because two concerns mapped to the same app category can still
// render differently — e.g. redness vs breakouts both fall under
// 'breakouts' but visually deserve different treatments.
type VisualStyle =
  | 'feathered_wash' // soft blurred fill, no stroke
  | 'pinpoint_halos' // small dots clustered along the polygon
  | 'warm_patch' // golden patch with subtle radial gradient
  | 'lilac_arc' // narrow lilac band, used for under_eyes
  | 'micrograin' // hairline stroke + thin fill, sheen-like
  | 'cool_wash'; // cool-blue blurred fill

const CONCERN_STYLE: Record<ConcernType, { color: string; style: VisualStyle }> =
  {
    redness: { color: '#E66B5C', style: 'feathered_wash' },
    breakouts: { color: '#D85B68', style: 'pinpoint_halos' },
    oiliness: { color: '#C8B07A', style: 'micrograin' },
    pores: { color: '#A8C7C0', style: 'micrograin' },
    texture: { color: '#A8C7C0', style: 'micrograin' },
    dark_marks: { color: '#D9A75E', style: 'warm_patch' },
    hydration: { color: '#7CB0FF', style: 'cool_wash' },
    sensitivity: { color: '#9DB7D9', style: 'cool_wash' },
  };

// Category-level color (used for chips + headline). Mirrors what the
// FindingRow rows tint with elsewhere.
const CATEGORY_COLOR: Record<ConcernCategory, string> = {
  breakouts: '#E66B5C',
  hydration: '#7CB0FF',
  texture: '#A8C7C0',
  tone: '#D9A75E',
};

const SEVERITY_ALPHA: Record<FaceConcernFinding['severity'], number> = {
  none: 0,
  low: 0.34,
  mild: 0.46,
  moderate: 0.62,
  high: 0.78,
};

// ---------------------------------------------------------------------------
// Props.
// ---------------------------------------------------------------------------

export interface FaceSkinMapProps {
  photoUri: string;
  aiAnalysis: FaceScanAnalysis;
  /** When set, that category's overlay renders in isolation. When null,
   *  the component picks its own primary concern (highest severity). */
  selectedCategory?: ConcernCategory | null;
  /** Display width in pt. Height is derived from the photo's natural
   *  aspect ratio so overlay coordinates land where they should. */
  width: number;
  fallbackAspectRatio?: number;
}

// ---------------------------------------------------------------------------
// Geometry helpers.
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0.5, y: 0.5 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

function bounds(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Landmark-anchored fallback shape when the AI omits a polygon. */
function fallbackEllipseFor(
  region: FaceRegion,
  overlay: NonNullable<FaceScanAnalysis['face_overlay']>
): { cx: number; cy: number; rx: number; ry: number } {
  const { face_box, landmarks } = overlay;
  const eyeMid = midpoint(landmarks.left_eye, landmarks.right_eye);
  const faceW = face_box.width;
  const faceH = face_box.height;

  switch (region) {
    case 'forehead':
      return {
        cx: landmarks.forehead_center.x,
        cy: landmarks.forehead_center.y,
        rx: faceW * 0.36,
        ry: faceH * 0.15,
      };
    case 't_zone':
      return {
        cx: eyeMid.x,
        cy: midpoint(eyeMid, landmarks.nose_tip).y,
        rx: faceW * 0.18,
        ry: faceH * 0.26,
      };
    case 'nose':
      return {
        cx: landmarks.nose_tip.x,
        cy: landmarks.nose_tip.y,
        rx: faceW * 0.12,
        ry: faceH * 0.14,
      };
    case 'left_cheek':
      return {
        cx: landmarks.left_eye.x - faceW * 0.04,
        cy: midpoint(landmarks.left_eye, landmarks.mouth_center).y +
          faceH * 0.02,
        rx: faceW * 0.2,
        ry: faceH * 0.18,
      };
    case 'right_cheek':
      return {
        cx: landmarks.right_eye.x + faceW * 0.04,
        cy: midpoint(landmarks.right_eye, landmarks.mouth_center).y +
          faceH * 0.02,
        rx: faceW * 0.2,
        ry: faceH * 0.18,
      };
    case 'chin':
      return {
        cx: landmarks.chin.x,
        cy: landmarks.chin.y,
        rx: faceW * 0.22,
        ry: faceH * 0.12,
      };
    case 'jawline':
      return {
        cx: face_box.x + faceW / 2,
        cy: face_box.y + faceH * 0.88,
        rx: faceW * 0.42,
        ry: faceH * 0.08,
      };
    case 'under_eyes':
      return {
        cx: eyeMid.x,
        cy: eyeMid.y + faceH * 0.06,
        rx: faceW * 0.34,
        ry: faceH * 0.045,
      };
    case 'across_face':
    default:
      return {
        cx: face_box.x + faceW / 2,
        cy: face_box.y + faceH / 2,
        rx: faceW * 0.46,
        ry: faceH * 0.46,
      };
  }
}

// ---------------------------------------------------------------------------
// Worst-finding-per-category picker. Same as v17.0; kept local.
// ---------------------------------------------------------------------------

function pickWorstByCategory(
  findings: FaceConcernFinding[]
): Map<ConcernCategory, FaceConcernFinding> {
  const SEV_ORDER: Record<FaceConcernFinding['severity'], number> = {
    none: 0,
    low: 1,
    mild: 2,
    moderate: 3,
    high: 4,
  };
  const map = new Map<ConcernCategory, FaceConcernFinding>();
  for (const f of findings) {
    if (f.severity === 'none' || f.severity === 'low') continue;
    const cat = AI_TO_APP_CATEGORY[f.concern];
    const existing = map.get(cat);
    if (!existing || SEV_ORDER[f.severity] > SEV_ORDER[existing.severity]) {
      map.set(cat, f);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Per-concern renderers. Each takes the resolved polygon (or
// fallback ellipse) plus the concern's color + alpha and returns
// the SVG sub-tree.
// ---------------------------------------------------------------------------

interface RenderInput {
  /** Pre-computed polygon points in 0..1 image space. */
  polygon?: Point[];
  /** Optional fallback ellipse params in 0..1 image space. */
  ellipse?: { cx: number; cy: number; rx: number; ry: number };
  color: string;
  alpha: number;
  /** Unique key for SVG <Defs> ids. */
  defsKey: string;
}

function pointsToString(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function FeatheredWash({
  polygon,
  ellipse,
  color,
  alpha,
  defsKey,
}: RenderInput) {
  const filterId = `wash-blur-${defsKey}`;
  return (
    <G>
      <Defs>
        <Filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <FeGaussianBlur stdDeviation={0.012} />
        </Filter>
      </Defs>
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={color}
          fillOpacity={alpha}
          filter={`url(#${filterId})`}
        />
      ) : ellipse ? (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          fill={color}
          fillOpacity={alpha}
          filter={`url(#${filterId})`}
        />
      ) : null}
    </G>
  );
}

function CoolWash(props: RenderInput) {
  // Same renderer as FeatheredWash but kept as a separate component
  // to make per-style tuning trivial later.
  return <FeatheredWash {...props} />;
}

function WarmPatch({ polygon, ellipse, color, alpha, defsKey }: RenderInput) {
  const gradId = `warm-patch-${defsKey}`;
  const filterId = `warm-blur-${defsKey}`;
  // For polygons, derive a center + a soft radial gradient.
  const c = polygon ? centroid(polygon) : ellipse
    ? { x: ellipse.cx, y: ellipse.cy }
    : { x: 0.5, y: 0.5 };
  const r = polygon
    ? Math.max(
        0.06,
        (() => {
          const b = bounds(polygon);
          return Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.6;
        })()
      )
    : ellipse
    ? Math.max(ellipse.rx, ellipse.ry) * 1.1
    : 0.18;
  return (
    <G>
      <Defs>
        <RadialGradient
          id={gradId}
          cx={c.x}
          cy={c.y}
          r={r}
          fx={c.x}
          fy={c.y}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={color} stopOpacity={alpha * 0.95} />
          <Stop offset="0.6" stopColor={color} stopOpacity={alpha * 0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <Filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <FeGaussianBlur stdDeviation={0.008} />
        </Filter>
      </Defs>
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={`url(#${gradId})`}
          filter={`url(#${filterId})`}
        />
      ) : ellipse ? (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          fill={`url(#${gradId})`}
          filter={`url(#${filterId})`}
        />
      ) : null}
    </G>
  );
}

function PinpointHalos({
  polygon,
  ellipse,
  color,
  alpha,
  defsKey,
}: RenderInput) {
  // Sample a small number of points within the polygon / ellipse and
  // render as soft glowing halos. This reads as "small clustered
  // breakouts" rather than one solid blob.
  const filterId = `halo-blur-${defsKey}`;
  const dots: Point[] = useMemo(() => {
    if (polygon) {
      const c = centroid(polygon);
      const b = bounds(polygon);
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      // Deterministic mini-cluster around the centroid.
      return [
        c,
        { x: clamp01(c.x - w * 0.22), y: clamp01(c.y - h * 0.18) },
        { x: clamp01(c.x + w * 0.24), y: clamp01(c.y - h * 0.06) },
        { x: clamp01(c.x - w * 0.1), y: clamp01(c.y + h * 0.22) },
        { x: clamp01(c.x + w * 0.18), y: clamp01(c.y + h * 0.18) },
      ];
    }
    if (ellipse) {
      const { cx, cy, rx, ry } = ellipse;
      return [
        { x: cx, y: cy },
        { x: clamp01(cx - rx * 0.5), y: clamp01(cy - ry * 0.4) },
        { x: clamp01(cx + rx * 0.55), y: clamp01(cy - ry * 0.2) },
        { x: clamp01(cx - rx * 0.25), y: clamp01(cy + ry * 0.5) },
        { x: clamp01(cx + rx * 0.4), y: clamp01(cy + ry * 0.45) },
      ];
    }
    return [];
  }, [polygon, ellipse]);

  return (
    <G>
      <Defs>
        <Filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <FeGaussianBlur stdDeviation={0.006} />
        </Filter>
      </Defs>
      {/* Subtle wash under the dots so the cluster reads as a zone */}
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={color}
          fillOpacity={alpha * 0.18}
          filter={`url(#${filterId})`}
        />
      ) : ellipse ? (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          fill={color}
          fillOpacity={alpha * 0.18}
          filter={`url(#${filterId})`}
        />
      ) : null}
      {dots.map((d, i) => (
        <G key={i}>
          <Circle
            cx={d.x}
            cy={d.y}
            r={0.018}
            fill={color}
            fillOpacity={alpha * 0.55}
            filter={`url(#${filterId})`}
          />
          <Circle
            cx={d.x}
            cy={d.y}
            r={0.008}
            fill={color}
            fillOpacity={Math.min(0.95, alpha * 1.1)}
          />
        </G>
      ))}
    </G>
  );
}

function LilacArc({ polygon, ellipse, color, alpha, defsKey }: RenderInput) {
  // Used for under_eyes-like findings. Renders a narrow horizontal
  // band rather than a wide blob.
  const filterId = `lilac-blur-${defsKey}`;
  return (
    <G>
      <Defs>
        <Filter id={filterId} x="-5%" y="-30%" width="110%" height="160%">
          <FeGaussianBlur stdDeviation={0.01} />
        </Filter>
      </Defs>
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={color}
          fillOpacity={alpha * 0.85}
          filter={`url(#${filterId})`}
        />
      ) : ellipse ? (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={Math.max(ellipse.ry * 0.7, 0.025)}
          fill={color}
          fillOpacity={alpha * 0.85}
          filter={`url(#${filterId})`}
        />
      ) : null}
    </G>
  );
}

function Micrograin({
  polygon,
  ellipse,
  color,
  alpha,
  defsKey,
}: RenderInput) {
  // Sheen treatment for texture / pores / oiliness. Hairline stroke
  // + low fill — hints at the area without flooding it.
  const filterId = `grain-blur-${defsKey}`;
  return (
    <G>
      <Defs>
        <Filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <FeGaussianBlur stdDeviation={0.004} />
        </Filter>
      </Defs>
      {polygon ? (
        <>
          <Polygon
            points={pointsToString(polygon)}
            fill={color}
            fillOpacity={alpha * 0.34}
            filter={`url(#${filterId})`}
          />
          <Polygon
            points={pointsToString(polygon)}
            fill="none"
            stroke={color}
            strokeOpacity={Math.min(0.95, alpha * 1.3)}
            strokeWidth={0.0035}
            strokeLinejoin="round"
          />
        </>
      ) : ellipse ? (
        <>
          <Ellipse
            cx={ellipse.cx}
            cy={ellipse.cy}
            rx={ellipse.rx}
            ry={ellipse.ry}
            fill={color}
            fillOpacity={alpha * 0.34}
            filter={`url(#${filterId})`}
          />
          <Ellipse
            cx={ellipse.cx}
            cy={ellipse.cy}
            rx={ellipse.rx}
            ry={ellipse.ry}
            fill="none"
            stroke={color}
            strokeOpacity={Math.min(0.95, alpha * 1.3)}
            strokeWidth={0.0035}
          />
        </>
      ) : null}
    </G>
  );
}

const STYLE_RENDERERS: Record<VisualStyle, React.FC<RenderInput>> = {
  feathered_wash: FeatheredWash,
  cool_wash: CoolWash,
  pinpoint_halos: PinpointHalos,
  warm_patch: WarmPatch,
  lilac_arc: LilacArc,
  micrograin: Micrograin,
};

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

export function FaceSkinMap({
  photoUri,
  aiAnalysis,
  selectedCategory = null,
  width,
  fallbackAspectRatio = 4 / 5,
}: FaceSkinMapProps) {
  const [aspectRatio, setAspectRatio] = useState<number>(fallbackAspectRatio);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      photoUri,
      (w, h) => {
        if (cancelled || !w || !h) return;
        setAspectRatio(w / h);
      },
      () => {
        /* swallow — fallback ratio stands */
      }
    );
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  const overlay = aiAnalysis.face_overlay;
  const height = Math.round(width / aspectRatio);

  // Build the per-category overlay list (worst finding per category).
  const overlays = useMemo(() => {
    if (!overlay) return [];
    const byCat = pickWorstByCategory(aiAnalysis.findings);
    const items: Array<{
      category: ConcernCategory;
      concernType: ConcernType;
      style: VisualStyle;
      color: string;
      alpha: number;
      finding: FaceConcernFinding;
      polygon?: Point[];
      ellipse?: { cx: number; cy: number; rx: number; ry: number };
    }> = [];
    for (const [category, finding] of byCat.entries()) {
      const treatment = CONCERN_STYLE[finding.concern];
      const alpha = SEVERITY_ALPHA[finding.severity] ?? 0.5;
      const polygon = finding.region_polygon;
      const item = {
        category,
        concernType: finding.concern,
        style: treatment.style,
        color: treatment.color,
        alpha,
        finding,
      };
      if (polygon && polygon.length >= 3) {
        items.push({
          ...item,
          polygon: polygon.map((p) => ({
            x: clamp01(p.x),
            y: clamp01(p.y),
          })),
        });
      } else {
        const region: FaceRegion = finding.regions[0] ?? 'across_face';
        items.push({
          ...item,
          ellipse: fallbackEllipseFor(region, overlay),
        });
      }
    }
    return items;
  }, [aiAnalysis.findings, overlay]);

  // v17.1 — by default isolate the most severe concern. The host
  // screen can override via `selectedCategory`. When the host passes
  // null explicitly, the component picks for itself.
  const effectiveCategory = useMemo<ConcernCategory | null>(() => {
    if (selectedCategory != null) return selectedCategory;
    if (overlays.length === 0) return null;
    return overlays[0].category;
  }, [selectedCategory, overlays]);

  const activeOverlay = useMemo(
    () => overlays.find((o) => o.category === effectiveCategory) ?? null,
    [overlays, effectiveCategory]
  );

  // ----- Graceful states ------------------------------------------------

  // 1. AI omitted face_overlay entirely (old persisted scans).
  if (!overlay) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
        />
        <View style={styles.fallbackTag}>
          <Text style={styles.fallbackText}>
            ZONE LOCALIZATION UNAVAILABLE FOR THIS SCAN
          </Text>
        </View>
      </View>
    );
  }

  // 2. AI returned face_overlay but every finding is calm/low. Show
  // the photo with a quiet "no focal zones" caption — never fake.
  if (overlays.length === 0) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
        />
        <View style={styles.fallbackTag}>
          <Text style={styles.fallbackText}>
            NO FOCAL ZONES IN THIS SCAN
          </Text>
        </View>
      </View>
    );
  }

  // ----- Active render --------------------------------------------------

  const viewBox = '0 0 1 1';

  return (
    <View style={[styles.frame, { width, height }]}>
      <Image
        source={photoUri}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={0}
      />

      <Svg
        width={width}
        height={height}
        viewBox={viewBox}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B1220" stopOpacity="0.04" />
            <Stop offset="0.6" stopColor="#0B1220" stopOpacity="0" />
            <Stop offset="1" stopColor="#0B1220" stopOpacity="0.16" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={1} height={1} fill="url(#vignette)" />

        {/* Render only the active concern's overlay. Single-concern
            isolation is the v17.1 default — the chips above let users
            switch which concern is highlighted. */}
        {activeOverlay
          ? (() => {
              const Renderer = STYLE_RENDERERS[activeOverlay.style];
              return (
                <Renderer
                  polygon={activeOverlay.polygon}
                  ellipse={activeOverlay.ellipse}
                  color={activeOverlay.color}
                  alpha={activeOverlay.alpha}
                  defsKey={activeOverlay.category}
                />
              );
            })()
          : null}
      </Svg>

      {/* Top-left concern label badge so the user knows which concern
          they're seeing on the photo right now. */}
      {activeOverlay ? (
        <View
          style={[
            styles.activeBadge,
            { backgroundColor: `${CATEGORY_COLOR[activeOverlay.category]}E6` },
          ]}
        >
          <Text style={styles.activeBadgeText}>
            {labelForCategory(activeOverlay.category)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function labelForCategory(c: ConcernCategory): string {
  switch (c) {
    case 'breakouts':
      return 'BREAKOUTS · REDNESS';
    case 'hydration':
      return 'HYDRATION';
    case 'texture':
      return 'TEXTURE · PORES';
    case 'tone':
      return 'TONE · DARK MARKS';
  }
}

// Suppress unused-import warnings for SVG primitives kept ready for
// future renderers (FeColorMatrix can layer further treatments).
void FeColorMatrix;

const styles = StyleSheet.create({
  frame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  fallbackTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(11, 18, 32, 0.65)',
  },
  fallbackText: {
    ...scanTypography.zoneLabel,
    color: palette.inkInverse,
    opacity: 0.92,
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkInverse,
  },
});
