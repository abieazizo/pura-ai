/**
 * SettingsScaffold — shared chrome for the Me-tab settings destinations.
 *
 * A back button (returns to Me), an editorial masthead (title + optional
 * lead line), and a scroll body that clears the floating dock. Every
 * settings page mounts this so the back affordance, typography, and
 * spacing match the Me screen and the rest of the puraShop family.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CaretLeft } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';

import { puraShop, puraShopLayout, puraShopType } from '@/theme';
import { hapt } from '@/utils/haptics';

export function SettingsScaffold({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  const goBack = () => {
    hapt.select();
    nav.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <CaretLeft size={18} color={puraShop.ink} weight="bold" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: puraShopLayout.dockBarHeight + insets.bottom + 40,
        }}
      >
        <View style={styles.masthead}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.15}>
            {title}
          </Text>
          {intro ? (
            <Text style={styles.intro} maxFontSizeMultiplier={1.2}>
              {intro}
            </Text>
          ) : null}
        </View>

        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShop.pageBg,
  },
  topBar: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: puraShop.surfaceWarm,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  masthead: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 8,
    paddingBottom: 22,
  },
  title: {
    ...puraShopType.headerSerif,
    color: puraShop.ink,
  },
  intro: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    marginTop: 8,
  },
});
