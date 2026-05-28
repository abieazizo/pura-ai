/**
 * SkinMapV2 — stylized SVG face outline with severity-coded dots.
 *
 * v32.1 — Expo Go safe edition.
 *
 *   The previous version used `Animated.createAnimatedComponent(Circle)`
 *   from react-native-svg + `useAnimatedProps` to drive the `r` and
 *   `opacity` attributes of SVG circles. That pattern crashes reliably
 *   in Expo Go because the bundled native binary's Reanimated worklet
 *   bridge does not forward animated attribute updates to SVG nodes
 *   the same way as a custom dev client.
 *
 *   This version separates concerns cleanly:
 *     • The SVG renders ONLY static elements (face outline, features).
 *       No animated SVG props anywhere.
 *     • Dots are positioned absolutely on top of the SVG as
 *       `Animated.View` circles (borderRadius does the shape work).
 *       Animation runs on `transform: scale` + `opacity` via
 *       `useAnimatedStyle` — the most battle-tested Reanimated
 *       pattern, identical to every other animated surface in Pura.
 *     • Tap targets are still rendered above the dots as plain
 *       Pressables.
 *
 *   The map looks identical to the user; only the implementation
 *   shifted off the fragile animated-SVG bridge.
 */

import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
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

const FACE_STROKE = 'rgba(60,40,30,0.35)';
const FACE_STROKE_WIDTH = 1.5;

// 3:4 viewBox.
const VB_WIDTH = 300;
const VB_HEIGHT = 400;
const FACE_PADDING = 0.12;

function buildFaceOutlinePath(): string {
  const x = (n: number) => (FACE_PADDING + n * (1 - FACE_PADDING * 2)) * VB_WIDTH;
  const y = (n: number) => (FACE_PADDING + n * (1 - FACE_PADDING * 2)) * VB_HEIGHT;
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
  const leftBrow = `M ${x(0.26)} ${y(0.33)} Q ${x(0.34)} ${y(0.30)} ${x(0.42)} ${y(0.33)}`;
  const rightBrow = `M ${x(0.58)} ${y(0.33)} Q ${x(0.66)} ${y(0.30)} ${x(0.74)} ${y(0.33)}`;
  const leftEye = `M ${x(0.26)} ${y(0.40)} Q ${x(0.34)} ${y(0.36)} ${x(0.42)} ${y(0.40)} Q ${x(0.34)} ${y(0.44)} ${x(0.26)} ${y(0.40)}`;
  const rightEye = `M ${x(0.58)} ${y(0.40)} Q ${x(0.66)} ${y(0.36)} ${x(0.74)} ${y(0.40)} Q ${x(0.66)} ${y(0.44)} ${x(0.58)} ${y(0.40)}`;
  const nose = `M ${x(0.50)} ${y(0.40)} L ${x(0.50)} ${y(0.55)} Q ${x(0.46)} ${y(0.58)} ${x(0.50)} ${y(0.59)}`;
  const mouth = `M ${x(0.41)} ${y(0.66)} Q ${x(0.50)} ${y(0.64)} ${x(0.59)} ${y(0.66)} Q ${x(0.50)} ${y(0.70)} ${x(0.41)} ${y(0.66)}`;
  return { leftBrow, rightBrow, leftEye, rightEye, nose, mouth };
}

const FEATURE_PATHS = buildFeaturesPaths();

interface DotSpec {
  findingId: string;
  /** Normalized 0..1 within the viewBox. */
  nx: number;
  ny: number;
  color: string;
  severity: 1 | 2 | 3 | 4 | 5;
}

const FALLBACK_ANCHOR = { cx: 0.5, cy: 0.5 };
const FALLBACK_COLOR = '#7FA8C4';

function buildDots(findings: ScanFindingV2[]): DotSpec[] {
  // Track per-zone offset so two findings on the same zone don't
  // stack on top of each other.
  const offsetByZone = new Map<string, number>();
  return findings
    .filter((f) => f && typeof f.id === 'string')
    .map((f) => {
      const anchor = ZONE_COORDS[f.zone] ?? FALLBACK_ANCHOR;
      const sev =
        typeof f.severity === 'number' && f.severity >= 1 && f.severity <= 5
          ? (Math.round(f.severity) as 1 | 2 | 3 | 4 | 5)
          : 2;
      const color = SEVERITY_COLOR[sev] ?? FALLBACK_COLOR;
      const count = offsetByZone.get(f.zone) ?? 0;
      offsetByZone.set(f.zone, count + 1);
      // Convert (cx, cy) into normalized viewBox space, then add a
      // small per-collision offset (in viewBox units).
      const offX = (count * 8) / VB_WIDTH;
      const offY = (count * -8) / VB_HEIGHT;
      return {
        findingId: f.id,
        nx: anchor.cx + offX,
        ny: anchor.cy + offY,
        color,
        severity: sev,
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
  const anySelected = selectedFindingId !== null;

  // The face outline materializes on mount — fades in with a slight zoom
  // from 0.96 → 1.0 so it feels like it's emerging rather than just
  // appearing. Dots run their own staggered entrance above this.
  const svgFade = useSharedValue(0);
  useEffect(() => {
    svgFade.value = withTiming(1, {
      duration: 480,
      easing: Easing.out(Easing.cubic),
    });
  }, [svgFade]);
  const svgStyle = useAnimatedStyle(() => ({
    opacity: svgFade.value,
    transform: [{ scale: 0.96 + svgFade.value * 0.04 }],
  }));

  return (
    <View
      style={[styles.wrap, { width, height }]}
      accessibilityRole="image"
      accessibilityLabel="Skin map showing findings on a stylized face outline"
    >
      {/* Static SVG wrapped in Animated.View so the face outline
          materializes on mount without touching animated SVG attributes. */}
      <Animated.View style={svgStyle} pointerEvents="none">
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
      >
        <Path
          d={FACE_PATH}
          stroke={FACE_STROKE}
          strokeWidth={FACE_STROKE_WIDTH}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
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
      </Svg>
      </Animated.View>

      {/* Dots — plain Animated.View circles positioned over the SVG.
          This is the Expo-Go-safe pattern: no animated SVG props. */}
      {dots.map((d, i) => (
        <Dot
          key={`dot-${d.findingId}`}
          spec={d}
          index={i}
          selected={d.findingId === selectedFindingId}
          anySelected={anySelected}
          frameWidth={width}
          frameHeight={height}
          onPress={() =>
            onSelect(selectedFindingId === d.findingId ? null : d.findingId)
          }
        />
      ))}
    </View>
  );
}

interface DotProps {
  spec: DotSpec;
  index: number;
  selected: boolean;
  anySelected: boolean;
  frameWidth: number;
  frameHeight: number;
  onPress: () => void;
}

function Dot({
  spec,
  index,
  selected,
  anySelected,
  frameWidth,
  frameHeight,
  onPress,
}: DotProps) {
  const reduceMotion = useReduceMotion();

  // Halo: independent breathing scale that loops while mounted.
  const haloScale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      haloScale.value = 1;
      return;
    }
    haloScale.value = withDelay(
      index * 90,
      withRepeat(
        withSequence(
          withTiming(1.18, {
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
  }, [reduceMotion, haloScale, index]);

  // Core: entrance from 0 → 1, then scales 1.3× when selected.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(
      index * 80,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter, index]);

  const selectScale = useSharedValue(1);
  useEffect(() => {
    selectScale.value = withTiming(selected ? 1.3 : 1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [selected, selectScale]);

  const opacityBase = anySelected ? (selected ? 1 : 0.3) : 1;

  // Visual dot size — bigger for higher severity.
  const coreSize = (6 + spec.severity * 1.5) * 2; // px diameter
  const haloSize = coreSize * 2.4;

  // Anchor position clamped so the core dot never overflows the frame.
  // Cluster offsets on high-density zones can push nx/ny outside 0..1;
  // without this clamp the dot renders partially outside the SVG bounds.
  const coreRadius = coreSize / 2;
  const cx = Math.max(coreRadius, Math.min(frameWidth - coreRadius, spec.nx * frameWidth));
  const cy = Math.max(coreRadius, Math.min(frameHeight - coreRadius, spec.ny * frameHeight));

  // Tap target — generous, never smaller than 44pt to clear the
  // Accessibility floor.
  const tapSize = Math.max(48, coreSize * 2.6);

  const haloStyle = useAnimatedStyle(() => ({
    opacity:
      enter.value *
      0.32 *
      opacityBase *
      (1 - Math.max(0, (haloScale.value - 1) * 1.5)),
    transform: [{ scale: haloScale.value }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: enter.value * opacityBase,
    transform: [{ scale: selectScale.value }],
  }));

  return (
    <>
      {/* Halo — soft outer glow that breathes. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            left: cx - haloSize / 2,
            top: cy - haloSize / 2,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: spec.color,
          },
          haloStyle,
        ]}
      />
      {/* Core dot. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.core,
          {
            left: cx - coreSize / 2,
            top: cy - coreSize / 2,
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: spec.color,
          },
          coreStyle,
        ]}
      />
      {/* Tap target — invisible Pressable above the dot. */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Finding, severity ${spec.severity}`}
        accessibilityState={{ selected }}
        hitSlop={8}
        style={[
          styles.tap,
          {
            left: cx - tapSize / 2,
            top: cy - tapSize / 2,
            width: tapSize,
            height: tapSize,
            borderRadius: tapSize / 2,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
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
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#4A3D35',
    letterSpacing: 0.3,
  },
});
