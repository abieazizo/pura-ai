import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface TutorialBullet {
  Icon: React.FC<PhosphorIconProps>;
  label: string;
}

export interface TutorialTextBlockProps {
  headline: string;
  subhead: string;
  bullets: TutorialBullet[];
}

/**
 * Left-aligned editorial text block for each tutorial page (§3.5).
 * Headline in Instrument Serif 36pt, subhead italic serif 17pt @ 70% ink,
 * three bullets with Phosphor duotone icons.
 */
export function TutorialTextBlock({
  headline,
  subhead,
  bullets,
}: TutorialTextBlockProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
        {headline}
      </Text>
      <Text style={styles.subhead} maxFontSizeMultiplier={1.2}>
        {subhead}
      </Text>
      <View style={styles.bullets}>
        {bullets.slice(0, 3).map((b, i) => {
          const Icon = b.Icon;
          return (
            <View key={i} style={styles.bulletRow}>
              <Icon
                size={20}
                color="rgba(26,22,20,0.7)"
                weight="duotone"
                style={styles.bulletIcon}
              />
              <Text style={styles.bulletLabel} maxFontSizeMultiplier={1.25}>
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 32,
    marginTop: 24,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: palette.ink,
  },
  subhead: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 17 * 1.35,
    color: 'rgba(26,22,20,0.7)',
    marginTop: 16,
  },
  bullets: {
    marginTop: 24,
    gap: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  bulletLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(26,22,20,0.85)',
    flex: 1,
  },
});
