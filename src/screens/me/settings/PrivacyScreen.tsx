/**
 * PrivacyScreen — plain-English account of how Pura handles skin data,
 * plus the one destructive control: erase everything on this device.
 *
 * The erase action funnels through the store's `signOut` reset (which
 * clears persisted state back to blank), gated behind a native confirm
 * so it can't fire by accident.
 */

import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash } from 'phosphor-react-native';

import { puraShop, puraShopType, puraShopRadius, puraShopLayout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { meSettings } from '@/copy/strings';

import { SettingsScaffold } from './SettingsScaffold';

const C = meSettings.privacy;

export function PrivacyScreen() {
  const signOut = useAppStore((s) => s.signOut);

  const confirmErase = useCallback(() => {
    hapt.warning();
    Alert.alert(C.eraseConfirmTitle, C.eraseConfirmBody, [
      { text: C.cancel, style: 'cancel' },
      {
        text: C.eraseConfirmCta,
        style: 'destructive',
        onPress: () => {
          hapt.success();
          signOut();
        },
      },
    ]);
  }, [signOut]);

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        {C.points.map((p) => (
          <View key={p.title} style={styles.point}>
            <Text style={styles.pointTitle} maxFontSizeMultiplier={1.2}>
              {p.title}
            </Text>
            <Text style={styles.pointBody} maxFontSizeMultiplier={1.3}>
              {p.body}
            </Text>
          </View>
        ))}

        <Text style={styles.dataLabel} maxFontSizeMultiplier={1.15}>
          {C.dataTitle}
        </Text>
        <Pressable
          onPress={confirmErase}
          accessibilityRole="button"
          accessibilityLabel={C.eraseLabel}
          style={({ pressed }) => [styles.eraseRow, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.eraseIcon}>
            <Trash size={18} color={puraShop.ink} weight="duotone" />
          </View>
          <View style={styles.eraseText}>
            <Text style={styles.eraseLabel} maxFontSizeMultiplier={1.2}>
              {C.eraseLabel}
            </Text>
            <Text style={styles.eraseMeta} maxFontSizeMultiplier={1.3}>
              {C.eraseMeta}
            </Text>
          </View>
        </Pressable>
      </View>
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  point: {
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.cardSmall,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    padding: 18,
    marginBottom: 12,
  },
  pointTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
    marginBottom: 6,
  },
  pointBody: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
  },
  dataLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: puraShop.inkMuted,
  },
  eraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.cardSmall,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  eraseIcon: {
    width: 22,
    alignItems: 'center',
  },
  eraseText: {
    flex: 1,
  },
  eraseLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
  },
  eraseMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: puraShop.inkMuted,
    marginTop: 3,
  },
});
