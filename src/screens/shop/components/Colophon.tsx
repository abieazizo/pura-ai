/**
 * Colophon — round-2 Pass 10. The shop's closing publication mark.
 *
 * "Pura Shop · Issue 19 · For M., 29 May 26 · Edited by Nora Okafor
 * in San Francisco · ©2026 Pura"
 *
 * Set on a full-width hairline with the kicker centered. Reads as
 * the masthead of an actual indie magazine you bought, not an app.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { puraShop, puraShopLayout } from '@/theme';
import { EDITOR_NORA } from '../curator';

export interface ColophonProps {
  issueNumber: number;
  userInitial?: string | null;
  dateStamp: string; // "29 MAY 26"
  city?: string;
}

export function Colophon({
  issueNumber,
  userInitial,
  dateStamp,
  city = 'San Francisco',
}: ColophonProps) {
  const issuePadded = String(issueNumber).padStart(2, '0');
  const year = new Date().getFullYear();
  return (
    <View style={styles.outer}>
      <View style={styles.rule} />
      <Text style={styles.kicker} maxFontSizeMultiplier={1.05}>
        COLOPHON
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.1}>
        Pura Shop  ·  Issue No. {issuePadded}
        {userInitial ? `  ·  For ${userInitial}., ${dateStamp.toLowerCase()}` : `  ·  ${dateStamp.toLowerCase()}`}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.1}>
        Edited by {EDITOR_NORA.name} in {city}.
      </Text>
      <Text style={styles.copyright} maxFontSizeMultiplier={1.05}>
        ©{year} Pura
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginTop: 56,
    paddingBottom: 24,
    alignItems: 'center',
  },
  rule: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderStrongWarm,
    marginBottom: 18,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 2.6,
    color: puraShop.coralDeep,
    marginBottom: 14,
  },
  body: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 22,
    color: puraShop.inkSecondary,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  copyright: {
    marginTop: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 0.8,
    color: puraShop.inkMuted,
  },
});
