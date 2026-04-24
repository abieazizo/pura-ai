/**
 * A single zone — renders its tinted rect(s) and its floating label pill.
 *
 * v10.16 — the per-zone numeric score bubbles (ZoneScoreBubble) are gone.
 * Five floating numbers on a face read as arbitrary and cheap; the single
 * overall Skin Score medallion on ScanResultsFaceScreen is the score
 * moment. Zones still tint during partition/detect to show "where the AI
 * is looking," but they no longer carry values of their own.
 *
 * Opacity schedule:
 *   beat 'partition'        → 0.22 (fade in with scale 0.96 → 1.0)
 *   beat 'detect' | 'score' → 0.18
 *   beat 'settle' | 'reveal'→ 0.10
 *
 * Label pill flashes: 300ms in, 700ms hold, 300ms out — only on Beat 3.
 */

import React, { useEffect } from 'react';
import { G, Rect, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import type { ScanZoneKey } from '@/types';
import {
  ZONE_LABELS,
  ZONE_TINT,
  type NormRect,
  type ZoneTintKey,
} from '../constants';
import type { Beat } from '../hooks/useAnalysisChoreography';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface ZoneOverlayProps {
  zone: ScanZoneKey;
  rects: NormRect[];
  photoSize: { w: number; h: number };
  visible: boolean;
  beat: Beat;
  reduceMotion: boolean;
}

const TINT_HEX: Record<ZoneTintKey, string> = {
  clay: palette.clay,
  moss: palette.moss,
  sand: palette.sand,
};

function opacityForBeat(beat: Beat): number {
  switch (beat) {
    case 'arrive':
    case 'locate':
      return 0;
    case 'partition':
      return 0.22;
    case 'detect':
    case 'score':
      return 0.18;
    case 'settle':
    case 'reveal':
      return 0.10;
    default:
      return 0;
  }
}

export function ZoneOverlay({
  zone,
  rects,
  photoSize,
  visible,
  beat,
  reduceMotion,
}: ZoneOverlayProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      return;
    }
    const target = opacityForBeat(beat);
    if (reduceMotion) {
      opacity.value = target;
      scale.value = 1;
      labelOpacity.value = 0;
      return;
    }
    opacity.value = withTiming(target, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    // Flash the label on Beat 3 then hide it.
    if (beat === 'partition') {
      labelOpacity.value = withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withDelay(700, withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }))
      );
    } else {
      labelOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, beat, reduceMotion, opacity, scale, labelOpacity]);

  const rectAnimatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  const tint = TINT_HEX[ZONE_TINT[zone]];

  // Anchor the label pill above the first rect center (forehead/tZone/chin)
  // or beside the first rect for cheeks (label floats to the left/right).
  const firstRect = rects[0];
  const labelAnchor = labelAnchorFor(zone, firstRect, photoSize);

  return (
    <G>
      {rects.map((r, i) => {
        const x = r.x * photoSize.w;
        const y = r.y * photoSize.h;
        const w = r.w * photoSize.w;
        const h = r.h * photoSize.h;
        const rx = Math.min(w, h) * 0.45;
        return (
          <AnimatedRect
            key={`rect-${i}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx}
            ry={rx}
            fill={tint}
            fillOpacity={0.6}
            animatedProps={rectAnimatedProps}
          />
        );
      })}

      {/* Label pill — small rounded rect with centered uppercase text. */}
      <ZoneLabelPill
        x={labelAnchor.x}
        y={labelAnchor.y}
        text={ZONE_LABELS[zone]}
        labelOpacity={labelOpacity}
      />

      {/* v10.16 — numeric per-zone score bubbles removed. The single
          overall Skin Score medallion on the result screen is the only
          number the user sees; zones stay silent. */}
    </G>
  );
}

function labelAnchorFor(
  zone: ScanZoneKey,
  rect: NormRect,
  photo: { w: number; h: number }
) {
  const centerX = (rect.x + rect.w / 2) * photo.w;
  const centerY = (rect.y + rect.h / 2) * photo.h;
  switch (zone) {
    case 'forehead':
      // Anchor above the rect.
      return { x: centerX, y: rect.y * photo.h - 6 };
    case 'chin':
      // Anchor below the rect.
      return { x: centerX, y: (rect.y + rect.h) * photo.h + 18 };
    case 'tZone':
      // Anchor to the right of the rect.
      return { x: (rect.x + rect.w) * photo.w + 46, y: centerY + 4 };
    case 'cheeks':
      // Anchor to the left of the (first, i.e. left) cheek rect.
      return { x: rect.x * photo.w - 24, y: centerY + 4 };
    default:
      return { x: centerX, y: centerY };
  }
}

function ZoneLabelPill({
  x,
  y,
  text,
  labelOpacity,
}: {
  x: number;
  y: number;
  text: string;
  labelOpacity: SharedValue<number>;
}) {
  // Approx character width — Inter SemiBold 10 is ~7.2px per letter for uppercase.
  const charW = 7.2;
  const padH = 10;
  const padV = 5;
  const textW = text.length * charW;
  const pillW = textW + padH * 2;
  const pillH = 18;
  const pillX = x - pillW / 2;
  const pillY = y - pillH / 2;

  const pillProps = useAnimatedProps(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <AnimatedG animatedProps={pillProps}>
      <Rect
        x={pillX}
        y={pillY}
        width={pillW}
        height={pillH}
        rx={pillH / 2}
        ry={pillH / 2}
        fill={palette.clay}
      />
      <SvgText
        x={x}
        y={y + padV * 0.6}
        fill={palette.bg}
        fontFamily="Inter-SemiBold"
        fontSize={10}
        letterSpacing={1.4}
        textAnchor="middle"
      >
        {text}
      </SvgText>
    </AnimatedG>
  );
}
