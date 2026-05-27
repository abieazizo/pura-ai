/**
 * SkinMapV2 — stylized SVG face outline with severity-coded dots.
 *
 * Editorial, not clinical: a single-stroke face outline with pulsing
 * dots placed at canonical anatomical anchors. No photo overlay, no
 * landmark detection — the map renders the same way for every user.
 *
 * Anchors come from `ZONE_COORDS` in `@/types/scanResultV2`. Two
 * findings on the same zone are auto-offset so they don't stack.
 *
 * Tapping a dot selects it: the dot scales 1.3x, every other dot
 * fades to 30% opacity, and the parent receives the new selected
 * finding id.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  SEVERITY_COLOR,
  ZONE_COORDS,
  type ScanFindingV2,
} from '@/types/scanResultV2';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FACE_STROKE = 'rgba(60,40,30,0.35)';
const FACE_STROKE_WIDTH = 1.5;

// 3:4 viewBox.
const VB_WIDTH = 300;
const VB_HEIGHT = 400;
const FACE_PADDING = 0.12;

// A single-stroke editorial face outline drawn against a 0..1
// normalized coordinate space. The path covers the head silhouette,
// jawline, eye sockets, brows, nose, lips, and a chin curve.
function buildFaceOutlinePath(): string {
  const x = (n: number) => (FACE_PADDING + n * (1 - FACE_PADDING * 2)) * VB_WIDTH;
  const y = (n: number) => (FACE_PADDING + n * (1 - FACE_PADDING * 2)) * VB_HEIGHT;

  // Outline: top of head -> down the right side -> chin -> back up
  // the left -> close. Using two cubic curves on each side for a
  // gentle editorial feel.
  const top = `M ${x(0.5)} ${y(0.02)}`;
  const rightTop = `C ${x(0.92)} ${y(0.04)} ${x(1.0)} ${y(0.32)} ${x(0.96)} ${y(0.5)}`;
  const rightJaw = `C ${x(0.92)} ${y(0.74)} ${x(0.78)} ${y(0.92)} ${x(0.5)} ${y(1.0)}`;
  const leftJaw = `C ${x(0.22)} ${y(0.92)} ${x(0.08)} ${y(0.74)} ${x(0.04)} ${y(0.5)}`;
  const leftTop = `C ${x(0.0)} ${y(0.32)} ${x(0.08)} ${y(0.04)} ${x(0.5)} ${y(0.02)}`;
  return `${top} ${rightTop} ${rightJaw} ${leftJaw} ${leftTop} Z`;
}

const FACE_PATH = buildFaceOutlinePath();

function buildFeaturesPaths(): {
  leftBrow: string;
  rightBrow: string;
  leftEye: string;
  rightEye: string;
  nose: string;
  mouth: string;
} {
  const x = (n: number) => (FACE_PADDING + n * (1 - FACE_PADDING * 2)) * VB_WIDTH;
  const y = (n: number) => (FACE_PADDING + n * (1 - FACE_PADDING * 2)) * VB_HEIGHT;
  // Brows — small curve above each eye.
  const leftBrow = `M ${x(0.26)} ${y(0.33)} Q ${x(0.34)} ${y(0.30)} ${x(0.42)} ${y(0.33)}`;
  const rightBrow = `M ${x(0.58)} ${y(0.33)} Q ${x(0.66)} ${y(0.30)} ${x(0.74)} ${y(0.33)}`;
  // Eye outlines — soft almond.
  const leftEye = `M ${x(0.26)} ${y(0.40)} Q ${x(0.34)} ${y(0.36)} ${x(0.42)} ${y(0.40)} Q ${x(0.34)} ${y(0.44)} ${x(0.26)} ${y(0.40)}`;
  const rightEye = `M ${x(0.58)} ${y(0.40)} Q ${x(0.66)} ${y(0.36)} ${x(0.74)} ${y(0.40)} Q ${x(0.66)} ${y(0.44)} ${x(0.58)} ${y(0.40)}`;
  // Nose — single line from glabella down + small tip curve.
  const nose = `M ${x(0.50)} ${y(0.40)} L ${x(0.50)} ${y(0.55)} Q ${x(0.46)} ${y(0.58)} ${x(0.50)} ${y(0.59)}`;
  // Mouth — two-curve outline.
  const mouth = `M ${x(0.41)} ${y(0.66)} Q ${x(0.50)} ${y(0.64)} ${x(0.59)} ${y(0.66)} Q ${x(0.50)} ${y(0.70)} ${x(0.41)} ${y(0.66)}`;
  return { leftBrow, rightBrow, leftEye, rightEye, nose, mouth };
}

const FEATURE_PATHS = buildFeaturesPaths();

interface DotSpec {
  findingId: string;
  cx: number;
  cy: number;
  color: string;
  severity: 1 | 2 | 3 | 4 | 5;
}

function buildDots(findings: ScanFindingV2[]): DotSpec[] {
  // Track per-zone offset so two findings on the same zone don't
  // stack on top of each other. First occurrence at the anchor;
  // subsequent ones shifted by (8, -8) each.
  const offsetByZone = new Map<string, number>();
  return findings.map((f) => {
    const anchor = ZONE_COORDS[f.zone];
    const count = offsetByZone.get(f.zone) ?? 0;
    offsetByZone.set(f.zone, count + 1);
    const offX = count * 8;
    const offY = count * -8;
    return {
      findingId: f.id,
      cx: anchor.cx * VB_WIDTH + offX,
      cy: anchor.cy * VB_HEIGHT + offY,
      color: SEVERITY_COLOR[f.severity],
      severity: f.severity,
    };
  });
}

export interface SkinMapV2Props {
  findings: ScanFindingV2[];
  selectedFindingId: string | null;
  onSelect(findingId: string | null): void;
  width: number;
}

export function SkinMapV2({
  findings,
  selectedFindingId,
  onSelect,
  width,
}: SkinMapV2Props) {
  const height = Math.round((width * VB_HEIGHT) / VB_WIDTH);
  const dots = useMemo(() => buildDots(findings), [findings]);

  return (
    <View
      style={[styles.wrap, { width, height }]}
      accessibilityRole="image"
      accessibilityLabel="Skin map showing findings on a stylized face outline"
    >
      <Svg width={width} height={height} viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}>
        {/* Face outline */}
        <Path
          d={FACE_PATH}
          stroke={FACE_STROKE}
          strokeWidth={FACE_STROKE_WIDTH}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Editorial features (brows / eyes / nose / mouth) */}
        <G>
          <Path
            d={FEATURE_PATHS.leftBrow}
            stroke={FACE_STROKE}
            strokeWidth={FACE_STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={FEATURE_PATHS.rightBrow}
            stroke={FACE_STROKE}
            strokeWidth={FACE_STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={FEATURE_PATHS.leftEye}
            stroke={FACE_STROKE}
            strokeWidth={FACE_STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={FEATURE_PATHS.rightEye}
            stroke={FACE_STROKE}
            strokeWidth={FACE_STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={FEATURE_PATHS.nose}
            stroke={FACE_STROKE}
            strokeWidth={FACE_STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={FEATURE_PATHS.mouth}
            stroke={FACE_STROKE}
            strokeWidth={FACE_STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
        </G>

        {/* Halos (rendered first so dots paint over them) */}
        {dots.map((d, i) => (
          <DotHalo
            key={`halo-${d.findingId}`}
            spec={d}
            index={i}
            selected={d.findingId === selectedFindingId}
            anySelected={selectedFindingId !== null}
          />
        ))}

        {/* Dots themselves — wrapped in a transparent tap target via
            an overlay Pressable below. SVG handles the visual only. */}
        {dots.map((d, i) => (
          <DotCore
            key={`dot-${d.findingId}`}
            spec={d}
            index={i}
            selected={d.findingId === selectedFindingId}
            anySelected={selectedFindingId !== null}
          />
        ))}
      </Svg>

      {/* Tap-target overlay. Each dot has a circular Pressable
          positioned in container coordinates. */}
      {dots.map((d) => {
        const radius = 6 + d.severity * 1.5;
        const tapRadius = Math.max(28, radius * 2.6);
        const dotX = (d.cx / VB_WIDTH) * width;
        const dotY = (d.cy / VB_HEIGHT) * height;
        return (
          <Pressable
            key={`tap-${d.findingId}`}
            onPress={() =>
              onSelect(
                selectedFindingId === d.findingId ? null : d.findingId,
              )
            }
            style={[
              styles.tap,
              {
                width: tapRadius * 2,
                height: tapRadius * 2,
                left: dotX - tapRadius,
                top: dotY - tapRadius,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Finding ${d.findingId}, severity ${d.severity}`}
          />
        );
      })}
    </View>
  );
}

interface DotProps {
  spec: DotSpec;
  index: number;
  selected: boolean;
  anySelected: boolean;
}

function DotHalo({ spec, index, selected, anySelected }: DotProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const opacityBase = anySelected ? (selected ? 1 : 0.3) : 1;

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withDelay(
      index * 90,
      withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: 800,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, {
            duration: 800,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, scale, index]);

  const radius = 6 + spec.severity * 1.5;
  const animatedProps = useAnimatedProps(() => ({
    r: radius * 2 * scale.value,
    opacity: 0.4 * opacityBase * (1 - (scale.value - 1) * 1.5),
  }));

  return (
    <AnimatedCircle
      cx={spec.cx}
      cy={spec.cy}
      fill={spec.color}
      animatedProps={animatedProps}
    />
  );
}

function DotCore({ spec, index, selected, anySelected }: DotProps) {
  const enter = useSharedValue(0);
  const selectScale = useSharedValue(1);

  useEffect(() => {
    enter.value = withDelay(
      index * 80,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter, index]);

  useEffect(() => {
    selectScale.value = withTiming(selected ? 1.3 : 1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [selected, selectScale]);

  const radius = 6 + spec.severity * 1.5;
  const opacityBase = anySelected ? (selected ? 1 : 0.3) : 1;

  const animatedProps = useAnimatedProps(() => ({
    r: radius * selectScale.value,
    opacity: enter.value * opacityBase,
  }));

  return (
    <AnimatedCircle
      cx={spec.cx}
      cy={spec.cy}
      fill={spec.color}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tap: {
    position: 'absolute',
  },
});

// ---------------------------------------------------------------------------
// SkinMapLegend — small horizontal strip under the face.
// ---------------------------------------------------------------------------

export function SkinMapLegend() {
  return (
    <View style={legendStyles.row}>
      <LegendItem color={SEVERITY_COLOR[1]} label="Mild" />
      <LegendItem color={SEVERITY_COLOR[3]} label="Moderate" />
      <LegendItem color={SEVERITY_COLOR[5]} label="Pronounced" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.text} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(60,40,30,0.6)',
    textTransform: 'uppercase',
  },
});
