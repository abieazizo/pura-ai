/**
 * Me — the personal tab.
 *
 * v30.1 editorial rebuild. Reads from the existing app store (no new
 * state). Promotes AI Assist to a real editorial hero, drops generic
 * zero-state tiles in favour of a quiet typographic action row, and
 * replaces the boxed bordered settings list with a hairline list that
 * matches the Welcome / Camera Tutorial typography family.
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
  User as UserIcon,
  Bell,
  Lock,
  Moon,
  Question,
  Info,
  CaretRight,
  SignOut,
  Heart,
  CalendarCheck,
} from 'phosphor-react-native';

import {
  puraShop,
  puraShopType,
  puraShopRadius,
  puraShopSpace,
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

  const routineCount = routineMorning + routineEvening;

  const openRoutine = useCallback(() => {
    hapt.select();
    tabNav.navigate('RoutineTab' as never);
  }, [tabNav]);

  const openProfileSheet = useCallback(() => {
    hapt.select();
  }, []);

  const openSaved = useCallback(() => {
    hapt.select();
    tabNav.navigate('RoutineTab' as never);
  }, [tabNav]);

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
          <Pressable
            onPress={openProfileSheet}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
            style={({ pressed }) => [
              styles.avatar,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.avatarText} maxFontSizeMultiplier={1.1}>
              {userInitials || (name ? name[0].toUpperCase() : 'Y')}
            </Text>
          </Pressable>
        </View>

        {/* Editorial greeting */}
        <View style={styles.summary}>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.15}>
            {name ? `Hi, ${name}.` : 'Hi.'}
          </Text>
          <Text style={styles.summarySub} maxFontSizeMultiplier={1.2}>
            {scansCount > 0
              ? `${scansCount} scan${scansCount === 1 ? '' : 's'} on record · ${routineCount} in routine`
              : 'Take your first scan to personalize the shop.'}
          </Text>
        </View>

        {/* v32 — AI Assist is no longer reached from Me. The Home tab IS
            the Pura Assist landing surface; its input dock opens the
            conversation. (The old editorial hero lived here.) */}

        {/* Quiet shortcuts — typographic, not chip-grid */}
        <View style={styles.shortcutBlock}>
          <ShortcutRow
            icon={<CalendarCheck size={18} color={puraShop.ink} weight="duotone" />}
            label="My Routine"
            meta={routineCount > 0 ? `${routineCount} active` : 'Not built yet'}
            onPress={openRoutine}
          />
          <ShortcutRow
            icon={<Heart size={18} color={puraShop.coralDeep} weight="duotone" />}
            label="Saved"
            meta={wishlistCount > 0 ? `${wishlistCount} saved` : 'Nothing saved yet'}
            onPress={openSaved}
            last
          />
        </View>

        {/* Account */}
        <Text style={styles.listLabel} maxFontSizeMultiplier={1.15}>
          Account
        </Text>
        <View style={styles.list}>
          <ListRow
            icon={<UserIcon size={17} color={puraShop.inkSecondary} weight="duotone" />}
            label={profileStrings.rows.skinProfile}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Bell size={17} color={puraShop.inkSecondary} weight="duotone" />}
            label={profileStrings.rows.notifications}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Lock size={17} color={puraShop.inkSecondary} weight="duotone" />}
            label={profileStrings.rows.privacy}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Moon size={17} color={puraShop.inkSecondary} weight="duotone" />}
            label={profileStrings.rows.appearance}
            onPress={openProfileSheet}
            last
          />
        </View>

        {/* Support */}
        <Text style={styles.listLabel} maxFontSizeMultiplier={1.15}>
          Support
        </Text>
        <View style={styles.list}>
          <ListRow
            icon={<Question size={17} color={puraShop.inkSecondary} weight="duotone" />}
            label={profileStrings.rows.help}
            onPress={openProfileSheet}
          />
          <ListRow
            icon={<Info size={17} color={puraShop.inkSecondary} weight="duotone" />}
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
          <SignOut size={15} color={puraShop.inkSecondary} weight="duotone" />
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

function ShortcutRow({
  icon,
  label,
  meta,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${meta}`}
      style={({ pressed }) => [
        shortcutStyles.row,
        !last && shortcutStyles.rowDivider,
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={shortcutStyles.icon}>{icon}</View>
      <View style={shortcutStyles.col}>
        <Text style={shortcutStyles.label} maxFontSizeMultiplier={1.15}>
          {label}
        </Text>
        <Text style={shortcutStyles.meta} maxFontSizeMultiplier={1.2}>
          {meta}
        </Text>
      </View>
      <CaretRight size={14} color={puraShop.inkSecondary} weight="bold" />
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
      <CaretRight size={13} color={puraShop.inkSecondary} weight="bold" />
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
    backgroundColor: puraShop.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraShop.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: puraShop.inkSecondary,
    letterSpacing: 0.2,
  },
  summary: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 24,
  },
  greeting: {
    ...puraShopType.sectionSerif,
    color: puraShop.ink,
  },
  summarySub: {
    ...puraShopType.sectionSub,
    color: puraShop.sectionSub,
    marginTop: 6,
  },
  shortcutBlock: {
    marginTop: 22,
    marginHorizontal: puraShopLayout.horizontalPadding,
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
  },
  listLabel: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginTop: 28,
    marginBottom: 10,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: puraShop.inkMuted,
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
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  signOutText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    color: puraShop.inkSecondary,
    letterSpacing: -0.1,
  },
});

const shortcutStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.cardBorder,
  },
  icon: {
    width: 22,
    alignItems: 'center',
  },
  col: { flex: 1 },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
  },
  meta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: puraShop.inkMuted,
    marginTop: 2,
  },
});

const listStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
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
    fontSize: 14.5,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
});

// Suppress unused imports if any
void puraShopSpace;
void SafeAreaView;
