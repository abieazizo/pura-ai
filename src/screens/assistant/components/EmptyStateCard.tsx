import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'phosphor-react-native';
import { dx, dRadius, dShadow } from '../decisionTokens';
import { PrimaryDecisionButton } from './PrimaryDecisionButton';
import { SecondaryActionButton } from './SecondaryActionButton';
import { SectionEyebrow } from './SectionEyebrow';

interface Props {
  title: string;
  body: string;
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
  /** Provenance line — e.g. "Based on today's scan only · …" */
  provenance?: string;
  /** When true, render a small camera glyph in the eyebrow slot. */
  showCameraGlyph?: boolean;
  eyebrowLabel?: string;
}

/**
 * Empty / incomplete-data card used for "no scan yet", "scan but no
 * products", and similar pre-decision states. The shell mirrors the
 * Decision Card so the user understands they are in the same room —
 * Pura just doesn't have enough information to make tonight's call
 * yet.
 */
export function EmptyStateCard({
  title,
  body,
  primary,
  onPrimary,
  secondary,
  onSecondary,
  provenance,
  showCameraGlyph,
  eyebrowLabel,
}: Props) {
  return (
    <View style={[styles.card, dShadow.card]}>
      {eyebrowLabel ? (
        <View style={styles.eyebrowRow}>
          {showCameraGlyph ? (
            <Camera size={14} color={dx.terracotta} weight="duotone" />
          ) : null}
          <SectionEyebrow label={eyebrowLabel} tone="terracotta" />
        </View>
      ) : null}

      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.3}>
        {body}
      </Text>

      <View style={styles.actions}>
        <PrimaryDecisionButton label={primary} onPress={onPrimary} />
        {secondary && onSecondary ? (
          <View style={styles.secondaryWrap}>
            <SecondaryActionButton
              label={secondary}
              onPress={onSecondary}
              underline
            />
          </View>
        ) : null}
      </View>

      {provenance ? (
        <Text style={styles.provenance} maxFontSizeMultiplier={1.25}>
          {provenance}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: dx.surfacePrimary,
    borderRadius: dRadius.decisionCard,
    borderWidth: 1,
    borderColor: dx.line,
    padding: 22,
    gap: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: dx.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: dx.inkSecondary,
  },
  actions: {
    marginTop: 6,
    gap: 4,
  },
  secondaryWrap: {
    paddingTop: 6,
  },
  provenance: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: dx.inkMuted,
    marginTop: 6,
  },
});
