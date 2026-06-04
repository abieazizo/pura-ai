/**
 * Product checkmark — the signature completion mark that *draws* across
 * the hero's product image.
 *
 * A single Pura Blue stroke travels bottom-left → top-right as `progress`
 * advances 0→1, sitting on a soft white underlay so it reads over any
 * product colour. The draw is expressed purely through `strokeDashoffset`
 * computed from a plain number — we deliberately do NOT use the
 * `useAnimatedProps` / `Animated.createAnimatedComponent(Path)` pattern,
 * which crashes in Expo Go (see ProgressRing). The host tweens `progress`
 * and passes it down; this component is pure.
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { CC } from './companionTokens';

export interface ProductCheckmarkProps {
  /** Square edge in px — sized to the product image it overlays. */
  size: number;
  /** 0..1 draw progress. */
  progress: number;
  color?: string;
  strokeWidth?: number;
}

/** Checkmark geometry, scaled into a `size`×`size` box. */
function buildCheck(size: number): { d: string; length: number } {
  const x1 = size * 0.2,  y1 = size * 0.54;
  const x2 = size * 0.42, y2 = size * 0.73;
  const x3 = size * 0.8,  y3 = size * 0.29;
  const d = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`;
  const length =
    Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
  return { d, length };
}

export function ProductCheckmark({
  size,
  progress,
  color = CC.blue,
  strokeWidth = 5,
}: ProductCheckmarkProps) {
  const { d, length } = React.useMemo(() => buildCheck(size), [size]);
  const clamped = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  const offset = length * (1 - clamped);

  return (
    <Svg width={size} height={size} pointerEvents="none">
      {/* White underlay → keeps the blue legible over dark/blue packshots. */}
      <Path
        d={d}
        stroke={CC.white}
        strokeOpacity={0.9}
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={length}
        strokeDashoffset={offset}
      />
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={length}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}
