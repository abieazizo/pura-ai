/**
 * HighlightedText — renders a product name with the matched search
 * substring in coral semibold so the user sees instantly why a
 * card is in their results.
 *
 * Highlights only the first occurrence of each query token. Falls
 * back to plain text when no tokens are provided.
 */

import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { puraShop } from '@/theme';

export interface HighlightedTextProps {
  text: string;
  tokens?: readonly string[];
  /** Base text style. */
  style?: StyleProp<TextStyle>;
  /** Style applied to the highlighted spans. Defaults to coral semibold. */
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
}

export function HighlightedText({
  text,
  tokens,
  style,
  highlightStyle,
  numberOfLines,
  maxFontSizeMultiplier,
}: HighlightedTextProps) {
  if (!tokens || tokens.length === 0) {
    return (
      <Text
        style={style}
        numberOfLines={numberOfLines}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {text}
      </Text>
    );
  }

  // Find the earliest non-overlapping match for any token, in lower-case
  // comparison but using the original text for display so case is
  // preserved.
  const lowered = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const t of tokens) {
    if (t.length < 1) continue;
    const tLower = t.toLowerCase();
    const idx = lowered.indexOf(tLower);
    if (idx < 0) continue;
    ranges.push([idx, idx + tLower.length]);
  }
  if (ranges.length === 0) {
    return (
      <Text
        style={style}
        numberOfLines={numberOfLines}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {text}
      </Text>
    );
  }
  // Merge overlapping ranges, sorted by start.
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) {
      last[1] = Math.max(last[1], r[1]);
    } else {
      merged.push([r[0], r[1]]);
    }
  }
  // Build the text spans.
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], i) => {
    if (start > cursor) {
      parts.push(<Text key={`p-${i}`}>{text.slice(cursor, start)}</Text>);
    }
    parts.push(
      <Text key={`h-${i}`} style={[styles.highlight, highlightStyle]}>
        {text.slice(start, end)}
      </Text>,
    );
    cursor = end;
  });
  if (cursor < text.length) {
    parts.push(<Text key="t-end">{text.slice(cursor)}</Text>);
  }

  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
    >
      {parts}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    color: puraShop.coralDeep,
    fontFamily: 'Inter-SemiBold',
  },
});
