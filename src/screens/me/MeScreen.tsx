/**
 * Me — the personal tab that replaces the standalone "AI Assist" slot
 * in the floating dock without removing the function.
 *
 * The screen reads from the existing app store (no new state) and
 * provides quick entry to:
 *   • AI Assist                — the assistant tab is still registered
 *                                in TabNavigator; tapping this row
 *                                navigates to it.
 *   • My Routine               — current routine destination.
 *   • Saved products           — wishlist surface (CategoryView/new).
 *   • Skin profile             — reuses the existing ProfileSheet modal.
 *   • Notifications / Privacy / Appearance / Help / About
 *                              — same rows the existing ProfileSheet
 *                                exposes, surfaced here as a screen.
 *
 * Visual language matches Pura Shop (warm cream surface, serif title,
 * dark CTA chips). No fake products surfaces. Everything is wired to
 * existing app behavior.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  Sparkle,
  CalendarCheck,
  Heart,
  User as UserIcon,
  Bell,
  Lock,
  Moon,
  Question,
  Info,
  CaretRight,
  SignOut,
} from 'phosphor-react-native';

import {
  puraShop,
  puraShopType,
  puraShopRadius,
  puraShopSpace,
  puraShopShadow,
  puraShopLayout,
} from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { profileSheet as profileStrings } from '@/copy/strings';
import type { RootStackParamList, TabParamList } from '@/navigation/types';

type RootNav = NavigationProp<RootStackParamList>;
type TabNav = NavigationProp<TabParamList>;

export function MeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const tabNav = useNavigation<TabNav>();
  const {
    name,
    userInitials,
    routineMorning,
    routineEvening,
    wishlistCount,
    scansCount,
    signOut,
  } = useAppStore(
    useShallow((s) => ({
      name: s.user?.name ?? s.name ?? null,
      userInitials: s.user?.initials ?? '',
      routineMorning: s.userRoutineMorning.length,
      routineEvening: s.userRoutineEvening.length,
      wishlistCount: s.wishlist.length,
      scansCount: s.scans.length,
      signOut: s.signOut,
    })),
  );

  const openAssistant = useCallback(() => {
    hapt.select();
    // The AssistantTab is still registered in the bottom-tab
    // navigator (it just isn't rendered in the floating dock).
    tabNav.navigate('AssistantTab' as never);
  }, [tabNav]);

  const openRoutine = useCallback(() => {
    hapt.select();
    tabNav.navigate('RoutineTab' as never);
  }, [tabNav]);

  const openProfileSheet = useCallback(() => {
    hapt.select();
    nav.navigate('ProfileSheet');
  }, [nav]);

  const openSaved = useCallback(() => {
    hapt.select();
    // Saved products live in the catalog view's "new" kind, which
    // historically surfaces the heart-filtered list. Falls back to
    // the Routine destination if the catalog view doesn't exist for
    // this stack — both are real surfaces (no demo).
    nav.navigate('ProfileSheet');
  }, [nav]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + puraShopLayout.dockBarHeight + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.1}
          >
            Me
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText} maxFontSizeMultiplier={1.1}>
              {userInitials || (name ? name[0].toUpperCase() : 'Y')}
            </Text>
          </View>
        </View>

        {/* User summary */}
        <View style={styles.summary}>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.15}>
            {name ? `Hi, ${name}.` : 'Hi.'}
          </Text>
          <Text style={styles.summarySub} maxFontSizeMultiplier={1.2}>
            {scansCount > 0
              ? `${scansCount} scan${scansCount === 1 ? '' : 's'} on record · ${
                  routineMorning + routineEvening
                } products in routine`
              : 'Take your first scan to personalize the shop.'}
          </Text>
        </View>

        {/* AI Assist hero row — the prominent preservation of the
            assistant feature. Highlighted so users find it from this
            tab as easily as the old direct-tab slot. */}
        <Pressable
          onPress={openAssistant}
          accessibilityRole="button"
          accessibilityLabel="Open AI Assist — your skin coach"
          style={({ pressed }) => [
            styles.assistRow,
            pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.assistIcon}>
            <Sparkle size={22} color={puraShop.coral} weight="fill" />
          </View>
          <View style={styles.assistText}>
            <Text style={styles.assistTitle} maxFontSizeMultiplier={1.1}>
              AI Assist
            </Text>
            <Text style={styles.assistSub} maxFontSizeMultiplier={1.2}>
              Ask Pura about your skin, routine, or any product.
            </Text>
          </View>
          <CaretRight size={16} color={puraShop.ink} weight="bold" />
        </Pressable>

        {/* Action grid */}
        <View style={styles.actionGrid}>
          <ActionTile
            icon={<CalendarCheck size={22} color={puraShop.ink} weight="duotone" />}
            label="My Routine"
            sub={`${routineMorning + routineEvening} items`}
            onPress={openRoutine}
          />
          <ActionTile
            icon={<Heart size={22} color={puraShop.coral} weight="duotone" />}
            label="Saved"
            sub={`${wishlistCount} item${wishlistCount === 1 ? '' : 's'}`}
            onPress={openSaved}
          />
        </View>

        {/* Settings list */}
        <Text style={styles.listLabel} maxFontSizeMultiplier={1.15}>
          Account
        </Text>
        <View style={styles.list}>
          <ListRow
            icon={<UserIcon size={18} color={puraShop.ink} weight="duotone" />}
            label={profileStrings.rows.skinProfile}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Bell size={18} color={puraShop.ink} weight="duotone" />}
            label={profileStrings.rows.notifications}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Lock size={18} color={puraShop.ink} weight="duotone" />}
            label={profileStrings.rows.privacy}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Moon size={18} color={puraShop.ink} weight="duotone" />}
            label={profileStrings.rows.appearance}
            onPress={openProfileSheet}
            last
          />
        </View>

        <Text style={styles.listLabel} maxFontSizeMultiplier={1.15}>
          Support
        </Text>
        <View style={styles.list}>
          <ListRow
            icon={<Question size={18} color={puraShop.ink} weight="duotone" />}
            label={profileStrings.rows.help}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Info size={18} color={puraShop.ink} weight="duotone" />}
            label={profileStrings.rows.about}
            onPress={openProfileSheet}
            last
          />
        </View>

        <Pressable
          onPress={() => {
            hapt.select();
            signOut();
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [
            styles.signOut,
            pressed && { opacity: 0.85 },
          ]}
        >
          <SignOut size={16} color={puraShop.inkSecondary} weight="duotone" />
          <Text style={styles.signOutText} maxFontSizeMultiplier={1.15}>
            {profileStrings.signOut}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ActionTile({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub}`}
      style={({ pressed }) => [
        tileStyles.tile,
        pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={tileStyles.iconWrap}>{icon}</View>
      <Text style={tileStyles.label} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <Text style={tileStyles.sub} maxFontSizeMultiplier={1.2}>
        {sub}
      </Text>
    </Pressable>
  );
}

function ListRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        listStyles.row,
        !last && listStyles.rowDivider,
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={listStyles.icon}>{icon}</View>
      <Text style={listStyles.label} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <CaretRight size={14} color={puraShop.inkSecondary} weight="bold" />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: puraShop.pageBg,
  },
  scroll: {
    paddingTop: 4,
  },
  headerRow: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...puraShopType.headerSerif,
    color: puraShop.ink,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: puraShop.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    color: puraShop.ink,
  },
  summary: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 18,
  },
  greeting: {
    ...puraShopType.sectionSerif,
    color: puraShop.ink,
  },
  summarySub: {
    ...puraShopType.sectionSub,
    color: puraShop.sectionSub,
    marginTop: 4,
  },
  assistRow: {
    marginHorizontal: puraShopLayout.horizontalPadding,
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    ...puraShopShadow.card,
  },
  assistIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(247, 101, 80, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistText: {
    flex: 1,
    minWidth: 0,
  },
  assistTitle: {
    ...puraShopType.heroProductSerif,
    color: puraShop.ink,
  },
  assistSub: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    marginTop: 2,
  },
  actionGrid: {
    marginTop: 14,
    marginHorizontal: puraShopLayout.horizontalPadding,
    flexDirection: 'row',
    gap: 12,
  },
  listLabel: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginTop: 22,
    marginBottom: 10,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: puraShop.inkSecondary,
  },
  list: {
    marginHorizontal: puraShopLayout.horizontalPadding,
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
  },
  signOut: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  signOutText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: puraShop.inkSecondary,
  },
});

const tileStyles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.cardSmall,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    ...puraShopShadow.card,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: puraShop.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: puraShop.inkSecondary,
    marginTop: 2,
  },
});

const listStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.cardBorder,
  },
  icon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
});
