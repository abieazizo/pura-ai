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
import { LinearGradient } from 'expo-linear-gradient';
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
  blue,
  dsType,
  dsSpace,
  dsRadius,
  dsTiming,
  dsAmbient,
  dsGradient,
  stagger,
  tnum,
  puraShopLayout,
} from '@/theme';
import { Card, ListRow, Button } from '@/components/ui';
import { AnimatedNumber } from '@/components';
import { useProgressRoutineInsight } from '@/state/progressRoutineInsight';
import { ProgressHeroSection } from '@/components/progress/ProgressHeroSection';
import { BeforeAfterSection } from '@/components/progress/BeforeAfterSection';
import { ScoreBreakdownCard } from '@/components/progress/ScoreBreakdownCard';
import { ScoreTrendSection } from '@/components/progress/ScoreTrendSection';
import { ScanTimelineSection } from '@/components/progress/ScanTimelineSection';
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
      {/* ── Ambient porcelain wash — a calm day-sky mesh replaces the flat
          porcelain field so the page has real atmospheric depth behind the
          editorial masthead. Subtly cool, never garish; the locked DNA. ── */}
      <LinearGradient
        pointerEvents="none"
        colors={dsAmbient.day.sky}
        locations={[0, 0.46, 1]}
        style={styles.ambient}
      />
      {/* Faint top-light bloom so the greeting hero sits in a pool of light. */}
      <LinearGradient
        pointerEvents="none"
        colors={[ds.accentSoft, 'rgba(234,244,255,0)']}
        style={styles.ambientGlow}
      />
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
              {/* Faint porcelain→ice fill so the identity chip reads as a
                  dimensional disc, not a flat outline. Neutral, not branded. */}
              <LinearGradient
                pointerEvents="none"
                colors={[ds.surface, ds.pageDeep]}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={styles.avatarFill}
              />
              <Text style={styles.avatarText} maxFontSizeMultiplier={1.1}>
                {userInitials || (name ? name[0].toUpperCase() : 'Y')}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.greeting} maxFontSizeMultiplier={1.12} accessibilityRole="header">
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

            {/* ── Count-up stat ribbon — the surface that echoes the hero's
                intelligence. A whisper of blue wash gives it color-based depth
                and lets the ONE blue data accent (Scans, the number that drives
                the whole "over time" story) re-earn the eye. ── */}
            <Rise index={2} style={styles.block}>
              <Card tint="clear" level="e1" padding={0} style={styles.statCard}>
                <LinearGradient
                  colors={dsGradient.blueWash}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statWash}
                >
                  <StatCol value={scansCount} label="Scans" accent />
                  <View style={styles.statDivider} />
                  <StatCol value={routineCount} label="In routine" />
                  <View style={styles.statDivider} />
                  <StatCol value={wishlistCount} label="Saved" />
                </LinearGradient>
              </Card>
            </Rise>

            {/* ── What's driving the score (self-suppresses when no metrics) ── */}
            <Rise index={3} style={styles.block}>
              <ScoreBreakdownCard metrics={insight.metrics} />
            </Rise>

            {/* ── The trend — Me's whole reason for being: "over time" ── */}
            <Rise index={4} style={styles.block}>
              <ScoreTrendSection trend={insight.trendSummary} />
            </Rise>

            {/* ── Before & after — the emotional proof (self-heads + self-locks) ── */}
            <Rise index={5} style={styles.block}>
              <BeforeAfterSection
                comparison={insight.comparison}
                latestDayNumber={latestScan?.dayNumber ?? 0}
                onTakeScan={openScan}
              />
            </Rise>

            {/* ── Your scan history over time (self-suppresses when empty) ── */}
            <Rise index={6} style={styles.block}>
              <ScanTimelineSection timeline={insight.timeline} />
            </Rise>
          </>
        ) : (
          /* ── Empty state with personality — a soft blue dawn wash gives the
              invitation real warmth and depth, harmonized with its accent CTA. ── */
          <Rise index={1} style={styles.block}>
            <Card tint="clear" level="e2" padding={0} style={styles.emptyCard}>
              <LinearGradient
                colors={[ds.surface, ds.accentSoft]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.emptyWash}
              >
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
              </LinearGradient>
            </Card>
          </Rise>
        )}

        {/* ── Quiet shortcuts (demoted below the story) ── */}
        <Rise index={hasScanned ? 7 : 2} style={styles.block}>
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
        <Rise index={hasScanned ? 8 : 3} style={styles.block}>
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
        <Rise index={hasScanned ? 9 : 4} style={styles.block}>
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

function StatCol({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statCol}>
      <AnimatedNumber
        value={value}
        style={[styles.statValue, accent && styles.statValueAccent]}
      />
      <Text
        style={[styles.statLabel, accent && styles.statLabelAccent]}
        maxFontSizeMultiplier={1.1}
      >
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
  // Page atmosphere — full-bleed day-sky porcelain mesh + a faint top bloom.
  ambient: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 280,
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
    // Masthead kicker — tracked uppercase caps, a touch wider than the base
    // label token for editorial breathing room at the top of the page.
    ...dsType.label,
    letterSpacing: 1.7,
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
    overflow: 'hidden',
  },
  avatarFill: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: ds.textSecondary,
    letterSpacing: 0.2,
  },
  greeting: {
    // Editorial hero — right-sized from the timid 32pt title to a confident
    // display serif with tighter optical tracking. The one dominant line on Me.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 41,
    lineHeight: 43,
    letterSpacing: -1.3,
    color: ds.textPrimary,
    paddingHorizontal: H,
    marginTop: dsSpace.base,
  },
  greetingSub: {
    // Italic serif lead-in — sets an editorial voice under the hero instead of
    // a flat UI body line. Slightly larger with calm line-height.
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: ds.textSecondary,
    paddingHorizontal: H,
    marginTop: dsSpace.sm,
  },

  // Hero
  heroWrap: {
    marginTop: dsSpace.xl,
  },

  // Generic spaced block
  block: {
    marginTop: dsSpace.xl,
  },

  // Stat ribbon — the Card is now a clear shell that clips a blue-wash fill.
  statCard: {
    marginHorizontal: H,
    borderRadius: dsRadius.xl,
    overflow: 'hidden',
  },
  statWash: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: dsSpace.lg,
    paddingHorizontal: dsSpace.md,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    // Editorial data numerals — tabular so the three columns stay rock-steady
    // as they count up, sized up a notch with tighter tracking for confidence.
    // Default columns sit in ink so the single blue accent earns the eye.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: ds.textPrimary,
    ...tnum,
  },
  statValueAccent: {
    // The ONE blue data accent on the surface — Scans, the number the whole
    // "over time" story is built on. Deep enough to hold AA on the wash.
    color: ds.accentDeep,
  },
  statLabel: {
    ...dsType.labelSm,
    letterSpacing: 1.4,
    color: ds.textTertiary,
    marginTop: dsSpace.sm,
  },
  statLabelAccent: {
    // Caption under the accent stat lifts to the brand text tone so the label
    // and its numeral read as one harmonized unit.
    color: ds.accentText,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 38,
    // Blue-tinted hairline so the dividers belong to the wash, not the page.
    backgroundColor: blue[200],
  },

  // Empty state
  emptyCard: {
    marginHorizontal: H,
  },
  emptyWash: {
    padding: dsSpace.xl,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    // Same confident display serif as the greeting hero so the empty state
    // carries equal editorial weight, not a smaller fallback title.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -1.0,
    color: ds.textPrimary,
  },
  emptyBody: {
    ...dsType.body,
    color: ds.textSecondary,
    marginTop: dsSpace.md,
    marginBottom: dsSpace.lg,
  },
  emptyCta: {
    alignSelf: 'stretch',
  },

  // Settings labels
  listLabel: {
    // Section caps — tracked to match the masthead eyebrow so every uppercase
    // label on the page shares one editorial rhythm.
    ...dsType.label,
    letterSpacing: 1.7,
    color: ds.textTertiary,
    paddingHorizontal: H,
    marginBottom: dsSpace.md,
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
