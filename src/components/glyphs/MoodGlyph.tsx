import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { palette } from '@/theme';

export type MoodKind = 'calming' | 'healing' | 'stable' | 'active';

export interface MoodGlyphProps {
  size?: number;
  mood: MoodKind;
}

/**
 * Four small emotive glyphs for zone moods. Each is a minimal shape mark
 * with a single stroke and one filled detail — meant to read as signature,
 * not as an illustration.
 */
export function MoodGlyph({ size = 24, mood }: MoodGlyphProps) {
  const stroke = palette.clay;
  switch (mood) {
    case 'calming':
      // A settling curl — single arc with a drop
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 12 Q 12 4 20 12 Q 12 20 4 12 Z"
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
          />
          <Circle cx={12} cy={12} r={2} fill={stroke} />
        </Svg>
      );
    case 'healing':
      // A rising petal shape
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3 C 18 9, 18 15, 12 21 C 6 15, 6 9, 12 3 Z"
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
          />
          <Circle cx={12} cy={10} r={1.5} fill={stroke} />
        </Svg>
      );
    case 'stable':
      // A horizontal equilibrium glyph
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 12 L 20 12"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Circle cx={6} cy={12} r={1.5} fill={stroke} />
          <Circle cx={18} cy={12} r={1.5} fill={stroke} />
        </Svg>
      );
    case 'active':
      // A small spark
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3 L 14 10 L 21 12 L 14 14 L 12 21 L 10 14 L 3 12 L 10 10 Z"
            fill={stroke}
            opacity={0.9}
          />
        </Svg>
      );
  }
}
