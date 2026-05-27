/**
 * FaceGuide — face-scan oval + corner brackets + ready check.
 *
 * Extract of the visual primitives that previously lived inside
 * FaceModeOverlay. Pure presentation; consumes only the resolved
 * `Severity` from the controller. The shared InstructionCard +
 * QualityCheckRow handle the rest of the overlay so all three
 * scan modes (face/product/barcode) compose identically.
 *
 * Honest UX claim preserved: the oval stays on neutral (low
 * opacity slate) until the controller earns a different severity.
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
import { CheckCircle } from 'phosphor-react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { Severity } from '@/screens/scan/scanController';

const TONE: Record<
  Severity,
  {
    stroke: string;
    glow: string;
    glowOpacity: number;
    strokeWidth: number;
    ovalOpacity: number;
    bracketOffset: number;
    bracketOpacity: number;
  }
> = {
  neutral: {
    stroke: 'rgba(155,174,197,1)',
    glow: '#1C8DFF',
    glowOpacity: 0,
    strokeWidth: 1.5,
    ovalOpacity: 0.5,
    bracketOffset: 8,
    bracketOpacity: 0.6,
  },
  warning: {
    stroke: '#F5B85C',
    glow: '#F5B85C',
    glowOpacity: 0.16,
    strokeWidth: 2,
    ovalOpacity: 0.94,
    bracketOffset: 5,
    bracketOpacity: 0.94,
  },
  ready: {
    stroke: '#68D8FF',
    glow: '#1C8DFF',
    glowOpacity: 0.22,
    strokeWidth: 2.5,
    ovalOpacity: 1,
    bracketOffset: 3,
    bracketOpacity: 1,
  },
  error: {
    stroke: '#FF7A7A',
    glow: '#FF5C5C',
    glowOpacity: 0.18,
    strokeWidth: 2,
    ovalOpacity: 0.94,
    bracketOffset: 6,
    bracketOpacity: 0.92,
  },
};

const OVAL_WIDTH_FRACTION = 0.74;
const OVAL_ASPECT = 1.42;
const OVAL_TOP_FRACTION = 0.06;
const BRACKET_LEN = 30;
const BRACKET_STROKE = 2.5;

export interface FaceGuideProps {
  severity: Severity;
  /** True when the controller has earned the ready phase — drives the check badge. */
  ready: boolean;
  width: number;
  height: number;
}

export function FaceGuide({ severity, ready, width, height }: FaceGuideProps) {
  const reduceMotion = useReduceMotion();
  const tone = TONE[severity];

  const ovalWidth = Math.round(width * OVAL_WIDTH_FRACTION);
  const ovalHeight = Math.round(ovalWidth * OVAL_ASPECT);
  const ovalLeft = Math.round((width - ovalWidth) / 2);
  const ovalTop = Math.round(height * OVAL_TOP_FRACTION);

  // Breathing on ready only.
  const breathing = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || severity !== 'ready') {
      cancelAnimation(breathing);
      breathing.value = withTiming(0, { duration: 220 });
      return;
    }
    breathing.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      true
    );
    return () => cancelAnimation(breathing);
  }, [reduceMotion, severity, breathing]);

  // Animate stroke opacity + glow opacity on severity changes.
  const strokeOpacity = useSharedValue(tone.ovalOpacity);
  const glowOpacity = useSharedValue(tone.glowOpacity);
  useEffect(() => {
    strokeOpacity.value = withTiming(tone.ovalOpacity, {
      duration: 320,
      easing: Easing.bezier(0.18, 0.89, 0.32, 1.08),
    });
    glowOpacity.value = withTiming(tone.glowOpacity, {
      duration: 320,
      easing: Easing.bezier(0.18, 0.89, 0.32, 1.08),
    });
  }, [tone.ovalOpacity, tone.glowOpacity, strokeOpacity, glowOpacity]);

  const ovalStyle = useAnimatedStyle(() => ({
    opacity: strokeOpacity.value,
    transform: [{ scale: 1 + 0.006 * breathing.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * (0.85 + 0.15 * breathing.value),
  }));

  // Check badge.
  const checkOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0.72);
  useEffect(() => {
    checkOpacity.value = withTiming(ready ? 1 : 0, {
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    checkScale.value = withTiming(ready ? 1 : 0.72, {
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [ready, checkOpacity, checkScale]);
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <EdgeVignette width={width} height={height} />

      <CornerBrackets
        ovalLeft={ovalLeft}
        ovalTop={ovalTop}
        ovalWidth={ovalWidth}
        ovalHeight={ovalHeight}
        color={tone.stroke}
        offset={tone.bracketOffset}
        opacity={tone.bracketOpacity}
      />

      <View
        pointerEvents="none"
        style={[
          styles.ovalAnchor,
          { left: ovalLeft, top: ovalTop, width: ovalWidth, height: ovalHeight },
        ]}
      >
        <Animated.View
          style={[
            styles.ovalGlow,
            {
              width: ovalWidth,
              height: ovalHeight,
              borderRadius: ovalWidth / 2,
              shadowColor: tone.glow,
              shadowRadius: 22,
              shadowOpacity: 1,
              shadowOffset: { width: 0, height: 0 },
              borderColor: tone.glow,
              borderWidth: 0.5,
            },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.ovalStroke,
            {
              width: ovalWidth,
              height: ovalHeight,
              borderRadius: ovalWidth / 2,
              borderColor: tone.stroke,
              borderWidth: tone.strokeWidth,
            },
            ovalStyle,
          ]}
        />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.readyCheck,
          {
            left: ovalLeft + ovalWidth / 2 - 14,
            top: ovalTop + ovalHeight - 6,
          },
          checkStyle,
        ]}
      >
        <View style={styles.readyCheckRing}>
          <CheckCircle size={26} weight="fill" color="#7EF2C2" />
        </View>
      </Animated.View>
    </View>
  );
}

function CornerBrackets({
  ovalLeft,
  ovalTop,
  ovalWidth,
  ovalHeight,
  color,
  offset,
  opacity,
}: {
  ovalLeft: number;
  ovalTop: number;
  ovalWidth: number;
  ovalHeight: number;
  color: string;
  offset: number;
  opacity: number;
}) {
  const left = ovalLeft - offset;
  const top = ovalTop - offset;
  const right = ovalLeft + ovalWidth + offset;
  const bottom = ovalTop + ovalHeight + offset;
  const len = BRACKET_LEN;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Path
        d={`M ${left} ${top + len} Q ${left} ${top} ${left + len} ${top}`}
        stroke={color}
        strokeWidth={BRACKET_STROKE}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
      <Path
        d={`M ${right - len} ${top} Q ${right} ${top} ${right} ${top + len}`}
        stroke={color}
        strokeWidth={BRACKET_STROKE}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
      <Path
        d={`M ${left} ${bottom - len} Q ${left} ${bottom} ${left + len} ${bottom}`}
        stroke={color}
        strokeWidth={BRACKET_STROKE}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
      <Path
        d={`M ${right - len} ${bottom} Q ${right} ${bottom} ${right} ${bottom - len}`}
        stroke={color}
        strokeWidth={BRACKET_STROKE}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
    </Svg>
  );
}

function EdgeVignette({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      width={width}
      height={height}
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <LinearGradient id="face-vignette-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="face-vignette-bottom" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={width}
        height={Math.round(height * 0.3)}
        fill="url(#face-vignette-top)"
      />
      <Rect
        x="0"
        y={height - Math.round(height * 0.26)}
        width={width}
        height={Math.round(height * 0.26)}
        fill="url(#face-vignette-bottom)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  ovalAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalStroke: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  ovalGlow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    elevation: 12,
  },
  readyCheck: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCheckRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.78)',
  },
});
