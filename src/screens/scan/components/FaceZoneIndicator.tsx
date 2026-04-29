/**
 * FaceZoneIndicator — v16.1 honest visual proof.
 *
 * Replaces the v16.0 SkinMap which tried to draw fake fixed-template
 * overlays on the user's actual photo. Without on-device face
 * landmark detection (impossible in Expo Go), those overlays didn't
 * track the user's face — and a weak skin map is worse than no skin
 * map.
 *
 * v16.1 ships a small stylized SVG face diagram that highlights a
 * concern's region anatomically, INSIDE each finding row. It's
 * honest about being a diagram, not a real overlay on the user's
 * face. Premium, minimal, editorial — it answers "where is this
 * concern" without pretending to be something it can't be.
 *
 * Visual: 56×72 stylized face oval with subtle facial features.
 * The active region is highlighted in the concern's color via a
 * soft translucent fill + a hairline outline. Unhighlighted
 * features sit at low opacity so the eye lands on the highlighted
 * zone immediately.
 */

import React, { useMemo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';
import { palette } from '@/theme';
import type { ConcernCategory } from '@/types';

export interface FaceZoneIndicatorProps {
  category: ConcernCategory;
  /** Free-text region from the concern (e.g. "forehead", "cheeks").
   *  Used to choose which anatomical zone to highlight. */
  region: string;
  /** Concern severity drives the highlight intensity. */
  severityWeight?: number;
  /** Hex string. When omitted, derived from category. */
  color?: string;
  /** Render size in pt. Default 56×72. */
  width?: number;
  height?: number;
}

const CATEGORY_COLOR: Record<ConcernCategory, string> = {
  breakouts: '#E66B5C',
  hydration: '#7CB0FF',
  texture: '#A8C7C0',
  tone: '#D9A75E',
};

interface ZonePath {
  /** SVG path command in the 100x130 viewBox. */
  d: string;
}

// All paths drawn inside a 100x130 viewBox. The face oval is at
// (50, 65) with rx=40, ry=55. Features positioned to feel real
// without being a portrait — this is a premium icon, not a render.
const ZONE: Record<string, ZonePath> = {
  forehead: {
    d: 'M 22 32 Q 50 16 78 32 L 76 50 Q 50 46 24 50 Z',
  },
  t_zone: {
    d: 'M 42 50 L 58 50 L 56 92 L 44 92 Z',
  },
  cheeks: {
    // Two ellipses combined into one path — left cheek + right cheek.
    d: 'M 22 70 Q 18 84 28 92 Q 38 88 38 78 Q 36 70 22 70 Z M 78 70 Q 82 84 72 92 Q 62 88 62 78 Q 64 70 78 70 Z',
  },
  chin: {
    d: 'M 36 100 Q 50 96 64 100 L 60 116 Q 50 120 40 116 Z',
  },
  nose: {
    d: 'M 46 60 Q 44 80 50 86 Q 56 80 54 60 Z',
  },
  under_eyes: {
    d: 'M 30 56 L 44 56 L 44 62 L 30 62 Z M 56 56 L 70 56 L 70 62 L 56 62 Z',
  },
  jawline: {
    d: 'M 22 96 Q 50 116 78 96 L 76 108 Q 50 124 24 108 Z',
  },
  acrossFace: {
    // Highlight nearly the whole face oval.
    d: 'M 50 12 a 40 55 0 1 0 0.01 0 Z',
  },
};

function regionKeyFor(text: string): keyof typeof ZONE {
  const r = text.toLowerCase();
  if (r.includes('forehead')) return 'forehead';
  if (r.includes('chin')) return 'chin';
  if (r.includes('jaw')) return 'jawline';
  if (r.includes('cheek')) return 'cheeks';
  if (r.includes('nose') || r.includes('t-zone') || r.includes('t zone')) {
    return 't_zone';
  }
  if (r.includes('eye')) return 'under_eyes';
  return 'acrossFace';
}

export function FaceZoneIndicator({
  category,
  region,
  severityWeight,
  color,
  width = 56,
  height = 72,
}: FaceZoneIndicatorProps) {
  const zoneKey = useMemo(() => regionKeyFor(region), [region]);
  const zone = ZONE[zoneKey];
  const fill = color ?? CATEGORY_COLOR[category];
  // Severity drives the highlight alpha. Mild → 0.35, moderate →
  // 0.55, needs-attention → 0.75. Defaults to 0.5 if not provided.
  const fillOpacity = severityWeight ?? 0.5;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 130"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />

      {/* Face oval — soft hairline outline */}
      <Ellipse
        cx={50}
        cy={65}
        rx={40}
        ry={55}
        fill={palette.bgDeep}
        stroke={palette.hairline}
        strokeWidth={1}
      />

      {/* Highlighted zone — sits ABOVE the face fill */}
      <Path
        d={zone.d}
        fill={fill}
        fillOpacity={fillOpacity}
      />

      {/* Subtle anatomical features, low contrast so the eye lands
          on the highlighted zone first. */}
      <G opacity={0.35}>
        {/* Eyes */}
        <Circle cx={36} cy={56} r={2} fill={palette.inkSecondary} />
        <Circle cx={64} cy={56} r={2} fill={palette.inkSecondary} />
        {/* Nose hint */}
        <Path
          d="M 47 70 Q 50 78 53 70"
          fill="none"
          stroke={palette.inkTertiary}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
        {/* Mouth hint */}
        <Path
          d="M 42 96 Q 50 100 58 96"
          fill="none"
          stroke={palette.inkTertiary}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
      </G>

      {/* Hairline outline ABOVE everything to keep the face shape
          legible even when the highlight is wide. */}
      <Ellipse
        cx={50}
        cy={65}
        rx={40}
        ry={55}
        fill="none"
        stroke={palette.hairline}
        strokeWidth={1}
      />
    </Svg>
  );
}

void Rect; // keep import for future zone-bound rendering
