/**
 * AppearanceScreen — honest about what Pura actually ships.
 *
 * Pura is a single light theme by design (app.json locks
 * userInterfaceStyle to light and the production tokens are
 * light-only). Rather than fake a dark toggle that wouldn't repaint
 * anything, this page states the theme plainly and offers the one
 * appearance control that IS wired to real behavior: Lighting Assist,
 * the on-screen glow during face scans.
 */

import React, { useCallback } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Sun } from 'phosphor-react-native';

import { puraShop, puraShopType, puraShopRadius, puraShopLayout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { meSettings } from '@/copy/strings';

import { SettingsScaffold } from './SettingsScaffold';

const C = meSettings.appearance;

export function AppearanceScreen() {
  const { lightingAssist, setLightingAssist } = useAppStore(
    useShallow((s) => ({
      lightingAssist: s.lightingAssistEnabled,
      setLightingAssist: s.setLightingAssistEnabled,
    })),
  );

  const onToggle = useCallback(
    (next: boolean) => {
      hapt.select();
      setLightingAssist(next);
    },
    [setLightingAssist],
  );

  return (
    <SettingsScaffold title={C.title}>
      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.staticRow}>
            <Text style={styles.rowLabel} maxFontSizeMultiplier={1.2}>
              {C.themeLabel}
            </Text>
            <Text style={styles.rowValue} maxFontSizeMultiplier={1.2}>
              {C.themeValue}
            </Text>
          </View>
        </View>
        <Text style={styles.note} maxFontSizeMultiplier={1.3}>
          {C.themeNote}
        </Text>

        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.15}>
          {C.lightingTitle}
        </Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Sun size={18} color={puraShop.coral} weight="duotone" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel} maxFontSizeMultiplier={1.2}>
                {C.lightingLabel}
              </Text>
              <Text style={styles.rowMeta} maxFontSizeMultiplier={1.3}>
                {C.lightingMeta}
              </Text>
            </View>
            <Switch
              value={lightingAssist}
              onValueChange={onToggle}
              trackColor={{ false: puraShop.inkFaint, true: puraShop.coral }}
              thumbColor={puraShop.white}
              ios_backgroundColor={puraShop.inkFaint}
            />
          </View>
        </View>
      </View>
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  card: {
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    overflow: 'hidden',
  },
  staticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 22,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
  },
  rowValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14.5,
    color: puraShop.inkSecondary,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: puraShop.inkMuted,
    marginTop: 3,
  },
  note: {
    ...puraShopType.benefitLine,
    color: puraShop.inkMuted,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: puraShop.inkMuted,
  },
});
