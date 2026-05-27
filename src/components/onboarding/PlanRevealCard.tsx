import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface PlanRevealCardProps {
  /** Uppercase tracker label, e.g. "YOUR FOCUS". */
  kicker: string;
  /** Headline value, e.g. "Breakouts". */
  value: string;
  /** Two-line body. */
  body: string;
  /** Optional phosphor icon shown left of the kicker. */
  Icon?: React.FC<PhosphorIconProps>;
}

/**
 * v20.0 — plan reveal info card. Used in the PlanReveal screen to
 * present a single dimension of the user's profile (focus, routine
 * style, skin pattern, timeline) as a compact, scannable tile.
 *
 * Layout: kicker · large value · body. Background is a soft blue-tinted
 * surface so the cards group visually as "your reveal" without
 * competing with the rest of the screen.
 */
export function PlanRevealCard({ kicker, value, body, Icon }: PlanRevealCardProps) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${kicker}: ${value}. ${body}`}>
      <View style={styles.kickerRow}>
        {Icon ? (
          <Icon size={14} color={palette.clay} weight="duotone" />
        ) : null}
        <Text style={styles.kicker} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {kicker}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {value}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.2}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.clayPaper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.clayLight,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 124,
    flex: 1,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.clay,
  },
  value: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: palette.ink,
    marginTop: 8,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginTop: 8,
  },
});
