/**
 * Me — the personal tab. Cycle 6 rebuild: "your skin, over time."
 *
 * The audit's lowest-scoring surface (4.2) was a settings page with ZERO
 * progress on it — while a fully-built progress story sat one tab over on the
 * Routine → Progress sub-tab. This rebuild composes that story onto Me as the
 * HERO and demotes settings below it, so Me finally answers "how is *my* skin
 * doing?" the moment you open it.
 *
 * Singular hierarchy: the animated SkinScore hero is the one dominant element.
 * A count-up stat ribbon and the before/after proof support it; the shortcuts
 * and settings lists recede underneath. Progress data is read from the single
 * canonical `useProgressRoutineInsight()` (same source the Progress sub-tab
 * uses) — no recomputed/scattered state. Adopts the Cycle-2 `ds` design system
 * + `ui` primitives so Me shares one language with the rest of the app.
 *
 * Navigation, store shape, and the reused progress components are untouched.
 */

import React, { useCallback, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  User as UserIcon,
  Bell,
  Lock,
  Moon,
  Question,
  Info,
  SignOut,
  Heart,
  CalendarCheck,
  Camera,
} from 'phosphor-react-native';

import {
  ds,
  dsType,
  dsSpace,
  dsTiming,
  stagger,
  tnum,
  puraShopLayout,
} from '@/theme';
import { Card, ListRow, Button, SectionHeader } from '@/components/ui';
import { AnimatedNumber } from '@/components';
import { useProgressRoutineInsight } from '@/state/progressRoutineInsight';
import { ProgressHeroSection } from '@/components/progress/ProgressHeroSection';
import { BeforeAfterSection } from '@/components/progress/BeforeAfterSection';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { profileSheet as profileStrings } from '@/copy/strings';
import type {
  MeStackParamList,
  TabParamList,
  RootStackParamList,
} from '@/navigation/types';

const H = dsSpace.lg; // 20 — page gutter; matches the reused progress components' self-inset.

type MeNav = NavigationProp<MeStackParamList>;
type TabNav = NavigationProp<TabParamList>;
type RootNav = NavigationProp<RootStackParamList>;

export function MeScreen() {
  const insets = useSafeAreaInsets();
  const meNav = useNavigation<MeNav>();
  const tabNav = useNavigation<TabNav>();
  const rootNav = useNavigation<RootNav>();

  const insight = useProgressRoutineInsight();

  const {
    name,
    userInitials,
    scans,
    routineMorning,
    routineEvening,
    wishlistCount,
    signOut,
  } = useAppStore(
    useShallow((s) => ({
      name: s.user?.name ?? s.name ?? null,
      userInitials: s.user?.initials ?? '',
      scans: s.scans,
      routineMorning: s.userRoutineMorning.length,
      routineEvening: s.userRoutineEvening.length,
      wishlistCount: s.wishlist.length,
      signOut: s.signOut,
    })),
  );

  const scansCount = scans.length;
  const routineCount = routineMorning + routineEvening;
  const hasScanned = insight.hasScanned;
  const latestScan = scansCount ? scans[scansCount - 1] : undefined;

  const openScan = useCallback(() => {
    hapt.tap();
    rootNav.navigate('ScanModal');
  }, [rootNav]);
  const openRoutine = useCallback(() => {
    hapt.select();
    tabNav.navigate('RoutineTab' as never);
  }, [tabNav]);
  const openSaved = useCallback(() => {
    hapt.select();
    tabNav.navigate('RoutineTab' as never);
  }, [tabNav]);
  const goTo = useCallback(
    (route: keyof MeStackParamList) => {
      hapt.select();
      meNav.navigate(route as never);
    },
    [meNav],
  );
  const openProfile = useCallback(() => goTo('SkinProfileSettings'), [goTo]);
  const doSignOut = useCallback(() => {
    hapt.select();
    signOut();
  }, [signOut]);

  const greeting = name ? `Hi, ${name}.` : 'Your skin.';
  const subline = hasScanned
    ? insight.freshnessLabel?.trim() || 'Tracked, scan by scan.'
    : 'Your skin story is about to begin.';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + puraShopLayout.dockBarHeight + dsSpace.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header + editorial greeting ── */}
        <Rise index={0}>
          <View style={styles.topBar}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.1}>
              YOUR SKIN, OVER TIME
            </Text>
            <Pressable
              onPress={openProfile}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              hitSlop={8}
              style={({ pressed }) => [styles.avatar, pressed && styles.pressedSoft]}
            >
              <Text style={styles.avatarText} maxFontSizeMultiplier={1.1}>
                {userInitials || (name ? name[0].toUpperCase() : 'Y')}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.15} accessibilityRole="header">
            {greeting}
          </Text>
          <Text style={styles.greetingSub} maxFontSizeMultiplier={1.2}>
            {subline}
          </Text>
        </Rise>

        {hasScanned ? (
          <>
            {/* ── HERO: the canonical animated SkinScore (dominant) ── */}
            <Rise index={1} style={styles.heroWrap}>
              <ProgressHeroSection scans={scans} insight={insight} />
            </Rise>

            {/* ── Count-up stat ribbon ── */}
            <Rise index={2} style={styles.block}>
              <Card tint="surface" level="e1" style={styles.statCard}>
                <StatCol value={scansCount} label="Scans" />
                <View style={styles.statDivider} />
                <StatCol value={routineCount} label="In routine" />
                <View style={styles.statDivider} />
                <StatCol value={wishlistCount} label="Saved" />
              </Card>
            </Rise>

            {/* ── Before & after — the emotional proof ── */}
            <Rise index={3}>
              <SectionHeader
                eyebrow="PROOF"
                title="Before & after"
                serif
                style={styles.sectionHeader}
              />
              <BeforeAfterSection
                comparison={insight.comparison}
                latestDayNumber={latestScan?.dayNumber ?? 0}
                onTakeScan={openScan}
              />
            </Rise>
          </>
        ) : (
          /* ── Empty state with personality ── */
          <Rise index={1} style={styles.block}>
            <Card tint="surface" level="e2" padding={dsSpace.xl} style={styles.emptyCard}>
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.15}>
                Your skin story starts here.
              </Text>
              <Text style={styles.emptyBody} maxFontSizeMultiplier={1.2}>
                One 30-second scan unlocks your score, your trend, and your first
                before-and-after.
              </Text>
              <Button
                label="Take your first scan"
                variant="accent"
                fullWidth
                onPress={openScan}
                icon={<Camera size={18} color="#FFFFFF" weight="duotone" />}
                accessibilityHint="Opens the camera to scan your skin"
                style={styles.emptyCta}
              />
            </Card>
          </Rise>
        )}

        {/* ── Quiet shortcuts (demoted below the story) ── */}
        <Rise index={hasScanned ? 4 : 2} style={styles.block}>
          <Card tint="surface" level="e1" padding={H}>
            <ListRow
              icon={<CalendarCheck size={18} color={ds.textSecondary} weight="duotone" />}
              label="My Routine"
              value={routineCount > 0 ? `${routineCount} active` : 'Not built'}
              onPress={openRoutine}
            />
            <ListRow
              icon={<Heart size={18} color={ds.textSecondary} weight="duotone" />}
              label="Saved"
              value={wishlistCount > 0 ? `${wishlistCount} saved` : 'None yet'}
              onPress={openSaved}
              showDivider={false}
            />
          </Card>
        </Rise>

        {/* ── Account ── */}
        <Rise index={hasScanned ? 5 : 3} style={styles.block}>
          <Text style={styles.listLabel} maxFontSizeMultiplier={1.15}>
            ACCOUNT
          </Text>
          <Card tint="surface" level="e1" padding={H}>
            <ListRow
              icon={<UserIcon size={18} color={ds.textSecondary} weight="duotone" />}
              label={profileStrings.rows.skinProfile}
              onPress={() => goTo('SkinProfileSettings')}
            />
            <ListRow
              icon={<Bell size={18} color={ds.textSecondary} weight="duotone" />}
              label={profileStrings.rows.notifications}
              onPress={() => goTo('NotificationSettings')}
            />
            <ListRow
              icon={<Lock size={18} color={ds.textSecondary} weight="duotone" />}
              label={profileStrings.rows.privacy}
              onPress={() => goTo('PrivacySettings')}
            />
            <ListRow
              icon={<Moon size={18} color={ds.textSecondary} weight="duotone" />}
              label={profileStrings.rows.appearance}
              onPress={() => goTo('AppearanceSettings')}
              showDivider={false}
            />
          </Card>
        </Rise>

        {/* ── Support ── */}
        <Rise index={hasScanned ? 6 : 4} style={styles.block}>
          <Text style={styles.listLabel} maxFontSizeMultiplier={1.15}>
            SUPPORT
          </Text>
          <Card tint="surface" level="e1" padding={H}>
            <ListRow
              icon={<Question size={18} color={ds.textSecondary} weight="duotone" />}
              label={profileStrings.rows.help}
              onPress={() => goTo('HelpSupport')}
            />
            <ListRow
              icon={<Info size={18} color={ds.textSecondary} weight="duotone" />}
              label={profileStrings.rows.about}
              onPress={() => goTo('About')}
              showDivider={false}
            />
          </Card>
        </Rise>

        <Pressable
          onPress={doSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressedSoft]}
        >
          <SignOut size={15} color={ds.textTertiary} weight="duotone" />
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

/** Staggered fade-up entrance; reduce-motion renders in place instantly. */
function Rise({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = withDelay(stagger(index), withTiming(1, dsTiming.base));
  }, [reduce, index, p]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 14 }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function StatCol({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCol}>
      <AnimatedNumber value={value} style={styles.statValue} />
      <Text style={styles.statLabel} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ds.page,
  },
  scroll: {
    paddingTop: dsSpace.sm,
  },
  pressedSoft: { opacity: 0.85 },

  // Header
  topBar: {
    paddingHorizontal: H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  eyebrow: {
    ...dsType.label,
    color: ds.textTertiary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ds.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ds.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: ds.textSecondary,
    letterSpacing: 0.2,
  },
  greeting: {
    ...dsType.title,
    color: ds.textPrimary,
    paddingHorizontal: H,
    marginTop: dsSpace.base,
  },
  greetingSub: {
    ...dsType.body,
    color: ds.textSecondary,
    paddingHorizontal: H,
    marginTop: dsSpace.xs,
  },

  // Hero
  heroWrap: {
    marginTop: dsSpace.xl,
  },

  // Generic spaced block
  block: {
    marginTop: dsSpace.xl,
  },

  // Stat ribbon
  statCard: {
    marginHorizontal: H,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: ds.textPrimary,
    ...tnum,
  },
  statLabel: {
    ...dsType.labelSm,
    color: ds.textTertiary,
    marginTop: dsSpace.xs,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: ds.border,
  },

  // Section header (aligns to component self-inset)
  sectionHeader: {
    paddingHorizontal: H,
    marginBottom: dsSpace.md,
  },

  // Empty state
  emptyCard: {
    marginHorizontal: H,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    ...dsType.title,
    color: ds.textPrimary,
  },
  emptyBody: {
    ...dsType.body,
    color: ds.textSecondary,
    marginTop: dsSpace.sm,
    marginBottom: dsSpace.lg,
  },
  emptyCta: {
    alignSelf: 'stretch',
  },

  // Settings labels
  listLabel: {
    ...dsType.label,
    color: ds.textTertiary,
    paddingHorizontal: H,
    marginBottom: dsSpace.sm,
  },

  // Sign out
  signOut: {
    marginTop: dsSpace.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpace.sm,
    paddingVertical: dsSpace.md,
    minHeight: 44,
  },
  signOutText: {
    ...dsType.bodySmMed,
    color: ds.textTertiary,
  },
});
