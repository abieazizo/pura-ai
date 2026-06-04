/**
 * Pura Shop — the home is a PERSONALIZED SKINCARE CONSULTANT FEED.
 *
 * Not a catalog with personalization bolted on top: a feed that waits for the
 * user's skin, then recommends against it. The screen itself is deliberately
 * thin — it reads ONE canonical model (`useShopHomeModel`, which composes the
 * canonical `SkinState` + the deterministic matcher + the static catalog) and
 * hands it to `ShopFeed`, wiring every action out to the store and the
 * navigator. All copy, scoring, price-framing, freshness, and state branching
 * live in the model; all layout and motion live in `ShopFeed` and its parts.
 *
 * Out of scope on purpose (and untouched): the product detail page, the full
 * catalog (`CategoryView`), and the browse-by-concern index. This feed routes
 * OUT to them — it never reimplements them.
 *
 *   • tap a card        → ProductDetail
 *   • save (heart)      → toggleWishlist
 *   • add               → addUserRoutineProduct('evening')  (the card shows its
 *                          own in-routine confirmation, derived from the store)
 *   • scan / re-scan    → ScanModal (root)
 *   • browse all        → CategoryView
 *   • browse by concern → ConcernIndex
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { puraShopHome, puraShopLayout } from '@/theme';
import type { HomeStackParamList, RootStackParamList } from '@/navigation/types';

import { useShopHomeModel } from './shopStackModel';
import { ShopFeed } from './components/ShopFeed';

type Nav = NavigationProp<HomeStackParamList>;
type RootNav = NavigationProp<RootStackParamList>;

export function PuraShopScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  // The same navigation object, typed for the root routes it bubbles up to
  // (ScanModal lives at the root — `navigate` propagates past this stack).
  const rootNav = useNavigation<RootNav>();

  const model = useShopHomeModel();

  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const addToRoutine = useAppStore((s) => s.addUserRoutineProduct);

  const onPressProduct = useCallback(
    (id: string) => {
      hapt.select();
      nav.navigate('ProductDetail', { productId: id });
    },
    [nav],
  );

  const onToggleSave = useCallback(
    (id: string) => {
      hapt.select();
      toggleWishlist(id);
    },
    [toggleWishlist],
  );

  const onAdd = useCallback(
    (id: string) => {
      hapt.tap();
      addToRoutine('evening', id);
    },
    [addToRoutine],
  );

  const onScan = useCallback(() => {
    hapt.select();
    rootNav.navigate('ScanModal');
  }, [rootNav]);

  const onBrowseAll = useCallback(() => {
    hapt.select();
    nav.navigate('CategoryView', { kind: 'best-overall' });
  }, [nav]);

  const onBrowseConcern = useCallback(() => {
    hapt.select();
    nav.navigate('ConcernIndex');
  }, [nav]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ShopFeed
        model={model}
        onPressProduct={onPressProduct}
        onToggleSave={onToggleSave}
        onAdd={onAdd}
        onScan={onScan}
        onBrowseAll={onBrowseAll}
        onBrowseConcern={onBrowseConcern}
        topInset={insets.top}
        bottomInset={insets.bottom + puraShopLayout.dockBarHeight + 28}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShopHome.canvas,
  },
});
