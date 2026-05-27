/**
 * ProductGuide — rounded rectangle product-label frame.
 *
 * Replaces the legacy Reticle "product" branch with a proper
 * label-shaped frame that reads as a real product scanner, not a
 * face oval reused. Animated state-driven stroke + corner ticks +
 * outer glow.
 *
 * Honest contract: this component does NOT do label OCR. The
 * stroke color/intensity is driven by the controller's
 * `instruction.severity` plus a `detected` flag the caller wires
 * once a real recognizer lands. Until then we stay on neutral.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { Severity } from '@/screens/scan/scanController';

const TONE: Record<
  Severity,
  { stroke: string; glow: string; opacity: number; ticks: string }
> = {
  neutral: {
    stroke: 'rgba(196,212,232,0.62)',
    glow: 'transparent',
    opacity: 0.86,
    ticks: 'rgba(196,212,232,0.58)',
  },
  warning: {
    stroke: '#F5B85C',
    glow: '#F5B85C',
    opacity: 1,
    ticks: '#F5B85C',
  },
  ready: {
    stroke: '#68D8FF',
    glow: '#1C8DFF',
    opacity: 1,
    ticks: '#7EF2C2',
  },
  error: {
    stroke: '#FF7A7A',
    glow: '#FF5C5C',
    opacity: 1,
    ticks: '#FF7A7A',
  },
};

export interface ProductGuideProps {
  severity: Severity;
  width: number;   // camera region width
  height: number;  // camera region height
}

const FRAME_WIDTH_FRACTION = 0.82;
const FRAME_HEIGHT_FRACTION = 0.30;
const FRAME_RADIUS = 30;
const FRAME_TOP_FRACTION = 0.18;
const TICK_LENGTH = 22;
const TICK_STROKE = 2.5;

export function ProductGuide({ severity, width, height }: ProductGuideProps) {
  const reduceMotion = useReduceMotion();
  const tone = TONE[severity];

  const frameW = Math.round(width * FRAME_WIDTH_FRACTION);
  const frameH = Math.round(height * FRAME_HEIGHT_FRACTION);
  const frameLeft = Math.round((width - frameW) / 2);
  const frameTop = Math.round(height * FRAME_TOP_FRACTION);

  // Subtle breathing on the ready/glow values only — never neutral.
  const breathing = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || severity !== 'ready') {
      cancelAnimation(breathing);
      breathing.value = withTiming(0, { duration: 200 });
      return;
    }
    breathing.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      true
    );
    return () => cancelAnimation(breathing);
  }, [reduceMotion, severity, breathing]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      severity === 'ready'
        ? 0.18 + 0.1 * breathing.value
        : severity === 'warning'
        ? 0.14
        : severity === 'error'
        ? 0.12
        : 0,
  }));

  // Vignette dims outside the frame so the user knows where to point.
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Vignette width={width} height={height} />

      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            left: frameLeft - 6,
            top: frameTop - 6,
            width: frameW + 12,
            height: frameH + 12,
            borderRadius: FRAME_RADIUS + 4,
            shadowColor: tone.glow,
            shadowRadius: 20,
            shadowOpacity: 1,
            shadowOffset: { width: 0, height: 0 },
            borderColor: tone.glow,
            borderWidth: 0.5,
          },
          glowStyle,
        ]}
      />

      {/* Main frame */}
      <View
        style={[
          styles.frame,
          {
            left: frameLeft,
            top: frameTop,
            width: frameW,
            height: frameH,
            borderRadius: FRAME_RADIUS,
            borderColor: tone.stroke,
            borderWidth: severity === 'ready' ? 2.5 : 2,
            opacity: tone.opacity,
          },
        ]}
      />

      {/* Corner ticks — short, rounded segments that hint precision. */}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {cornerPaths(frameLeft, frameTop, frameW, frameH, FRAME_RADIUS).map(
          (d, i) => (
            <Path
              key={i}
              d={d}
              stroke={tone.ticks}
              strokeWidth={TICK_STROKE}
              strokeLinecap="round"
              fill="none"
              opacity={severity === 'neutral' ? 0.55 : 1}
            />
          )
        )}
      </Svg>
    </View>
  );
}

function cornerPaths(
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number
): string[] {
  const right = left + width;
  const bottom = top + height;
  // Each tick is an L drawn just outside the rounded corner so the
  // user reads the frame as a precision scanner.
  return [
    `M ${left + radius} ${top - 8} L ${left + radius + TICK_LENGTH} ${top - 8}`,
    `M ${left - 8} ${top + radius} L ${left - 8} ${top + radius + TICK_LENGTH}`,
    `M ${right - radius - TICK_LENGTH} ${top - 8} L ${right - radius} ${top - 8}`,
    `M ${right + 8} ${top + radius} L ${right + 8} ${top + radius + TICK_LENGTH}`,
    `M ${left + radius} ${bottom + 8} L ${left + radius + TICK_LENGTH} ${bottom + 8}`,
    `M ${left - 8} ${bottom - radius - TICK_LENGTH} L ${left - 8} ${bottom - radius}`,
    `M ${right - radius - TICK_LENGTH} ${bottom + 8} L ${right - radius} ${bottom + 8}`,
    `M ${right + 8} ${bottom - radius - TICK_LENGTH} L ${right + 8} ${bottom - radius}`,
  ];
}

function Vignette({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <LinearGradient id="prod-vignette-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="prod-vignette-bottom" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={width}
        height={Math.round(height * 0.18)}
        fill="url(#prod-vignette-top)"
      />
      <Rect
        x="0"
        y={height - Math.round(height * 0.22)}
        width={width}
        height={Math.round(height * 0.22)}
        fill="url(#prod-vignette-bottom)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    elevation: 10,
  },
});
