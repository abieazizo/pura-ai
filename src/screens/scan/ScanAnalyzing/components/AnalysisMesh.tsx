/**
 * AnalysisMesh (v11.9).
 *
 * Premium "AI is analyzing your face" visual — a restrained network of
 * 11 nodes connected by hairline edges that fades in during the DETECT
 * beat and dims out at SETTLE. The mesh sits on top of the photo +
 * face contour but BELOW the zone overlays and detection markers, so
 * it reads as a substrate analysis pass, not a chrome layer.
 *
 * Visual rules
 * ------------
 * • Cool azure tint (palette.azureGlow ≈ #6FA8FF @ low alpha) — the
 *   one and only place in the app where we use the cool-blue analysis
 *   palette. Distinct from the warm clay used for landmark / finding
 *   markers so the user reads it as "system thinking" not "your skin
 *   data."
 * • Nodes pulse softly (opacity 0.55 → 0.95) on a slow staggered loop.
 * • Edges draw in over the DETECT window via stroke-dashoffset, in
 *   sequence rather than all at once.
 * • Reduce-motion: every node + edge appears at its target opacity
 *   immediately; no animation.
 * • Fixed layout coordinates (normalized 0–1 within the photo box) —
 *   if preflight returned a face_box it could be used to anchor the
 *   mesh to the actual face position; today we use illustrative
 *   positions because preflight's face_box is opt-in.
 */

import React, { useEffect, useMemo } from 'react';
import { Circle, Line } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

export interface AnalysisMeshProps {
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
}

/**
 * 11-node mesh anchored to a generic frontal-portrait face. Coordinates
 * are normalized within the photo box; ScanAnalyzing's PHOTO_WIDTH and
 * currentHeight scale them at render time.
 *
 * Layout follows a loose triangulation:
 *   • 2 brow points (upper-left, upper-right)
 *   • 2 cheek apex points (left, right)
 *   • 2 mid-cheek points (left, right)
 *   • 2 nasolabial points (left, right)
 *   • 1 nose-bridge point
 *   • 1 chin point
 *   • 1 forehead-center point
 */
const NODES: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.50, y: 0.27 }, // forehead center
  { x: 0.36, y: 0.36 }, // brow L
  { x: 0.64, y: 0.36 }, // brow R
  { x: 0.50, y: 0.48 }, // nose bridge
  { x: 0.30, y: 0.55 }, // cheek apex L
  { x: 0.70, y: 0.55 }, // cheek apex R
  { x: 0.36, y: 0.66 }, // mid cheek L
  { x: 0.64, y: 0.66 }, // mid cheek R
  { x: 0.42, y: 0.74 }, // nasolabial L
  { x: 0.58, y: 0.74 }, // nasolabial R
  { x: 0.50, y: 0.85 }, // chin
];

/**
 * Edges between nodes. Indices reference NODES above. Each edge is
 * drawn in sequence with a 90ms stagger so the mesh feels assembled,
 * not painted all at once.
 */
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],   // forehead → brow L
  [0, 2],   // forehead → brow R
  [1, 2],   // brow L → brow R
  [1, 3],   // brow L → nose bridge
  [2, 3],   // brow R → nose bridge
  [3, 4],   // nose bridge → cheek apex L
  [3, 5],   // nose bridge → cheek apex R
  [4, 6],   // cheek apex L → mid cheek L
  [5, 7],   // cheek apex R → mid cheek R
  [4, 5],   // cheek apex L → R (across nose)
  [6, 8],   // mid cheek L → nasolabial L
  [7, 9],   // mid cheek R → nasolabial R
  [8, 9],   // nasolabial L → R
  [8, 10],  // nasolabial L → chin
  [9, 10],  // nasolabial R → chin
];

const NODE_R = 2.5;
const EDGE_STROKE = 0.7;

// Cool analysis tint — azure with low alpha. Lives ONLY in this
// component to keep the warm clay/moss palette coherent everywhere
// else. Hex chosen to sit between palette.bgInk and palette.coral on
// the cool axis without reading as "blue brand color."
const MESH_COLOR = '#7CB0FF';

function targetOpacityForBeat(beat: Beat): number {
  switch (beat) {
    case 'arrive':
    case 'locate':
      return 0;
    case 'partition':
      return 0.55; // mesh starts to assemble
    case 'detect':
      return 0.85; // peak — nodes + edges fully drawn
    case 'score':
      return 0.45; // dimming; markers take over
    case 'settle':
    case 'reveal':
      return 0;
    default:
      return 0;
  }
}

export function AnalysisMesh({ size, beat, reduceMotion }: AnalysisMeshProps) {
  const layerOpacity = useSharedValue(0);

  useEffect(() => {
    const target = targetOpacityForBeat(beat);
    if (reduceMotion) {
      layerOpacity.value = target;
      return;
    }
    layerOpacity.value = withTiming(target, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [beat, reduceMotion, layerOpacity]);

  return (
    <>
      {/* Edges first so nodes render on top */}
      {EDGES.map(([a, b], i) => (
        <Edge
          key={`e-${i}`}
          a={NODES[a]}
          b={NODES[b]}
          size={size}
          beat={beat}
          reduceMotion={reduceMotion}
          delay={i * 90}
          layerOpacity={layerOpacity}
        />
      ))}
      {NODES.map((node, i) => (
        <Node
          key={`n-${i}`}
          x={node.x}
          y={node.y}
          size={size}
          beat={beat}
          reduceMotion={reduceMotion}
          delay={i * 80}
          layerOpacity={layerOpacity}
        />
      ))}
    </>
  );
}

interface NodeProps {
  x: number;
  y: number;
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
  delay: number;
  layerOpacity: SharedValue<number>;
}

function Node({ x, y, size, beat, reduceMotion, delay, layerOpacity }: NodeProps) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.85;
      return;
    }
    if (beat === 'detect' || beat === 'partition' || beat === 'score') {
      pulse.value = withDelay(
        delay,
        withRepeat(
          withTiming(0.95, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0.55, { duration: 500 });
    }
    return () => cancelAnimation(pulse);
  }, [beat, reduceMotion, delay, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: pulse.value * layerOpacity.value,
  }));

  return (
    <AnimatedCircle
      cx={x * size.w}
      cy={y * size.h}
      r={NODE_R}
      fill={MESH_COLOR}
      animatedProps={animatedProps}
    />
  );
}

interface EdgeProps {
  a: { x: number; y: number };
  b: { x: number; y: number };
  size: { w: number; h: number };
  beat: Beat;
  reduceMotion: boolean;
  delay: number;
  layerOpacity: SharedValue<number>;
}

function Edge({ a, b, size, beat, reduceMotion, delay, layerOpacity }: EdgeProps) {
  // Each edge has its own draw progress 0→1 that animates during DETECT.
  const draw = useSharedValue(0);

  // Pre-compute the line length for the dashoffset trick.
  const length = useMemo(() => {
    const dx = (b.x - a.x) * size.w;
    const dy = (b.y - a.y) * size.h;
    return Math.max(1, Math.sqrt(dx * dx + dy * dy));
  }, [a, b, size.w, size.h]);

  useEffect(() => {
    if (reduceMotion) {
      draw.value = 1;
      return;
    }
    if (beat === 'detect' || beat === 'partition' || beat === 'score') {
      draw.value = withDelay(
        delay,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
      );
    } else if (beat === 'settle' || beat === 'reveal') {
      draw.value = withTiming(0, { duration: 400 });
    } else {
      draw.value = 0;
    }
  }, [beat, reduceMotion, delay, draw]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - draw.value),
    opacity: layerOpacity.value,
  }));

  return (
    <AnimatedLine
      x1={a.x * size.w}
      y1={a.y * size.h}
      x2={b.x * size.w}
      y2={b.y * size.h}
      stroke={MESH_COLOR}
      strokeWidth={EDGE_STROKE}
      strokeLinecap="round"
      strokeDasharray={`${length} ${length}`}
      animatedProps={animatedProps}
    />
  );
}

// Suppress "palette is unused" warnings — the import is kept so the
// component's color-token surface is one search away if we ever swap
// to a palette token instead of the inline hex.
void palette;
