/**
 * FaceSkinMap — v17.0 honest, image-anchored overlay.
 *
 * The v16.x family (SkinMap, FaceZoneIndicator) lost trust because
 * it tried to draw concern overlays onto either (a) a fixed-template
 * face diagram or (b) the user's photo using guessed coordinates.
 * Without on-device face landmarking — which Expo Go can't do —
 * those overlays didn't track the real face.
 *
 * v17.0 solves this honestly: the analysis call now returns
 *   • face_overlay.face_box  — tight-crop bounds of the detected face
 *   • face_overlay.landmarks — left_eye / right_eye / nose_tip / mouth /
 *                              chin / forehead_center
 *   • per-finding region_polygon — clockwise outline of where the
 *     model VISUALLY observed each concern
 * all expressed as normalised coordinates 0..1 against the captured
 * image. The component below renders the actual photo and lays the
 * AI-supplied polygon (or, when missing, a landmark-anchored ellipse)
 * directly on top using a viewBox locked to the photo's aspect
 * ratio. The result is a true image overlay, not a stylised diagram.
 *
 * Graceful hide: if face_overlay is absent (old persisted scans), we
 * render the photo with a hairline frame and a discreet "Overlay
 * unavailable" caption — no fake markings, no guessed positions.
 *
 * Selection: when a `selectedCategory` is supplied, that category's
 * polygon renders at full opacity while the others fade to a hairline
 * trace. When `selectedCategory` is null, all surfaced concerns
 * render at moderate opacity simultaneously so the user can see the
 * full landscape of detection.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
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
// Concern → category mapping. Mirrors translateAnalysis.ts; kept local
// so FaceSkinMap doesn't reach into the translator's internals.
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

// Editorial-cool concern colors. Tuned to read on a real photo
// without screaming — these are watercolor washes, not flat alerts.
const CATEGORY_COLOR: Record<ConcernCategory, string> = {
  breakouts: '#E66B5C',
  hydration: '#7CB0FF',
  texture: '#A8C7C0',
  tone: '#D9A75E',
};

const SEVERITY_OPACITY: Record<
  FaceConcernFinding['severity'],
  number
> = {
  none: 0,
  low: 0.18,
  mild: 0.28,
  moderate: 0.42,
  high: 0.55,
};

// ---------------------------------------------------------------------------
// Props.
// ---------------------------------------------------------------------------

export interface FaceSkinMapProps {
  photoUri: string;
  aiAnalysis: FaceScanAnalysis;
  /** When set, that category's polygon renders prominently; others
   *  fade to a hairline trace. Null = all concerns at equal weight. */
  selectedCategory?: ConcernCategory | null;
  /** Display width in pt. Height is derived from the photo's natural
   *  aspect ratio so overlay coordinates land where they should. */
  width: number;
  /** Optional override of the default 4:5 fallback aspect ratio used
   *  while the photo's natural dimensions are still loading. */
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

/**
 * Build a fallback ellipse anchored on the AI's landmarks for a
 * finding that's missing its region_polygon (old persisted scans).
 * Returns ellipse params in normalised 0..1 image coordinates.
 */
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
        rx: faceW * 0.34,
        ry: faceH * 0.13,
      };
    case 't_zone':
      return {
        cx: eyeMid.x,
        cy: midpoint(eyeMid, landmarks.nose_tip).y,
        rx: faceW * 0.13,
        ry: faceH * 0.22,
      };
    case 'nose':
      return {
        cx: landmarks.nose_tip.x,
        cy: landmarks.nose_tip.y,
        rx: faceW * 0.1,
        ry: faceH * 0.12,
      };
    case 'left_cheek':
      return {
        cx: landmarks.left_eye.x - faceW * 0.05,
        cy: midpoint(landmarks.left_eye, landmarks.mouth_center).y +
          faceH * 0.02,
        rx: faceW * 0.18,
        ry: faceH * 0.15,
      };
    case 'right_cheek':
      return {
        cx: landmarks.right_eye.x + faceW * 0.05,
        cy: midpoint(landmarks.right_eye, landmarks.mouth_center).y +
          faceH * 0.02,
        rx: faceW * 0.18,
        ry: faceH * 0.15,
      };
    case 'chin':
      return {
        cx: landmarks.chin.x,
        cy: landmarks.chin.y,
        rx: faceW * 0.2,
        ry: faceH * 0.1,
      };
    case 'jawline':
      return {
        cx: face_box.x + faceW / 2,
        cy: face_box.y + faceH * 0.88,
        rx: faceW * 0.42,
        ry: faceH * 0.07,
      };
    case 'under_eyes':
      return {
        cx: eyeMid.x,
        cy: eyeMid.y + faceH * 0.05,
        rx: faceW * 0.32,
        ry: faceH * 0.04,
      };
    case 'across_face':
    default:
      return {
        cx: face_box.x + faceW / 2,
        cy: face_box.y + faceH / 2,
        rx: faceW * 0.45,
        ry: faceH * 0.45,
      };
  }
}

/** Pick the worst (highest-severity) finding per app category. */
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
// Component.
// ---------------------------------------------------------------------------

export function FaceSkinMap({
  photoUri,
  aiAnalysis,
  selectedCategory = null,
  width,
  fallbackAspectRatio = 4 / 5,
}: FaceSkinMapProps) {
  // Resolve the captured photo's natural aspect ratio so the overlay's
  // viewBox is locked to the same coordinate space the AI normalised
  // against. While loading, fall back to a portrait-friendly default.
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
        // getSize failed (file unreachable) — keep the fallback.
      }
    );
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  const overlay = aiAnalysis.face_overlay;
  const height = Math.round(width / aspectRatio);

  // Derive one polygon (or fallback ellipse) per surfaced category.
  const overlays = useMemo(() => {
    if (!overlay) return [];
    const byCat = pickWorstByCategory(aiAnalysis.findings);
    const items: Array<{
      category: ConcernCategory;
      color: string;
      opacity: number;
      polygon?: Point[];
      ellipse?: { cx: number; cy: number; rx: number; ry: number };
      finding: FaceConcernFinding;
    }> = [];
    for (const [category, finding] of byCat.entries()) {
      const color = CATEGORY_COLOR[category];
      const baseOpacity = SEVERITY_OPACITY[finding.severity] ?? 0.32;
      const polygon = finding.region_polygon;
      if (polygon && polygon.length >= 3) {
        items.push({
          category,
          color,
          opacity: baseOpacity,
          polygon: polygon.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })),
          finding,
        });
      } else {
        const region: FaceRegion =
          finding.regions[0] ?? 'across_face';
        items.push({
          category,
          color,
          opacity: baseOpacity,
          ellipse: fallbackEllipseFor(region, overlay),
          finding,
        });
      }
    }
    return items;
  }, [aiAnalysis.findings, overlay]);

  // Selection emphasis. When a category is selected, dim everything
  // else to a near-invisible hairline; when null, keep all at base.
  function emphasisFor(category: ConcernCategory): {
    fillScale: number;
    strokeScale: number;
  } {
    if (selectedCategory == null) {
      return { fillScale: 1, strokeScale: 1 };
    }
    return category === selectedCategory
      ? { fillScale: 1.4, strokeScale: 1.6 }
      : { fillScale: 0.18, strokeScale: 0.4 };
  }

  // ---------- Graceful hide branch ----------
  // Old persisted scans never had face_overlay. Render the photo
  // alone with a discreet caption — never fake markings.
  if (!overlay) {
    return (
      <View style={[styles.frame, { width, height }]}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
        />
        <View style={styles.unavailableTag}>
          <Text style={styles.unavailableText}>OVERLAY UNAVAILABLE</Text>
        </View>
      </View>
    );
  }

  // viewBox locked to 0..1 normalised space; preserveAspectRatio="none"
  // makes the overlay coordinates land precisely where the AI placed
  // them on the captured image.
  const viewBox = '0 0 1 1';

  const { face_box } = overlay;

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
          {/* Soft top-down vignette to ground overlays — keeps the
              face crop legible even in bright photos. */}
          <LinearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B1220" stopOpacity="0.04" />
            <Stop offset="0.6" stopColor="#0B1220" stopOpacity="0" />
            <Stop offset="1" stopColor="#0B1220" stopOpacity="0.10" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={1} height={1} fill="url(#vignette)" />

        {/* Hairline outline on the AI-detected face_box. Reads as a
            quiet "we know where your face is" cue. Only renders when
            face_box has reasonable bounds. */}
        {face_box.width > 0.05 && face_box.height > 0.05 && (
          <Rect
            x={face_box.x}
            y={face_box.y}
            width={face_box.width}
            height={face_box.height}
            rx={0.04}
            ry={0.04}
            fill="none"
            stroke={palette.inkInverse}
            strokeOpacity={0.35}
            strokeWidth={0.0035}
          />
        )}

        {/* Per-concern overlays. Polygons (when AI returned them)
            land precisely; landmark-anchored ellipses fall back. */}
        {overlays.map((o, i) => {
          const { fillScale, strokeScale } = emphasisFor(o.category);
          const fillOpacity = Math.min(0.85, o.opacity * fillScale);
          const strokeOpacity = Math.min(1, o.opacity * 1.4 * strokeScale);
          if (o.polygon) {
            const points = o.polygon
              .map((p) => `${p.x},${p.y}`)
              .join(' ');
            return (
              <G key={`${o.category}-${i}`}>
                <Polygon
                  points={points}
                  fill={o.color}
                  fillOpacity={fillOpacity}
                />
                <Polygon
                  points={points}
                  fill="none"
                  stroke={o.color}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={0.005}
                  strokeLinejoin="round"
                />
              </G>
            );
          }
          if (o.ellipse) {
            return (
              <G key={`${o.category}-${i}`}>
                <Ellipse
                  cx={o.ellipse.cx}
                  cy={o.ellipse.cy}
                  rx={o.ellipse.rx}
                  ry={o.ellipse.ry}
                  fill={o.color}
                  fillOpacity={fillOpacity}
                />
                <Ellipse
                  cx={o.ellipse.cx}
                  cy={o.ellipse.cy}
                  rx={o.ellipse.rx}
                  ry={o.ellipse.ry}
                  fill="none"
                  stroke={o.color}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={0.005}
                />
              </G>
            );
          }
          return null;
        })}
      </Svg>
    </View>
  );
}

// Suppress unused-import for `Path` — kept for future polyline
// landmark connectors.
void Path;

const styles = StyleSheet.create({
  frame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  unavailableTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(11, 18, 32, 0.62)',
  },
  unavailableText: {
    ...scanTypography.zoneLabel,
    color: palette.inkInverse,
    opacity: 0.9,
  },
});
