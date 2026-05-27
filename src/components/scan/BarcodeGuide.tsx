/**
 * BarcodeGuide — compact bracket with a subtle scan line.
 *
 * Sized smaller than the product frame and faster-feeling than the
 * face oval. The barcode bracket is intentionally minimal — barcode
 * scanning is utility work, not face analysis.
 *
 * Honest contract: the auto-detection signal comes from expo-camera's
 * `onBarcodeScanned` callback in the parent screen. This component
 * just renders the visual state.
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
  { stroke: string; glow: string; line: string }
> = {
  neutral: {
    stroke: 'rgba(196,212,232,0.78)',
    glow: 'transparent',
    line: '#7EF2C2',
  },
  warning: {
    stroke: '#F5B85C',
    glow: '#F5B85C',
    line: '#F5B85C',
  },
  ready: {
    stroke: '#68D8FF',
    glow: '#1C8DFF',
    line: '#7EF2C2',
  },
  error: {
    stroke: '#FF7A7A',
    glow: '#FF5C5C',
    line: '#FF7A7A',
  },
};

export interface BarcodeGuideProps {
  severity: Severity;
  width: number;
  height: number;
}

const FRAME_WIDTH_FRACTION = 0.72;
const FRAME_HEIGHT = 140;
const CORNER_LEN = 24;
const STROKE = 2.5;

export function BarcodeGuide({ severity, width, height }: BarcodeGuideProps) {
  const reduceMotion = useReduceMotion();
  const tone = TONE[severity];

  const frameW = Math.round(width * FRAME_WIDTH_FRACTION);
  const frameH = FRAME_HEIGHT;
  const frameLeft = Math.round((width - frameW) / 2);
  const frameTop = Math.round(height * 0.32);

  // Horizontal scan line — pauses when severity flips to ready
  // (i.e. once the runtime decodes a value).
  const lineProgress = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || severity === 'ready' || severity === 'error') {
      cancelAnimation(lineProgress);
      lineProgress.value = withTiming(0, { duration: 200 });
      return;
    }
    lineProgress.value = 0;
    lineProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      false
    );
    return () => cancelAnimation(lineProgress);
  }, [reduceMotion, severity, lineProgress]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (frameH - 4) * lineProgress.value }],
    opacity:
      lineProgress.value < 0.08
        ? lineProgress.value * 10
        : lineProgress.value > 0.92
        ? (1 - lineProgress.value) * 10
        : 0.85,
  }));

  // Subtle glow on warning/ready.
  const glowOpacity = useSharedValue(0);
  useEffect(() => {
    glowOpacity.value = withTiming(
      severity === 'ready' ? 0.22 : severity === 'warning' ? 0.14 : 0,
      { duration: 240 }
    );
  }, [severity, glowOpacity]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Vignette width={width} height={height} />

      <Animated.View
        style={[
          styles.glow,
          {
            left: frameLeft - 6,
            top: frameTop - 6,
            width: frameW + 12,
            height: frameH + 12,
            borderRadius: 14,
            shadowColor: tone.glow,
            shadowRadius: 18,
            shadowOpacity: 1,
            shadowOffset: { width: 0, height: 0 },
            borderColor: tone.glow,
            borderWidth: 0.5,
          },
          glowStyle,
        ]}
      />

      <View
        style={[
          styles.frame,
          {
            left: frameLeft,
            top: frameTop,
            width: frameW,
            height: frameH,
            borderColor: 'transparent',
          },
        ]}
      >
        {/* Animated scan line clipped inside the frame. */}
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: tone.line,
              shadowColor: tone.line,
            },
            lineStyle,
          ]}
        />
      </View>

      {/* Corner brackets — drawn as SVG paths so the rounded caps
          read as precision marks rather than blunt right angles. */}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {cornerPaths(frameLeft, frameTop, frameW, frameH).map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={tone.stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

function cornerPaths(
  left: number,
  top: number,
  width: number,
  height: number
): string[] {
  const right = left + width;
  const bottom = top + height;
  const r = 10;
  return [
    // top-left
    `M ${left} ${top + CORNER_LEN} L ${left} ${top + r} Q ${left} ${top} ${left + r} ${top} L ${left + CORNER_LEN} ${top}`,
    // top-right
    `M ${right - CORNER_LEN} ${top} L ${right - r} ${top} Q ${right} ${top} ${right} ${top + r} L ${right} ${top + CORNER_LEN}`,
    // bottom-left
    `M ${left} ${bottom - CORNER_LEN} L ${left} ${bottom - r} Q ${left} ${bottom} ${left + r} ${bottom} L ${left + CORNER_LEN} ${bottom}`,
    // bottom-right
    `M ${right - CORNER_LEN} ${bottom} L ${right - r} ${bottom} Q ${right} ${bottom} ${right} ${bottom - r} L ${right} ${bottom - CORNER_LEN}`,
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
        <LinearGradient id="barcode-vignette-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={width}
        height={Math.round(height * 0.22)}
        fill="url(#barcode-vignette-top)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    elevation: 10,
  },
  line: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    borderRadius: 2,
    shadowRadius: 8,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
  },
});
