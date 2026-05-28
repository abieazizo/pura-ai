/**
 * EditorialIndexMark — pass 3 custom save affordance.
 *
 * The save / add-to-routine mark for the index rows. Neither heart
 * nor plus. A hairline circle holds a refined two-stroke glyph:
 *   • idle    — a single short vertical stroke + a single short
 *               horizontal stroke (a quiet thumbprint plus).
 *   • saved   — a single horizontal stroke (the entry is filed).
 *               A tiny dot in the upper-right indicates "added".
 *
 * Sizing scales from a single `size` prop so callers can match the
 * row's rhythm without fiddling with internal numbers.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { puraShop } from '@/theme';

export interface EditorialIndexMarkProps {
  size?: number;
  saved?: boolean;
}

export function EditorialIndexMark({
  size = 22,
  saved = false,
}: EditorialIndexMarkProps) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = (s - 1) / 2;
  const strokeColor = saved ? puraShop.coralDeep : puraShop.ink;
  const armLen = s * 0.28;

  return (
    <View style={{ width: s, height: s }} pointerEvents="none">
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={saved ? 0.9 : 0.32}
          strokeWidth={1}
        />
        {saved ? (
          <>
            <Path
              d={`M${cx - armLen} ${cy} L${cx + armLen} ${cy}`}
              stroke={strokeColor}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            {/* Filed-dot: tiny disc in the upper-right quadrant */}
            <Circle
              cx={cx + r * 0.5}
              cy={cy - r * 0.5}
              r={1.4}
              fill={strokeColor}
            />
          </>
        ) : (
          <>
            <Path
              d={`M${cx - armLen} ${cy} L${cx + armLen} ${cy}`}
              stroke={strokeColor}
              strokeWidth={1}
              strokeLinecap="round"
            />
            <Path
              d={`M${cx} ${cy - armLen} L${cx} ${cy + armLen}`}
              stroke={strokeColor}
              strokeWidth={1}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>
    </View>
  );
}

// Keep StyleSheet imported even though all styles are inline via Svg —
// future iterations may add wrapper styles.
const _unused = StyleSheet.create({});
void _unused;
