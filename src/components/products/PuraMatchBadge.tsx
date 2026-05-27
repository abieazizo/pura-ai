/**
 * PuraMatchBadge — reusable match score badge.
 *
 * Used on product cards, best-next-move hero, and product detail.
 * Renders a percent number + a one-word label ("Strong fit",
 * "Good fit", "Supportive", "Use carefully") and tints the badge by
 * confidence band.
 */

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '@/theme';

export type MatchBand = 'strong' | 'good' | 'supportive' | 'caution';

export interface PuraMatchBadgeProps {
  /** 0..100 integer, or null when no real match exists. */
  score: number | null;
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg';
  /** Show a one-word label after the percent. */
  showLabel?: boolean;
  /** Optional custom override for the label. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function PuraMatchBadge({
  score,
  size = 'md',
  showLabel = true,
  label,
  style,
}: PuraMatchBadgeProps) {
  const isReal = typeof score === 'number' && score > 0;
  const band: MatchBand = bandFor(score);
  const tone = toneFor(band);
  const text = label ?? labelFor(band, isReal);
  const sizes = sizeFor(size);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          paddingHorizontal: sizes.padX,
          paddingVertical: sizes.padY,
          borderRadius: sizes.radius,
          gap: sizes.gap,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={
        isReal
          ? `Pura Match ${score} percent, ${text}`
          : `Pura Match ${text}`
      }
    >
      {isReal ? (
        <Text
          style={[
            styles.value,
            { color: tone.fg, fontSize: sizes.valueSize },
          ]}
          maxFontSizeMultiplier={1.15}
        >
          {`${score}`}
          <Text style={[styles.unit, { color: tone.fg, fontSize: sizes.unitSize }]}>
            %
          </Text>
        </Text>
      ) : null}
      {showLabel ? (
        <Text
          style={[
            styles.label,
            { color: tone.fg, fontSize: sizes.labelSize },
          ]}
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bandFor(score: number | null): MatchBand {
  if (score === null || score === undefined) return 'supportive';
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 55) return 'supportive';
  return 'caution';
}

function labelFor(band: MatchBand, isReal: boolean): string {
  if (!isReal) return 'Curated pick';
  switch (band) {
    case 'strong':
      return 'Strong fit';
    case 'good':
      return 'Good fit';
    case 'supportive':
      return 'Supportive';
    case 'caution':
      return 'Use carefully';
  }
}

function toneFor(band: MatchBand): {
  bg: string;
  border: string;
  fg: string;
} {
  switch (band) {
    case 'strong':
      return {
        bg: palette.mossLight,
        border: palette.moss,
        fg: palette.mossDeep,
      };
    case 'good':
      return {
        bg: palette.clayPaper,
        border: palette.clayLight,
        fg: palette.clayDeep,
      };
    case 'supportive':
      return {
        bg: palette.bgDeep,
        border: palette.hairline,
        fg: palette.inkSecondary,
      };
    case 'caution':
      return {
        bg: palette.amberLight,
        border: palette.amber,
        fg: palette.amberDeep,
      };
  }
}

function sizeFor(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        padX: 7,
        padY: 3,
        radius: 999,
        gap: 4,
        valueSize: 11,
        unitSize: 9,
        labelSize: 10,
      };
    case 'md':
      return {
        padX: 10,
        padY: 5,
        radius: 999,
        gap: 6,
        valueSize: 13,
        unitSize: 10,
        labelSize: 11,
      };
    case 'lg':
      return {
        padX: 14,
        padY: 8,
        radius: 14,
        gap: 8,
        valueSize: 22,
        unitSize: 14,
        labelSize: 12,
      };
  }
}

// ---------------------------------------------------------------------------
// Deterministic match scoring (used when a candidate carries no AI score)
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic 0..100 match score from the candidate's
 * concern tags and the user's primary concerns + skin type. Pure;
 * same inputs always produce the same number. Never random.
 */
export function deriveMatchScore(args: {
  /** Concern tags on the candidate (e.g. ["breakouts","hydration"]). */
  candidateConcerns: string[];
  /** Match score from the engine, when present (0..1 or 0..100). */
  engineScore?: number | null;
  /** User's top concerns (canonical labels). */
  userConcerns?: string[];
  /** Optional skin type — accepts the widened store union ('balanced',
   *  'not_sure') so callers don't need to cast at the call site. */
  skinType?:
    | 'oily'
    | 'dry'
    | 'combination'
    | 'sensitive'
    | 'balanced'
    | 'not_sure'
    | null;
}): number {
  const { candidateConcerns, engineScore, userConcerns = [] } = args;

  // Prefer the engine's score when meaningful.
  if (typeof engineScore === 'number' && engineScore > 0) {
    const normalized =
      engineScore <= 1 ? Math.round(engineScore * 100) : Math.round(engineScore);
    return clamp(normalized, 30, 99);
  }

  // Derive from concern overlap.
  if (userConcerns.length === 0 || candidateConcerns.length === 0) {
    // Curated pick — return mid-band.
    return 72;
  }
  const normalizedUser = userConcerns.map((c) => c.toLowerCase());
  const overlap = candidateConcerns.filter((c) =>
    normalizedUser.some((u) => u.includes(c.toLowerCase()) || c.toLowerCase().includes(u))
  ).length;
  const ratio = overlap / Math.max(1, normalizedUser.length);
  const base = 65 + Math.round(ratio * 25); // 65..90 band
  return clamp(base, 55, 95);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: {
    fontFamily: 'InstrumentSerif-SemiBold',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
});
