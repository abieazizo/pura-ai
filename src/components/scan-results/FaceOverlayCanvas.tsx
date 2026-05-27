/**
 * FaceOverlayCanvas — concern overlay layer drawn over the captured
 * photo on the Skin Map slide.
 *
 * Truth-first contract:
 *   • The canvas only paints overlays for supported visible findings.
 *     Face anatomy is NEVER rendered as a concern.
 *   • Labels never sit on the photo. Concern identity is communicated
 *     by the chip strip + the inline callout above the photo.
 *   • At most three overlays render at once: the selected concern at
 *     full opacity, secondary concerns at low opacity.
 *   • When there are no supported findings, this component returns
 *     null — the parent must route to the no-findings conclusion
 *     screen instead.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  G,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type {
  FaceLandmarkResult,
  ImageRenderTransform,
  VisibleFinding,
} from '@/types/scanResults';
import { concernVisuals } from '@/theme/scanResultsTokens';
import { buildZoneGeometry } from '@/services/scanResults/faceGeometry';
import { mapNormalizedPointToRenderedImage } from '@/services/scanResults/imageTransform';

export interface FaceOverlayCanvasProps {
  width: number;
  height: number;
  geometry: FaceLandmarkResult | null;
  transform: ImageRenderTransform | null;
  visibleFindings: VisibleFinding[];
  selectedFindingId: string | null;
  /** Optional handler — receives the finding id of the tapped zone,
   *  or null when the tap was outside any zone. */
  onZonePress?(findingId: string | null): void;
}

interface Shape {
  id: string;
  findingId: string;
  type: VisibleFinding['type'];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
  border: string;
  glow: string;
  tint: string;
  /** 0 = top priority for stagger ordering. */
  staggerIndex: number;
  /** Selection opacity (multiplied by precisionScale). */
  selectionOpacity: number;
}

const MAX_SIMULTANEOUS_OVERLAYS = 3;

export function FaceOverlayCanvas({
  width,
  height,
  geometry,
  transform,
  visibleFindings,
  selectedFindingId,
  onZonePress,
}: FaceOverlayCanvasProps) {
  const shapes = useMemo<Shape[]>(() => {
    if (!geometry || !transform) return [];
    if (visibleFindings.length === 0) return [];

    // TRUTH-FIRST: do not paint approximate overlays on a real face.
    // If the AI did not return a usable face_overlay (landmarks), we
    // have no honest way to place a concern on the photo. The chips,
    // focus cards, and insights still surface the finding TEXTUALLY,
    // but the photo stays clean.
    if (!geometry.usableForOverlay) return [];

    const out: Shape[] = [];

    // Cap simultaneous overlays so the face stays legible.
    const findingsToRender = visibleFindings.slice(0, MAX_SIMULTANEOUS_OVERLAYS);

    let staggerIndex = 0;
    for (const finding of findingsToRender) {
      if (!finding.present || !finding.supportedByScan) continue;
      const visual = concernVisuals[finding.type];
      if (!visual) continue;

      const isSelected =
        selectedFindingId === null
          ? staggerIndex === 0
          : selectedFindingId === finding.id;
      // Selected: full opacity. Others: 24% so the face stays the
      // visual subject. No precisionScale — overlays only paint when
      // geometry is real.
      const selectionOpacity = isSelected ? 1 : 0.24;

      const myStagger = staggerIndex;
      staggerIndex += 1;

      for (const zone of finding.zones) {
        const shape = buildZoneGeometry(zone, geometry);
        if (shape.kind !== 'ellipse') continue;
        const centerR = mapNormalizedPointToRenderedImage(
          { x: shape.cx, y: shape.cy },
          transform
        );
        const edgeR = mapNormalizedPointToRenderedImage(
          { x: shape.cx + shape.rx, y: shape.cy + shape.ry },
          transform
        );
        const rxPx = Math.abs(edgeR.x - centerR.x);
        const ryPx = Math.abs(edgeR.y - centerR.y);
        if (rxPx <= 1 || ryPx <= 1) continue;
        out.push({
          id: `${finding.id}_${zone}`,
          findingId: finding.id,
          type: finding.type,
          cx: centerR.x,
          cy: centerR.y,
          rx: rxPx,
          ry: ryPx,
          fill: visual.fill,
          border: visual.border,
          glow: visual.glow,
          tint: visual.tint,
          staggerIndex: myStagger,
          selectionOpacity,
        });
      }
    }

    // Selected concern paints last so its outline sits on top.
    out.sort((a, b) => a.selectionOpacity - b.selectionOpacity);
    return out;
  }, [geometry, transform, visibleFindings, selectedFindingId]);

  const handleTap = (x: number, y: number) => {
    if (!onZonePress) return;
    let bestId: string | null = null;
    let bestScore = Infinity;
    for (const s of shapes) {
      const dx = (x - s.cx) / s.rx;
      const dy = (y - s.cy) / s.ry;
      const d = dx * dx + dy * dy;
      if (d <= 1.4 && d < bestScore) {
        bestScore = d;
        bestId = s.findingId;
      }
    }
    onZonePress(bestId);
  };

  if (shapes.length === 0) return null;

  return (
    <View
      style={[styles.wrap, { width, height }]}
      pointerEvents={onZonePress ? 'auto' : 'none'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {onZonePress ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) =>
            handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)
          }
        />
      ) : null}
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        pointerEvents="none"
      >
        <Defs>
          {shapes.map((s) => (
            <RadialGradient
              key={`grad-${s.id}`}
              id={`grad-${s.id}`}
              cx="50%"
              cy="50%"
              rx="58%"
              ry="58%"
              fx="42%"
              fy="40%"
            >
              <Stop offset="0%" stopColor={s.fill} stopOpacity={1} />
              <Stop offset="62%" stopColor={s.fill} stopOpacity={0.8} />
              <Stop offset="100%" stopColor={s.fill} stopOpacity={0.15} />
            </RadialGradient>
          ))}
        </Defs>
        <G>
          {shapes.map((s, i) => (
            <AnimatedShape
              key={s.id}
              shape={s}
              gradientId={`grad-${s.id}`}
              index={s.staggerIndex}
              isSelected={
                selectedFindingId !== null &&
                selectedFindingId === s.findingId
              }
              i={i}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const AnimatedG = Animated.createAnimatedComponent(G);

function AnimatedShape({
  shape,
  gradientId,
  index,
  isSelected,
  i,
}: {
  shape: Shape;
  gradientId: string;
  index: number;
  isSelected: boolean;
  i: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const stagger = index * 80;
    opacity.value = withDelay(
      stagger,
      withTiming(shape.selectionOpacity, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [opacity, shape.selectionOpacity, index, i]);

  useEffect(() => {
    opacity.value = withTiming(shape.selectionOpacity, {
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [shape.selectionOpacity, opacity]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Ellipse
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx * 1.18}
        ry={shape.ry * 1.18}
        fill={shape.glow}
      />
      <Ellipse
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        fill={`url(#${gradientId})`}
      />
      <Ellipse
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        fill="none"
        stroke={shape.border}
        strokeWidth={isSelected ? 1.4 : 0.8}
      />
      {isSelected ? (
        <Ellipse
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx + 4}
          ry={shape.ry + 4}
          fill="none"
          stroke={shape.tint}
          strokeWidth={1.0}
          strokeDasharray="3,4"
          opacity={0.55}
        />
      ) : null}
    </AnimatedG>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
});
