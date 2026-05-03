/**
 * FaceSkinMap — v17.2 landmark-anchored geometry, polygon as refinement.
 *
 * v17.0/v17.1 trusted the AI's per-finding `region_polygon` as the
 * primary overlay shape. Real GPT-5-mini polygon coordinates often
 * drift by a few percent of image dimensions — visible misalignment
 * on a real face. The fix is to flip the primacy:
 *
 *   • PRIMARY  — derive each concern's overlay shape DETERMINISTICALLY
 *     from the AI's `landmarks` (6 reliable anchor points) and its
 *     `regions[]` enum (categorical, not coordinate). Output always
 *     hugs the user's actual eyes / nose / chin / forehead.
 *   • REFINEMENT — when the AI's `region_polygon` passes a sanity
 *     check (≥3 points, centroid inside face_box, bounding box not
 *     pathological), use it INSTEAD of the landmark shape. This lets
 *     the model tighten the highlight when its polygon is good
 *     without ever letting a bad polygon ruin the visual.
 *
 * Everything else (per-concern visual treatment, default-single-
 * concern, graceful fallback states) follows v17.1.
 *
 * Per-concern visual styles:
 *   • redness         feathered_wash  — coral blurred fill + soft halo
 *   • breakouts       pinpoint_halos  — clustered radial dots + base wash
 *   • dark_marks      warm_patch      — radial-gradient amber
 *   • under_eyes      lilac_arc       — narrow blurred band
 *   • texture/pores   micrograin      — hairline stroke + low fill
 *   • hydration       cool_wash       — azure blurred fill + soft halo
 *   • sensitivity     cool_wash       — same as hydration
 *   • oiliness        micrograin      — sheen sub-treatment
 *
 * Coordinate system:
 *   viewBox = "0 0 1 1" + preserveAspectRatio="none" — coordinates map
 *   1:1 to the captured image's normalised 0..1 space. Container
 *   height is computed from the photo's natural aspect ratio (via
 *   RNImage.getSize) so contentFit="cover" doesn't crop and the SVG
 *   stays in lockstep with the visible photo.
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
// Mapping tables.
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

type VisualStyle =
  | 'feathered_wash'
  | 'pinpoint_halos'
  | 'warm_patch'
  | 'lilac_arc'
  | 'micrograin'
  | 'cool_wash';

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

const CATEGORY_COLOR: Record<ConcernCategory, string> = {
  breakouts: '#E66B5C',
  hydration: '#7CB0FF',
  texture: '#A8C7C0',
  tone: '#D9A75E',
};

// v18.8 — alpha values rebalanced to feel premium and restrained.
// The v17.2 values (0.6 → 0.9) read as crayon-like and clinical on a
// real photo. v18.8 keeps the wash visible but elegant — the user
// can still see the concern zone clearly without it dominating
// their face.
const SEVERITY_ALPHA: Record<FaceConcernFinding['severity'], number> = {
  none: 0,
  low: 0.28,
  mild: 0.36,
  moderate: 0.46,
  high: 0.55,
};

// ---------------------------------------------------------------------------
// Geometry primitives.
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

interface Ellipse2 {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
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

function polygonBounds(points: Point[]): {
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

// ---------------------------------------------------------------------------
// Landmark-anchored shape for each FaceRegion.
//
// These ARE the source of truth for overlay placement. They use the
// AI's `landmarks` (6 anchor points) + `face_box` to compute an
// ellipse that hugs the relevant facial feature. The same six points
// are spatial anchors GPT-5-mini can place reliably; freehand
// polygons are not.
// ---------------------------------------------------------------------------

function landmarkShapeFor(
  region: FaceRegion,
  overlay: NonNullable<FaceScanAnalysis['face_overlay']>
): Ellipse2 {
  const { face_box, landmarks } = overlay;
  const eyeMid = midpoint(landmarks.left_eye, landmarks.right_eye);
  const faceW = face_box.width;
  const faceH = face_box.height;

  switch (region) {
    case 'forehead':
      return {
        cx: landmarks.forehead_center.x,
        cy: landmarks.forehead_center.y,
        rx: faceW * 0.4,
        ry: faceH * 0.16,
      };
    case 't_zone':
      return {
        cx: eyeMid.x,
        cy: midpoint(eyeMid, landmarks.nose_tip).y + faceH * 0.02,
        rx: faceW * 0.18,
        ry: faceH * 0.28,
      };
    case 'nose':
      return {
        cx: landmarks.nose_tip.x,
        cy: landmarks.nose_tip.y,
        rx: faceW * 0.13,
        ry: faceH * 0.16,
      };
    case 'left_cheek':
      return {
        cx: landmarks.left_eye.x - faceW * 0.04,
        cy:
          midpoint(landmarks.left_eye, landmarks.mouth_center).y +
          faceH * 0.02,
        rx: faceW * 0.21,
        ry: faceH * 0.18,
      };
    case 'right_cheek':
      return {
        cx: landmarks.right_eye.x + faceW * 0.04,
        cy:
          midpoint(landmarks.right_eye, landmarks.mouth_center).y +
          faceH * 0.02,
        rx: faceW * 0.21,
        ry: faceH * 0.18,
      };
    case 'chin':
      return {
        cx: landmarks.chin.x,
        cy: landmarks.chin.y,
        rx: faceW * 0.24,
        ry: faceH * 0.13,
      };
    case 'jawline':
      return {
        cx: face_box.x + faceW / 2,
        cy: face_box.y + faceH * 0.88,
        rx: faceW * 0.45,
        ry: faceH * 0.09,
      };
    case 'under_eyes':
      return {
        cx: eyeMid.x,
        cy: eyeMid.y + faceH * 0.06,
        rx: faceW * 0.36,
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
// Polygon sanity check.
//
// A polygon is "trustworthy" only when:
//   1. it has ≥3 points
//   2. its centroid is inside the AI's face_box (with a tolerance)
//   3. its bounding box width × height is between 0.2% and 70% of
//      the face_box area — too tiny is a stray dot, too huge is a
//      coordinate-system bug.
//
// When ANY check fails we silently fall back to the landmark shape.
// ---------------------------------------------------------------------------

function polygonIsTrustworthy(
  poly: Point[],
  faceBox: { x: number; y: number; width: number; height: number }
): boolean {
  if (poly.length < 3) return false;
  const c = centroid(poly);
  const cx = faceBox.x;
  const cy = faceBox.y;
  const cw = faceBox.width;
  const ch = faceBox.height;
  // 8% slack so a polygon that grazes the chin or forehead boundary
  // still counts.
  const xMin = cx - cw * 0.08;
  const xMax = cx + cw * 1.08;
  const yMin = cy - ch * 0.08;
  const yMax = cy + ch * 1.08;
  if (c.x < xMin || c.x > xMax) return false;
  if (c.y < yMin || c.y > yMax) return false;
  const b = polygonBounds(poly);
  const polyArea = Math.max(0, b.maxX - b.minX) * Math.max(0, b.maxY - b.minY);
  const faceArea = Math.max(0.0001, cw * ch);
  const ratio = polyArea / faceArea;
  if (ratio < 0.002) return false;
  if (ratio > 0.7) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Build the resolved overlay for a finding.
//   - regionShape  : always present, derived from landmarks
//   - polygon      : optional refinement, only when trustworthy
//
// The renderer uses polygon when present, otherwise falls back to
// regionShape. This guarantees there is ALWAYS an overlay anchored
// to real face features.
// ---------------------------------------------------------------------------

interface ResolvedOverlay {
  category: ConcernCategory;
  concernType: ConcernType;
  style: VisualStyle;
  color: string;
  alpha: number;
  finding: FaceConcernFinding;
  regionShape: Ellipse2;
  polygon?: Point[];
  /** Friendly label for the active-concern badge. */
  label: string;
}

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

function labelFor(finding: FaceConcernFinding): string {
  const concern = finding.concern.replace('_', ' ').toUpperCase();
  const region = (finding.regions[0] ?? 'across_face')
    .replace('_', ' ')
    .toUpperCase();
  return `${concern} · ${region}`;
}

function resolveOverlays(analysis: FaceScanAnalysis): ResolvedOverlay[] {
  const overlay = analysis.face_overlay;
  if (!overlay) return [];
  const byCat = pickWorstByCategory(analysis.findings);
  const out: ResolvedOverlay[] = [];
  for (const [category, finding] of byCat.entries()) {
    const treatment = CONCERN_STYLE[finding.concern];
    const alpha = SEVERITY_ALPHA[finding.severity] ?? 0.6;
    const region: FaceRegion = finding.regions[0] ?? 'across_face';
    const regionShape = landmarkShapeFor(region, overlay);
    let polygon: Point[] | undefined;
    if (
      finding.region_polygon &&
      polygonIsTrustworthy(finding.region_polygon, overlay.face_box)
    ) {
      polygon = finding.region_polygon.map((p) => ({
        x: clamp01(p.x),
        y: clamp01(p.y),
      }));
    }
    out.push({
      category,
      concernType: finding.concern,
      style: treatment.style,
      color: treatment.color,
      alpha,
      finding,
      regionShape,
      polygon,
      label: labelFor(finding),
    });
  }
  // Sort by severity desc so [0] is always the worst → primary.
  return out;
}

// ---------------------------------------------------------------------------
// Visual style renderers. Each is a small SVG sub-tree. v17.2 bumps
// alpha and layers a soft halo behind the core fill so the overlay
// reads cleanly even after Gaussian blur softens it.
// ---------------------------------------------------------------------------

function pointsToString(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

interface RenderInput {
  polygon?: Point[];
  ellipse: Ellipse2;
  color: string;
  alpha: number;
  defsKey: string;
}

function FeatheredWash({
  polygon,
  ellipse,
  color,
  alpha,
  defsKey,
}: RenderInput) {
  const blurId = `wash-${defsKey}`;
  return (
    <G>
      <Defs>
        <Filter id={blurId} x="-15%" y="-15%" width="130%" height="130%">
          <FeGaussianBlur stdDeviation={0.014} />
        </Filter>
      </Defs>
      {/* Soft outer halo to lift the overlay off the photo */}
      <Ellipse
        cx={ellipse.cx}
        cy={ellipse.cy}
        rx={ellipse.rx * 1.18}
        ry={ellipse.ry * 1.18}
        fill={color}
        fillOpacity={alpha * 0.32}
        filter={`url(#${blurId})`}
      />
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={color}
          fillOpacity={alpha * 0.92}
          filter={`url(#${blurId})`}
        />
      ) : (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          fill={color}
          fillOpacity={alpha * 0.92}
          filter={`url(#${blurId})`}
        />
      )}
    </G>
  );
}

function CoolWash(props: RenderInput) {
  return <FeatheredWash {...props} />;
}

function WarmPatch({ polygon, ellipse, color, alpha, defsKey }: RenderInput) {
  const gradId = `warm-${defsKey}`;
  const blurId = `warm-blur-${defsKey}`;
  const c = polygon ? centroid(polygon) : { x: ellipse.cx, y: ellipse.cy };
  const r = polygon
    ? Math.max(
        0.06,
        (() => {
          const b = polygonBounds(polygon);
          return Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.6;
        })()
      )
    : Math.max(ellipse.rx, ellipse.ry) * 1.1;
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
          <Stop offset="0" stopColor={color} stopOpacity={alpha} />
          <Stop offset="0.55" stopColor={color} stopOpacity={alpha * 0.6} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <Filter id={blurId} x="-10%" y="-10%" width="120%" height="120%">
          <FeGaussianBlur stdDeviation={0.008} />
        </Filter>
      </Defs>
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={`url(#${gradId})`}
          filter={`url(#${blurId})`}
        />
      ) : (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          fill={`url(#${gradId})`}
          filter={`url(#${blurId})`}
        />
      )}
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
  // v18.8 — restrained version. Previous render had 6 hard pinpoint
  // cores at high alpha + a base wash, which read as clinical
  // "spot markers" on the user's face. v18.8 keeps the concept of
  // "localized glow markers" but draws 3 soft blurred dots without
  // the sharp inner cores. Reads as premium beauty-tech, not a
  // medical diagram.
  const blurId = `halo-${defsKey}`;
  const dots = useMemo<Point[]>(() => {
    if (polygon && polygon.length >= 3) {
      const c = centroid(polygon);
      const b = polygonBounds(polygon);
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      return [
        c,
        { x: clamp01(c.x - w * 0.2), y: clamp01(c.y - h * 0.18) },
        { x: clamp01(c.x + w * 0.22), y: clamp01(c.y + h * 0.16) },
      ];
    }
    const { cx, cy, rx, ry } = ellipse;
    return [
      { x: cx, y: cy },
      { x: clamp01(cx - rx * 0.4), y: clamp01(cy - ry * 0.35) },
      { x: clamp01(cx + rx * 0.42), y: clamp01(cy + ry * 0.4) },
    ];
  }, [polygon, ellipse]);

  return (
    <G>
      <Defs>
        <Filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
          <FeGaussianBlur stdDeviation={0.014} />
        </Filter>
      </Defs>
      {/* Soft base wash so the dots feel grouped into a zone, not
          three random spots floating on the face. */}
      <Ellipse
        cx={ellipse.cx}
        cy={ellipse.cy}
        rx={ellipse.rx}
        ry={ellipse.ry}
        fill={color}
        fillOpacity={alpha * 0.55}
        filter={`url(#${blurId})`}
      />
      {/* 3 soft glow markers — no sharp inner cores. */}
      {dots.map((d, i) => (
        <Circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={0.024}
          fill={color}
          fillOpacity={alpha * 0.65}
          filter={`url(#${blurId})`}
        />
      ))}
    </G>
  );
}

function LilacArc({ polygon, ellipse, color, alpha, defsKey }: RenderInput) {
  const blurId = `arc-${defsKey}`;
  return (
    <G>
      <Defs>
        <Filter id={blurId} x="-5%" y="-30%" width="110%" height="160%">
          <FeGaussianBlur stdDeviation={0.011} />
        </Filter>
      </Defs>
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={color}
          fillOpacity={alpha * 0.9}
          filter={`url(#${blurId})`}
        />
      ) : (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={Math.max(ellipse.ry * 0.65, 0.022)}
          fill={color}
          fillOpacity={alpha * 0.9}
          filter={`url(#${blurId})`}
        />
      )}
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
  // v18.8 — refined surface highlight. Previous version had a
  // hairline stroke around the zone that read as a medical diagram
  // outline. v18.8 drops the stroke entirely; texture / pores /
  // oiliness now render as a soft layered wash that hints at the
  // zone without outlining it.
  const blurId = `grain-${defsKey}`;
  return (
    <G>
      <Defs>
        <Filter id={blurId} x="-15%" y="-15%" width="130%" height="130%">
          <FeGaussianBlur stdDeviation={0.012} />
        </Filter>
      </Defs>
      {/* Outer halo, blurred wider */}
      <Ellipse
        cx={ellipse.cx}
        cy={ellipse.cy}
        rx={ellipse.rx * 1.18}
        ry={ellipse.ry * 1.18}
        fill={color}
        fillOpacity={alpha * 0.25}
        filter={`url(#${blurId})`}
      />
      {/* Inner wash — slightly tighter, slightly stronger */}
      {polygon ? (
        <Polygon
          points={pointsToString(polygon)}
          fill={color}
          fillOpacity={alpha * 0.55}
          filter={`url(#${blurId})`}
        />
      ) : (
        <Ellipse
          cx={ellipse.cx}
          cy={ellipse.cy}
          rx={ellipse.rx}
          ry={ellipse.ry}
          fill={color}
          fillOpacity={alpha * 0.55}
          filter={`url(#${blurId})`}
        />
      )}
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

export interface FaceSkinMapProps {
  photoUri: string;
  aiAnalysis: FaceScanAnalysis;
  /** When set, that category's overlay renders. When null, primary
   *  (highest-severity) is auto-selected. */
  selectedCategory?: ConcernCategory | null;
  width: number;
  fallbackAspectRatio?: number;
  /** v17.2 — show a small dev diagnostic ribbon ("LIVE polys 2/3,
   *  landmarks ✓"). Off by default. */
  showDebug?: boolean;
}

export function FaceSkinMap({
  photoUri,
  aiAnalysis,
  selectedCategory = null,
  width,
  fallbackAspectRatio = 4 / 5,
  showDebug = false,
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
        /* swallow */
      }
    );
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  const overlay = aiAnalysis.face_overlay;
  const height = Math.round(width / aspectRatio);

  const overlays = useMemo<ResolvedOverlay[]>(
    () => resolveOverlays(aiAnalysis),
    [aiAnalysis]
  );

  const effectiveCategory = useMemo<ConcernCategory | null>(() => {
    if (selectedCategory != null) return selectedCategory;
    if (overlays.length === 0) return null;
    return overlays[0].category;
  }, [selectedCategory, overlays]);

  const activeOverlay = useMemo(
    () => overlays.find((o) => o.category === effectiveCategory) ?? null,
    [overlays, effectiveCategory]
  );

  // Debug diagnostic — counts polygons that passed the trust check.
  const debugLine = useMemo(() => {
    if (!showDebug || !overlay) return '';
    const trustworthy = overlays.filter((o) => !!o.polygon).length;
    return `LIVE  overlay ✓  landmarks ✓  polys ${trustworthy}/${overlays.length}`;
  }, [overlays, overlay, showDebug]);

  // ----- Graceful states ------------------------------------------------

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
        {showDebug ? (
          <View style={styles.debugRibbon}>
            <Text style={styles.debugText}>
              FALLBACK  no face_overlay in payload
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

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
        {showDebug && debugLine ? (
          <View style={styles.debugRibbon}>
            <Text style={styles.debugText}>{debugLine}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ----- Active render --------------------------------------------------

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
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="vignette-top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B1220" stopOpacity="0.04" />
            <Stop offset="0.6" stopColor="#0B1220" stopOpacity="0" />
            <Stop offset="1" stopColor="#0B1220" stopOpacity="0.18" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={1} height={1} fill="url(#vignette-top)" />

        {activeOverlay ? (
          (() => {
            const Renderer = STYLE_RENDERERS[activeOverlay.style];
            return (
              <Renderer
                polygon={activeOverlay.polygon}
                ellipse={activeOverlay.regionShape}
                color={activeOverlay.color}
                alpha={activeOverlay.alpha}
                defsKey={activeOverlay.category}
              />
            );
          })()
        ) : null}
      </Svg>

      {/* v18.8 — active-concern badge as a quiet pearl-glass tag.
          Confirms which concern is highlighted without the previous
          full-color clinical pill. The chip row above the photo
          remains the primary affordance. */}
      {activeOverlay ? (
        <View style={styles.activeBadge}>
          <View
            style={[
              styles.activeBadgeDot,
              { backgroundColor: CATEGORY_COLOR[activeOverlay.category] },
            ]}
          />
          <Text style={styles.activeBadgeText} numberOfLines={1}>
            {activeOverlay.label}
          </Text>
        </View>
      ) : null}

      {showDebug && debugLine ? (
        <View style={styles.debugRibbon}>
          <Text style={styles.debugText}>{debugLine}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Suppress unused-import for FeColorMatrix (kept for future use).
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
  // v18.8 — lower-contrast pearl glass badge with a small color dot
  // for the active concern. Reads as a quiet confirmation tag, not
  // a clinical pill.
  activeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '70%',
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: 'rgba(248, 250, 252, 0.92)',
  },
  debugRibbon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(11, 18, 32, 0.78)',
  },
  debugText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1,
    color: palette.inkInverse,
  },
});
