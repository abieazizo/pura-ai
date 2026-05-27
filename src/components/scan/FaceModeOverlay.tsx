/**
 * FaceModeOverlay — the new face-scan camera overlay.
 *
 * Replaces the v11.x single-Reticle + GuidanceCard pair with a
 * precision scan-coach surface:
 *
 *   1. soft edge vignette
 *   2. face oval (state-driven color + glow + stroke width)
 *   3. four curved corner brackets (slide inward on lock)
 *   4. directional hints (subtle arrows when far/close — drawn from
 *      lighting + framing heuristics, never from fake face detection)
 *   5. instruction pill (title + body)
 *   6. readiness chips: [Face] [Light] [Stable] [Clear]
 *
 * The overlay is a pure presentation layer. Every state decision is
 * made upstream by `useScanReadiness`; this component just renders
 * the appropriate stroke/glow/copy.
 *
 * Honest UX claim: we never paint the oval blue ("ready") before
 * the lighting probe has returned. Before that we sit on the neutral
 * idle color and instruct the user to frame their face — without
 * lying that we've detected anything.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  CheckCircle,
  Sun,
  WarningCircle,
  Sparkle,
  CircleHalf,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  READINESS_COPY,
  toneForState,
  type ChipStatus,
  type ReadinessChips,
  type ScanReadinessState,
} from '@/screens/scan/scanReadiness';

// ---------------------------------------------------------------------------
// Color tokens specific to the camera overlay.
//
// These do NOT live in `src/theme/tokens.ts` because the camera lives in a
// dark, semi-transparent surface and needs its own contrast-tuned palette.
// Keeping them local prevents the tokens file from gaining surface-specific
// color cruft.
// ---------------------------------------------------------------------------

const OVERLAY = {
  // Oval / bracket strokes per state
  strokeIdle: 'rgba(155,174,197,1)',
  strokeWarning: '#F5B85C',
  strokeAlmost: '#F5B85C',
  strokeReady: '#68D8FF',
  readyAccent: '#7EF2C2',

  // Glow tint per tone
  glowWarning: '#F5B85C',
  glowReady: '#1C8DFF',

  // Chip backgrounds (translucent over the dark camera)
  chipBgNeutral: 'rgba(8,17,31,0.52)',
  chipBgWarning: 'rgba(54,38,18,0.76)',
  chipBgPassed: 'rgba(12,43,69,0.76)',
  chipBgError: 'rgba(60,18,24,0.76)',

  // Chip borders
  chipBorderNeutral: 'rgba(255,255,255,0.14)',
  chipBorderWarning: 'rgba(245,184,92,0.34)',
  chipBorderPassed: 'rgba(104,216,255,0.34)',
  chipBorderError: 'rgba(255,122,122,0.32)',

  // Chip text
  chipTextNeutral: 'rgba(255,255,255,0.62)',
  chipTextWarning: '#FFD39A',
  chipTextPassed: '#BFEAFF',
  chipTextError: '#FFC0C0',

  // Chip icon
  chipIconNeutral: 'rgba(255,255,255,0.48)',
  chipIconWarning: '#F5B85C',
  chipIconPassed: '#7EF2C2',
  chipIconError: '#FF7A7A',

  // Instruction pill
  pillBgIdle: 'rgba(7,17,31,0.62)',
  pillBorderIdle: 'rgba(255,255,255,0.14)',
  pillBgWarning: 'rgba(54,38,18,0.72)',
  pillBorderWarning: 'rgba(245,184,92,0.34)',
  pillBgReady: 'rgba(12,43,69,0.76)',
  pillBorderReady: 'rgba(104,216,255,0.38)',

  pillTitleIdle: '#F4F6FA',
  pillBodyIdle: 'rgba(244,246,250,0.78)',
  pillTitleWarning: '#FFE2AD',
  pillBodyWarning: '#FFD39A',
  pillTitleReady: '#E8F8FF',
  pillBodyReady: '#BFEAFF',
};

// ---------------------------------------------------------------------------
// Layout — oval dimensions tuned per the spec.
// ---------------------------------------------------------------------------

const OVAL_WIDTH_FRACTION = 0.74;       // 72-76% of screen width
const OVAL_ASPECT = 1.42;               // height:width ≈ 1.42 (in 0.68-0.72 range when inverted)
const OVAL_TOP_FRACTION = 0.07;         // ~7% from top of camera region

const BRACKET_LEN = 30;
const BRACKET_STROKE = 2.5;
const BRACKET_OFFSET_IDLE = 8;
const BRACKET_OFFSET_ALMOST = 5;
const BRACKET_OFFSET_LOCKED = 3;

// ---------------------------------------------------------------------------
// Tone palette helper.
// ---------------------------------------------------------------------------

function tonePalette(state: ScanReadinessState): {
  stroke: string;
  glow: string;
  glowOpacity: number;
  strokeWidth: number;
  ovalOpacity: number;
  bracketOffset: number;
  pillBg: string;
  pillBorder: string;
  pillTitle: string;
  pillBody: string;
} {
  const tone = toneForState(state);
  switch (tone) {
    case 'warning':
      return {
        stroke: OVERLAY.strokeWarning,
        glow: OVERLAY.glowWarning,
        glowOpacity: 0.16,
        strokeWidth: 2,
        ovalOpacity: 0.92,
        bracketOffset: BRACKET_OFFSET_IDLE,
        pillBg: OVERLAY.pillBgWarning,
        pillBorder: OVERLAY.pillBorderWarning,
        pillTitle: OVERLAY.pillTitleWarning,
        pillBody: OVERLAY.pillBodyWarning,
      };
    case 'almost':
      return {
        stroke: OVERLAY.strokeAlmost,
        glow: OVERLAY.glowWarning,
        glowOpacity: 0.14,
        strokeWidth: 2,
        ovalOpacity: 0.94,
        bracketOffset: BRACKET_OFFSET_ALMOST,
        pillBg: OVERLAY.pillBgWarning,
        pillBorder: OVERLAY.pillBorderWarning,
        pillTitle: OVERLAY.pillTitleWarning,
        pillBody: OVERLAY.pillBodyWarning,
      };
    case 'ready':
      return {
        stroke: OVERLAY.strokeReady,
        glow: OVERLAY.glowReady,
        glowOpacity: state === 'captured' ? 0 : 0.2,
        strokeWidth: 2.5,
        ovalOpacity: 1,
        bracketOffset: BRACKET_OFFSET_LOCKED,
        pillBg: OVERLAY.pillBgReady,
        pillBorder: OVERLAY.pillBorderReady,
        pillTitle: OVERLAY.pillTitleReady,
        pillBody: OVERLAY.pillBodyReady,
      };
    case 'idle':
    default:
      return {
        stroke: OVERLAY.strokeIdle,
        glow: OVERLAY.glowReady,
        glowOpacity: 0,
        strokeWidth: 1.5,
        ovalOpacity: 0.48,
        bracketOffset: BRACKET_OFFSET_IDLE,
        pillBg: OVERLAY.pillBgIdle,
        pillBorder: OVERLAY.pillBorderIdle,
        pillTitle: OVERLAY.pillTitleIdle,
        pillBody: OVERLAY.pillBodyIdle,
      };
  }
}

// ---------------------------------------------------------------------------
// Edge vignette.
//
// Subtle dark gradient at top + bottom; sides stay lighter so the
// user's face is not darkened. Drawn with two SVG rects so we don't
// have to ship a heavier blur primitive.
// ---------------------------------------------------------------------------

function EdgeVignette({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      width={width}
      height={height}
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
    >
      <Defs>
        <LinearGradient id="vignette-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="vignette-bottom" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={width}
        height={Math.round(height * 0.32)}
        fill="url(#vignette-top)"
      />
      <Rect
        x="0"
        y={height - Math.round(height * 0.28)}
        width={width}
        height={Math.round(height * 0.28)}
        fill="url(#vignette-bottom)"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Corner brackets — four curved L-segments hugging the oval.
//
// Drawn as SVG paths so the rounded cap reads as intentional precision
// rather than the chunky right-angle corners the old Reticle used. Each
// bracket animates its inward offset and color when the state changes.
// ---------------------------------------------------------------------------

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
  // The brackets sit just outside the oval bbox at the four
  // diagonal corners. Each is a small L drawn with quadratic
  // beziers so the inner corner is a soft curve.
  const left = ovalLeft - offset;
  const top = ovalTop - offset;
  const right = ovalLeft + ovalWidth + offset;
  const bottom = ovalTop + ovalHeight + offset;
  const len = BRACKET_LEN;

  const brackets: { d: string }[] = [
    // top-left
    {
      d: `M ${left} ${top + len} Q ${left} ${top} ${left + len} ${top}`,
    },
    // top-right
    {
      d: `M ${right - len} ${top} Q ${right} ${top} ${right} ${top + len}`,
    },
    // bottom-left
    {
      d: `M ${left} ${bottom - len} Q ${left} ${bottom} ${left + len} ${bottom}`,
    },
    // bottom-right
    {
      d: `M ${right - len} ${bottom} Q ${right} ${bottom} ${right} ${bottom - len}`,
    },
  ];

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}
    >
      {brackets.map((b, i) => (
        <Path
          key={i}
          d={b.d}
          stroke={color}
          strokeWidth={BRACKET_STROKE}
          strokeLinecap="round"
          fill="none"
          opacity={opacity}
        />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Face oval — animated stroke + outer glow.
// ---------------------------------------------------------------------------

function FaceOval({
  state,
  width,
  height,
  left,
  top,
  reduceMotion,
}: {
  state: ScanReadinessState;
  width: number;
  height: number;
  left: number;
  top: number;
  reduceMotion: boolean;
}) {
  const palette = tonePalette(state);
  const strokeOpacity = useSharedValue(palette.ovalOpacity);
  const breathing = useSharedValue(0);

  useEffect(() => {
    strokeOpacity.value = withTiming(palette.ovalOpacity, {
      duration: 320,
      easing: Easing.bezier(0.18, 0.89, 0.32, 1.08),
    });
  }, [palette.ovalOpacity, strokeOpacity]);

  useEffect(() => {
    if (reduceMotion) {
      breathing.value = 0;
      return;
    }
    if (state === 'ready') {
      breathing.value = withRepeat(
        withTiming(1, {
          duration: 1800,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        -1,
        true
      );
    } else {
      cancelAnimation(breathing);
      breathing.value = withTiming(0, { duration: 240 });
    }
    return () => cancelAnimation(breathing);
  }, [reduceMotion, state, breathing]);

  const animatedOvalStyle = useAnimatedStyle(() => ({
    opacity: strokeOpacity.value,
    transform: [{ scale: 1 + 0.006 * breathing.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity:
      palette.glowOpacity * (0.85 + 0.15 * breathing.value),
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.ovalAnchor, { left, top, width, height }]}
    >
      {/* Outer glow — uses native shadow on a same-sized view so it
          paints behind the oval without an extra SVG. */}
      <Animated.View
        style={[
          styles.ovalGlow,
          {
            width,
            height,
            borderRadius: width / 2,
            shadowColor: palette.glow,
            shadowRadius: 22,
            shadowOpacity: 1,
            shadowOffset: { width: 0, height: 0 },
            borderColor: palette.glow,
            borderWidth: 0.5,
          },
          animatedGlowStyle,
        ]}
      />
      {/* Stroke */}
      <Animated.View
        style={[
          styles.ovalStroke,
          {
            width,
            height,
            borderRadius: width / 2,
            borderColor: palette.stroke,
            borderWidth: palette.strokeWidth,
          },
          animatedOvalStyle,
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ready-check badge — small Pura-green check that appears on lock.
// ---------------------------------------------------------------------------

function ReadyCheck({
  visible,
  centerX,
  bottomY,
}: {
  visible: boolean;
  centerX: number;
  bottomY: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.72);
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    scale.value = withTiming(visible ? 1 : 0.72, {
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [visible, opacity, scale]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.readyCheck,
        { left: centerX - 14, top: bottomY - 14 },
        style,
      ]}
    >
      <View style={styles.readyCheckRing}>
        <CheckCircle size={26} weight="fill" color={OVERLAY.readyAccent} />
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Instruction pill.
// ---------------------------------------------------------------------------

function InstructionPill({
  state,
  width,
}: {
  state: ScanReadinessState;
  width: number;
}) {
  const palette = tonePalette(state);
  const copy = READINESS_COPY[state];

  // Crossfade on copy change.
  const opacity = useSharedValue(1);
  const translate = useSharedValue(0);
  const [rendered, setRendered] = React.useState(copy);
  const [renderedKey, setRenderedKey] = React.useState(state);
  useEffect(() => {
    if (state === renderedKey) return;
    opacity.value = withTiming(0, {
      duration: 140,
      easing: Easing.bezier(0.7, 0, 0.84, 0),
    });
    translate.value = withTiming(-4, { duration: 140 });
    const t = setTimeout(() => {
      setRendered(READINESS_COPY[state]);
      setRenderedKey(state);
      translate.value = 5;
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      translate.value = withTiming(0, {
        duration: 220,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }, 145);
    return () => clearTimeout(t);
  }, [state, renderedKey, opacity, translate]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.pillWrap, { maxWidth: Math.round(width * 0.86) }]}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: palette.pillBg,
            borderColor: palette.pillBorder,
          },
          style,
        ]}
      >
        <Text
          style={[styles.pillTitle, { color: palette.pillTitle }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {rendered.title}
        </Text>
        <Text
          style={[styles.pillBody, { color: palette.pillBody }]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
        >
          {rendered.body}
        </Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Readiness chip row.
// ---------------------------------------------------------------------------

const CHIP_DEF: ReadonlyArray<{
  key: keyof ReadinessChips;
  label: string;
  Icon: React.FC<PhosphorIconProps>;
}> = [
  { key: 'face', label: 'Face', Icon: CircleHalf as React.FC<PhosphorIconProps> },
  { key: 'light', label: 'Light', Icon: Sun as React.FC<PhosphorIconProps> },
  { key: 'stable', label: 'Stable', Icon: Sparkle as React.FC<PhosphorIconProps> },
  { key: 'clear', label: 'Clear', Icon: CheckCircle as React.FC<PhosphorIconProps> },
];

function chipPalette(status: ChipStatus) {
  switch (status) {
    case 'passed':
      return {
        bg: OVERLAY.chipBgPassed,
        border: OVERLAY.chipBorderPassed,
        text: OVERLAY.chipTextPassed,
        icon: OVERLAY.chipIconPassed,
      };
    case 'warning':
      return {
        bg: OVERLAY.chipBgWarning,
        border: OVERLAY.chipBorderWarning,
        text: OVERLAY.chipTextWarning,
        icon: OVERLAY.chipIconWarning,
      };
    case 'error':
      return {
        bg: OVERLAY.chipBgError,
        border: OVERLAY.chipBorderError,
        text: OVERLAY.chipTextError,
        icon: OVERLAY.chipIconError,
      };
    case 'neutral':
    default:
      return {
        bg: OVERLAY.chipBgNeutral,
        border: OVERLAY.chipBorderNeutral,
        text: OVERLAY.chipTextNeutral,
        icon: OVERLAY.chipIconNeutral,
      };
  }
}

function ChipRow({ chips }: { chips: ReadinessChips }) {
  return (
    <View pointerEvents="none" style={styles.chipRow}>
      {CHIP_DEF.map(({ key, label, Icon }) => {
        const palette = chipPalette(chips[key]);
        return (
          <View
            key={key}
            style={[
              styles.chip,
              { backgroundColor: palette.bg, borderColor: palette.border },
            ]}
          >
            <Icon size={12} weight="fill" color={palette.icon} />
            <Text
              style={[styles.chipText, { color: palette.text }]}
              maxFontSizeMultiplier={1.1}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// FaceModeOverlay — the public composition.
// ---------------------------------------------------------------------------

export interface FaceModeOverlayProps {
  state: ScanReadinessState;
  chips: ReadinessChips;
  /** Camera region width (px). */
  width: number;
  /** Camera region height (px). */
  height: number;
}

export function FaceModeOverlay({
  state,
  chips,
  width,
  height,
}: FaceModeOverlayProps) {
  const reduceMotion = useReduceMotion();
  const palette = tonePalette(state);

  // Oval geometry — scaled to camera region.
  const ovalWidth = Math.round(width * OVAL_WIDTH_FRACTION);
  const ovalHeight = Math.round(ovalWidth * OVAL_ASPECT);
  const ovalLeft = Math.round((width - ovalWidth) / 2);
  const ovalTop = Math.round(height * OVAL_TOP_FRACTION);

  // Animate the bracket offset on state changes.
  const bracketOffset = useSharedValue(BRACKET_OFFSET_IDLE);
  const bracketOpacity = useSharedValue(0.55);
  useEffect(() => {
    bracketOffset.value = withTiming(palette.bracketOffset, {
      duration: 320,
      easing: Easing.bezier(0.18, 0.89, 0.32, 1.08),
    });
    const targetOpacity =
      state === 'ready' ? 1 : state === 'almost_ready' ? 0.92 : state === 'low_light' || state === 'harsh_light' ? 0.9 : 0.6;
    bracketOpacity.value = withTiming(targetOpacity, { duration: 280 });
  }, [palette.bracketOffset, state, bracketOffset, bracketOpacity]);

  // Read animated values into a memoized snapshot at render. We
  // accept that the bracket position changes only as fast as JS
  // re-renders here — that's plenty smooth for the inward-slide
  // moment because state transitions are themselves event-driven.
  const [bracketSnapshot, setBracketSnapshot] = React.useState(() => ({
    offset: palette.bracketOffset,
    opacity: 0.55,
  }));
  useEffect(() => {
    setBracketSnapshot({
      offset: palette.bracketOffset,
      opacity:
        state === 'ready'
          ? 1
          : state === 'almost_ready'
          ? 0.92
          : state === 'low_light' || state === 'harsh_light'
          ? 0.9
          : 0.6,
    });
  }, [state, palette.bracketOffset]);

  // Layout: vignette → oval + brackets → instruction pill above
  // chip row (both anchored below the oval).
  const pillTop = ovalTop + ovalHeight + 18;
  const chipsTop = pillTop + 76; // pill height ~68

  const showCheck = state === 'ready';

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <EdgeVignette width={width} height={height} />

      <CornerBrackets
        ovalLeft={ovalLeft}
        ovalTop={ovalTop}
        ovalWidth={ovalWidth}
        ovalHeight={ovalHeight}
        color={palette.stroke}
        offset={bracketSnapshot.offset}
        opacity={bracketSnapshot.opacity}
      />

      <FaceOval
        state={state}
        width={ovalWidth}
        height={ovalHeight}
        left={ovalLeft}
        top={ovalTop}
        reduceMotion={reduceMotion}
      />

      <ReadyCheck
        visible={showCheck}
        centerX={ovalLeft + ovalWidth / 2}
        bottomY={ovalTop + ovalHeight + 8}
      />

      <View
        pointerEvents="none"
        style={[
          styles.pillAnchor,
          { top: pillTop, width },
        ]}
      >
        <InstructionPill state={state} width={width} />
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.chipAnchor,
          { top: chipsTop, width },
        ]}
      >
        <ChipRow chips={chips} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  pillAnchor: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pill: {
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    lineHeight: 18,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  pillBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
    textAlign: 'center',
  },
  chipAnchor: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
});
