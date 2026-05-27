import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { T, TYPE, RADIUS } from './tokens';

/**
 * v25 — SemanticBadge. The single canonical badge component. Each
 * variant maps to a real system meaning. No decorative variants exist:
 * the spec rejects "Personalized" / "AI Powered" / "Smart" badges.
 *
 * Color is always paired with a text label so badge meaning is never
 * conveyed by color alone (accessibility).
 */

export type BadgeVariant =
  // Status (signal cards, home insight rows)
  | 'focus'
  | 'improving'
  | 'stable'
  | 'need-more-data'
  | 'not-counted'
  // Routine priority (step cards)
  | 'required'
  | 'recommended'
  | 'optional'
  | 'essential'
  | 'avoid-tonight'
  // Product compatibility (product cards + detail)
  | 'safe'
  | 'paused-tonight'
  | 'avoid-now'
  | 'review-needed';

interface SemanticBadgeProps {
  variant: BadgeVariant;
  /** Override the default label. Most callers should use the default. */
  label?: string;
  /** Tiny circular emphasis dot. Only set when it adds meaning. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const META: Record<
  BadgeVariant,
  { label: string; bg: string; fg: string; border?: string }
> = {
  focus:           { label: 'Focus',          bg: T.terracottaSoft, fg: T.terracottaDeep },
  improving:       { label: 'Improving',      bg: T.sageSoft,       fg: T.sage },
  stable:          { label: 'Stable',         bg: T.neutralSoft,    fg: T.neutralDeep },
  'need-more-data':{ label: 'Need more data', bg: T.neutralSoft,    fg: T.neutralMid },
  'not-counted':   { label: 'Not counted',    bg: T.failedSoft,     fg: T.terracottaDeep },
  required:        { label: 'Required',      bg: T.terracottaSoft, fg: T.terracottaDeep },
  recommended:     { label: 'Recommended',   bg: T.neutralSoft,    fg: T.neutralDeep },
  optional:        { label: 'Optional',      bg: 'transparent',    fg: T.neutralMid, border: T.lineStrong },
  essential:       { label: 'Essential',     bg: T.amberSoft,      fg: T.amber },
  'avoid-tonight': { label: 'Avoid tonight', bg: T.terracottaSoft, fg: T.terracottaDeep },
  safe:            { label: 'Safe',          bg: T.sageSoft,       fg: T.sage },
  'paused-tonight':{ label: 'Paused tonight',bg: T.neutralSoft,    fg: T.neutralDeep },
  'avoid-now':     { label: 'Avoid now',     bg: T.terracottaSoft, fg: T.terracottaDeep },
  'review-needed': { label: 'Review needed', bg: T.amberSoft,      fg: T.amber },
};

export function SemanticBadge({
  variant,
  label,
  dot,
  style,
}: SemanticBadgeProps) {
  const meta = META[variant];
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: meta.bg, borderColor: meta.border ?? 'transparent', borderWidth: meta.border ? 1 : 0 },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label ?? meta.label}
    >
      {dot ? (
        <View style={[s.dot, { backgroundColor: meta.fg }]} />
      ) : null}
      <Text
        style={[s.label, { color: meta.fg }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {label ?? meta.label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: TYPE.sansSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
});
