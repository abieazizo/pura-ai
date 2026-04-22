/**
 * Paper-bg score circle painted inside a zone rect on Beat 5.
 *
 * - Bubble radius: 28pt active, 22pt reveal.
 * - Number: Instrument Serif SemiBold, counts up 0 → target over 800ms.
 * - Status word: Inter SemiBold 9pt tracked caps, colored by status tier.
 *   Hidden in reveal-mode (compressed photo) to match the Beat 7 mockup.
 *
 * Renders as SVG primitives so the whole stage can be snapshotted by
 * view-shot without compositing issues.
 */

import React, { useEffect, useState } from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/theme';
import { getStatusColor, getStatusWord } from '../constants';

export interface ZoneScoreBubbleProps {
  cx: number;
  cy: number;
  score: number;
  visible: boolean;
  /** true when photo has compressed into reveal mode (status word hidden). */
  compact?: boolean;
  reduceMotion: boolean;
}

export function ZoneScoreBubble({
  cx,
  cy,
  score,
  visible,
  compact,
  reduceMotion,
}: ZoneScoreBubbleProps) {
  const count = useSharedValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!visible) {
      count.value = 0;
      setDisplay('0');
      return;
    }
    if (reduceMotion) {
      count.value = score;
      setDisplay(`${score}`);
      return;
    }
    count.value = withTiming(score, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, score, reduceMotion, count]);

  useAnimatedReaction(
    () => Math.round(count.value),
    (next, prev) => {
      if (next !== prev) runOnJS(setDisplay)(`${next}`);
    },
    [count]
  );

  if (!visible) return null;

  const radius = compact ? 22 : 28;
  const statusColor = getStatusColor(score);
  const statusWord = getStatusWord(score);

  return (
    <G>
      {/* Paper-tinted fill so the score reads off a warm disc, not a cold white. */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={palette.bg}
        fillOpacity={0.92}
      />
      <SvgText
        x={cx}
        y={compact ? cy + 8 : cy - 1}
        fill={palette.clay}
        fontFamily="InstrumentSerif-SemiBold"
        fontSize={compact ? 22 : 26}
        fontWeight="700"
        textAnchor="middle"
      >
        {display}
      </SvgText>
      {!compact ? (
        <SvgText
          x={cx}
          y={cy + 14}
          fill={statusColor}
          fontFamily="Inter-SemiBold"
          fontSize={9}
          letterSpacing={1.2}
          textAnchor="middle"
        >
          {statusWord}
        </SvgText>
      ) : null}
    </G>
  );
}
