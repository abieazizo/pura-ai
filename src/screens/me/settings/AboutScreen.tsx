/**
 * AboutScreen — wordmark, tagline, version, and the product mission.
 *
 * Version is a hardcoded literal (no expo-constants in this build), so
 * it states 1.0.0 honestly rather than reading a value that isn't
 * wired up.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { puraShop, puraShopType, puraShopRadius, puraShopLayout } from '@/theme';
import { meSettings } from '@/copy/strings';

import { SettingsScaffold } from './SettingsScaffold';

const C = meSettings.about;
const APP_VERSION = '1.0.0';

export function AboutScreen() {
  return (
    <SettingsScaffold title={C.title}>
      <View style={styles.body}>
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.1}>
          Pura
        </Text>
        <Text style={styles.tagline} maxFontSizeMultiplier={1.25}>
          {C.tagline}
        </Text>

        <View style={styles.versionRow}>
          <Text style={styles.versionLabel} maxFontSizeMultiplier={1.2}>
            {C.versionLabel}
          </Text>
          <Text style={styles.versionValue} maxFontSizeMultiplier={1.2}>
            {APP_VERSION}
          </Text>
        </View>

        <Text style={styles.mission} maxFontSizeMultiplier={1.3}>
          {C.mission}
        </Text>
        <Text style={styles.madeWith} maxFontSizeMultiplier={1.25}>
          {C.madeWith}
        </Text>
      </View>
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  wordmark: {
    ...puraShopType.headerSerif,
    color: puraShop.ink,
  },
  tagline: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    marginTop: 4,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.cardSmall,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 24,
  },
  versionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
  },
  versionValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14.5,
    color: puraShop.inkSecondary,
    letterSpacing: -0.1,
  },
  mission: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    marginTop: 24,
  },
  madeWith: {
    ...puraShopType.benefitLine,
    color: puraShop.inkMuted,
    marginTop: 16,
  },
});
