/**
 * Me — the personal tab. Cycle 11 BOLD structural elevation: "your skin, transformed."
 *
 * The prior cycles led with a small editorial masthead (eyebrow + "Hi, name." +
 * italic subline) and only THEN showed the score inside a mid-page card — so the
 * first second of the screen was all small text and the "how is my skin doing?"
 * answer never landed as a HERO. Users reported "barely any change."
 *
 * Cycle 11 makes the SkinScore the unmistakable hero at dramatic scale. The page
 * now opens with a full-bleed Score Colossus: a deep-ink "skin theatre" panel,
 * floated on a blue aura, carrying a ~116pt count-up score numeral, the band, a
 * confident delta pill, and a giant "since day one" transformation ribbon. One
 * look says: here is my skin, transformed. Everything else — the canonical arc
 * dial, the stat ribbon, the trend, before/after, timeline, and settings —
 * recedes beneath it as supporting detail.
 *
 * Data integrity is unchanged: every number is read from the single canonical
 * `useProgressRoutineInsight()` (the same source the Progress sub-tab uses) and
 * `computeSkinScore(scans)` — no recomputed/scattered state, no fake data. When
 * there is no scan, the colossus becomes an equally bold "Begin here" invitation
 * rather than inventing a score. Navigation, store shape, and the reused
 * (locked) progress components are untouched.
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
import { Image } from 'expo-image';
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
  TrendUp,
  Sparkle,
} from 'phosphor-react-native';

import {
  ds,
  blue,
  success,
  dsType,
  dsSpace,
  dsRadius,
  dsTiming,
  dsElevation,
  dsAmbient,
  dsGradient,
  stagger,
  tnum,
  puraShopLayout,
} from '@/theme';
import { Card, ListRow, Button } from '@/components/ui';
import { AnimatedNumber } from '@/components';
import { useProgressRoutineInsight } from '@/state/progressRoutineInsight';
import { computeSkinScore } from '@/utils/skinScore';
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

  // Canonical score read — same source as the Progress sub-tab. No recompute.
  const score = computeSkinScore(scans);
  const scoreValue = insight.score ?? score.value;
  const liftSinceFirst = insight.trendSummary.deltaSinceFirst; // integer vs day-1 baseline
  const hasLift = insight.trendSummary.hasChart; // ≥2 scans → a real transformation exists

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

  const firstName = name ? name.split(' ')[0] : null;
  const overline = firstName ? `${firstName}’s skin` : 'Your skin';
  const dayLine = insight.dayLabel?.trim() || 'YOUR SKIN, OVER TIME';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {/* ── Ambient porcelain wash — a calm day-sky mesh replaces the flat
          porcelain field so the page has real atmospheric depth behind the
          hero. Subtly cool, never garish; the locked DNA. ── */}
      <LinearGradient
        pointerEvents="none"
        colors={dsAmbient.day.sky}
        locations={[0, 0.46, 1]}
        style={styles.ambient}
      />
      {/* Faint top-light bloom so the colossus sits in a pool of light. */}
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
        {/* ── Compact masthead — the greeting is now an OVERLINE that yields the
            stage to the hero below, not the dominant first line. ── */}
        <Rise index={0}>
          <View style={styles.topBar}>
            <View style={styles.topBarText}>
              <Text style={styles.eyebrow} maxFontSizeMultiplier={1.1}>
                {dayLine}
              </Text>
              <Text style={styles.overline} maxFontSizeMultiplier={1.12} accessibilityRole="header">
                {overline}
              </Text>
            </View>
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
        </Rise>

        {hasScanned ? (
          <>
            {/* ════════════════════════════════════════════════════════════
                THE FACE HERO — Cycle 12 imagery signature. The user's most
                recent scanned face, framed as a premium editorial portrait
                (~4:5, generous radius, a soft bottom scrim, a brand hairline)
                so it is the FIRST and most visible thing on the page. The
                scrim carries the day + score in light so any overlay stays
                AA+ legible. When the latest scan has no photo we render an
                honest portrait placeholder — never a raw or broken image. ══ */}
            <Rise index={1} style={styles.block}>
              <FaceHero
                photoUri={latestScan?.photoUri}
                dayLabel={dayLine}
                score={scoreValue}
                band={insight.scoreBand}
                onTakeScan={openScan}
              />
            </Rise>

            {/* ════════════════════════════════════════════════════════════
                THE SCORE COLOSSUS — Cycle 11's bold structural hero.
                A deep-ink "skin theatre" panel floated on a blue aura. The
                score numeral is the single dominant element on the page at a
                colossal scale; the band + delta + transformation ribbon make
                it feel alive and earned. All values are canonical. ════════ */}
            <Rise index={2} style={styles.colossusWrap}>
              {/* Blue aura bleeding out behind the dark panel — the hero glows. */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(20,124,255,0.22)', 'rgba(20,124,255,0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.colossusAura}
              />
              <View style={styles.colossus}>
                {/* Deep cool-ink fill — the score reads in light on a dark stage. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={['#0E1A30', '#070C16']}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* A single Pura-Blue glow blooming from the upper-right so the
                    dark panel has depth and a brand pulse, never flat black. */}
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(61,144,255,0.45)', 'rgba(61,144,255,0)']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0.2, y: 0.9 }}
                  style={styles.colossusBloom}
                />

                <Text style={styles.colossusKicker} maxFontSizeMultiplier={1.1}>
                  YOUR SKIN SCORE
                </Text>

                {/* The hero numeral — colossal, tabular, count-up. */}
                <View style={styles.scoreRow}>
                  <AnimatedNumber value={scoreValue} style={styles.scoreColossal} />
                  <Text style={styles.scoreOutOf} maxFontSizeMultiplier={1.05}>
                    /100
                  </Text>
                </View>

                {/* Band + delta — band is the confident word, delta the proof. */}
                <View style={styles.bandRow}>
                  <Text style={styles.bandWord} maxFontSizeMultiplier={1.1}>
                    {insight.scoreBand}
                  </Text>
                  {insight.deltaLabel ? (
                    <View
                      style={[
                        styles.deltaPill,
                        liftSinceFirst > 0 && styles.deltaPillUp,
                        liftSinceFirst < 0 && styles.deltaPillDown,
                      ]}
                    >
                      {liftSinceFirst > 0 ? (
                        <TrendUp size={13} color={success[300]} weight="bold" />
                      ) : null}
                      <Text style={styles.deltaPillText} maxFontSizeMultiplier={1.1}>
                        {insight.deltaLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* The why-line, one calm sentence grounded in the latest scan. */}
                <Text style={styles.colossusWhy} maxFontSizeMultiplier={1.18}>
                  {insight.heroReason}
                </Text>

                {/* ── The transformation ribbon — the emotional payoff. When a
                    real before→after lift exists, the "since day one" number is
                    shown BIG and confident. Otherwise we celebrate the baseline
                    being set, never faking movement. ── */}
                <View style={styles.transformRow}>
                  {hasLift ? (
                    <>
                      <View style={styles.transformLift}>
                        <Text style={styles.transformBig} maxFontSizeMultiplier={1.05}>
                          {liftSinceFirst >= 0 ? '+' : ''}
                          {liftSinceFirst}
                        </Text>
                        <Text style={styles.transformUnit} maxFontSizeMultiplier={1.1}>
                          pts
                        </Text>
                      </View>
                      <View style={styles.transformMetaCol}>
                        <Text style={styles.transformLabel} maxFontSizeMultiplier={1.1}>
                          SINCE DAY ONE
                        </Text>
                        <Text style={styles.transformSub} maxFontSizeMultiplier={1.15}>
                          {insight.trendSummary.summaryLine}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.transformMetaCol}>
                      <Text style={styles.transformLabel} maxFontSizeMultiplier={1.1}>
                        BASELINE SET
                      </Text>
                      <Text style={styles.transformSub} maxFontSizeMultiplier={1.15}>
                        {insight.trendSummary.summaryLine}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Rise>

            {/* ── Count-up stat ribbon — the supporting facts under the hero.
                A whisper of blue wash gives color-based depth and lets the ONE
                blue data accent (Scans, the number that drives the "over time"
                story) re-earn the eye. ── */}
            <Rise index={3} style={styles.block}>
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

            {/* ── The canonical arc dial — now a SUPPORTING detail beneath the
                colossus, headed so it reads as "the full picture", not a
                competing hero. ── */}
            <Rise index={4} style={styles.block}>
              <Text style={styles.sectionHead} maxFontSizeMultiplier={1.15}>
                YOUR DIAL
              </Text>
              <ProgressHeroSection scans={scans} insight={insight} />
            </Rise>

            {/* ── What's driving the score (self-suppresses when no metrics) ── */}
            <Rise index={5} style={styles.block}>
              <ScoreBreakdownCard metrics={insight.metrics} />
            </Rise>

            {/* ── The trend — Me's whole reason for being: "over time" ── */}
            <Rise index={6} style={styles.block}>
              <ScoreTrendSection trend={insight.trendSummary} />
            </Rise>

            {/* ── Before & after — the emotional proof (self-heads + self-locks) ── */}
            <Rise index={7} style={styles.block}>
              <BeforeAfterSection
                comparison={insight.comparison}
                latestDayNumber={latestScan?.dayNumber ?? 0}
                onTakeScan={openScan}
              />
            </Rise>

            {/* ── Your scan history over time (self-suppresses when empty) ── */}
            <Rise index={8} style={styles.block}>
              <ScanTimelineSection timeline={insight.timeline} />
            </Rise>
          </>
        ) : (
          /* ════════════════════════════════════════════════════════════════
              THE INVITATION COLOSSUS — equally bold empty state. Same dark
              theatre + aura as the score hero so the first scan feels like
              stepping onto a stage. No faked score; a giant promise instead. */
          <Rise index={1} style={styles.colossusWrap}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(20,124,255,0.22)', 'rgba(20,124,255,0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.colossusAura}
            />
            <View style={[styles.colossus, styles.colossusEmpty]}>
              <LinearGradient
                pointerEvents="none"
                colors={['#0E1A30', '#070C16']}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(61,144,255,0.45)', 'rgba(61,144,255,0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.2, y: 0.9 }}
                style={styles.colossusBloom}
              />
              <View style={styles.emptyBadge}>
                <Sparkle size={20} color={blue[200]} weight="fill" />
              </View>
              <Text style={styles.emptyKicker} maxFontSizeMultiplier={1.1}>
                YOUR SKIN, ABOUT TO BEGIN
              </Text>
              <Text style={styles.emptyColossalTitle} maxFontSizeMultiplier={1.1}>
                One scan.{'\n'}Your whole story.
              </Text>
              <Text style={styles.emptyColossalBody} maxFontSizeMultiplier={1.2}>
                A 30-second scan unlocks your Skin Score, your trend over time, and
                your first before-and-after.
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
            </View>
          </Rise>
        )}

        {/* ── Quiet shortcuts (demoted below the story) ── */}
        <Rise index={hasScanned ? 9 : 2} style={styles.block}>
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
        <Rise index={hasScanned ? 10 : 3} style={styles.block}>
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
        <Rise index={hasScanned ? 11 : 4} style={styles.block}>
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

/**
 * FaceHero — the Cycle 12 imagery signature for Me. The latest scanned face,
 * framed as a premium editorial portrait: a ~4:5 frame with generous radius,
 * a brand hairline, a soft bottom scrim so the overlaid day + score stay AA+
 * legible, and a top-corner LATEST chip. Honest placeholder when no photo —
 * a calm porcelain frame inviting the first photo-capture scan, never a raw
 * or broken image.
 */
function FaceHero({
  photoUri,
  dayLabel,
  score,
  band,
  onTakeScan,
}: {
  photoUri?: string;
  dayLabel: string;
  score: number;
  band: string;
  onTakeScan: () => void;
}) {
  const hasPhoto = !!photoUri?.trim();

  if (!hasPhoto) {
    // Honest portrait placeholder — same frame language as the real hero so the
    // empty state reads as a reward waiting, not a broken image. A faint blue
    // wash + camera badge invites a photo-capture scan.
    return (
      <Pressable
        onPress={onTakeScan}
        accessibilityRole="button"
        accessibilityLabel="Take a photo scan to unlock your portrait"
        style={({ pressed }) => [styles.faceWrap, pressed && styles.pressedSoft]}
      >
        <View style={[styles.facePortrait, styles.facePlaceholder]}>
          <LinearGradient
            pointerEvents="none"
            colors={dsGradient.blueWash}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.facePlaceholderBadge}>
            <Camera size={26} color={ds.accentDeep} weight="duotone" />
          </View>
          <Text style={styles.facePlaceholderTitle} maxFontSizeMultiplier={1.1}>
            Your portrait, in focus
          </Text>
          <Text style={styles.facePlaceholderBody} maxFontSizeMultiplier={1.15}>
            Add a photo scan to see your face here as a living before-and-after.
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.faceWrap}>
      <View style={styles.facePortrait}>
        <Image
          source={photoUri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={220}
          accessibilityLabel="Your latest skin scan portrait"
        />
        {/* Soft bottom scrim so the day + score read in light, AA+ legible. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,10,15,0)', 'rgba(8,10,15,0.20)', 'rgba(8,10,15,0.78)']}
          locations={[0, 0.55, 1]}
          style={styles.faceScrim}
        />
        {/* Top-corner LATEST chip — a glassy pill that frames the portrait. */}
        <View style={styles.faceTopChip}>
          <Sparkle size={11} color={ds.onInk} weight="fill" />
          <Text style={styles.faceTopChipText} maxFontSizeMultiplier={1.1}>
            LATEST SCAN
          </Text>
        </View>
        {/* Overlaid caption — day on the left, the canonical score on the right. */}
        <View style={styles.faceCaption}>
          <View style={styles.faceCaptionText}>
            <Text style={styles.faceDay} maxFontSizeMultiplier={1.1}>
              {dayLabel}
            </Text>
            <Text style={styles.faceBand} maxFontSizeMultiplier={1.1}>
              {band}
            </Text>
          </View>
          <View style={styles.faceScorePill}>
            <Text style={styles.faceScoreNum} maxFontSizeMultiplier={1.05}>
              {score}
            </Text>
            <Text style={styles.faceScoreUnit} maxFontSizeMultiplier={1.05}>
              /100
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
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

  // Header — compact, yields the stage to the colossus.
  topBar: {
    paddingHorizontal: H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  topBarText: {
    flex: 1,
    paddingRight: dsSpace.md,
  },
  eyebrow: {
    // Masthead kicker — tracked uppercase caps, a touch wider than the base
    // label token for editorial breathing room at the top of the page.
    ...dsType.label,
    letterSpacing: 1.7,
    color: ds.textTertiary,
  },
  overline: {
    // The greeting, demoted to a calm editorial overline so the score colossus
    // below is unambiguously the hero. Serif keeps the editorial voice.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: ds.textPrimary,
    marginTop: dsSpace.xs,
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

  // ══ THE SCORE COLOSSUS ══════════════════════════════════════════════════
  colossusWrap: {
    marginTop: dsSpace.lg,
    marginHorizontal: H,
  },
  // Soft blue aura bleeding out beneath the dark panel — the hero glows on the
  // porcelain page. Sits behind the panel via absolute fill + negative insets.
  colossusAura: {
    position: 'absolute',
    left: -dsSpace.md,
    right: -dsSpace.md,
    top: dsSpace.lg,
    bottom: -dsSpace.lg,
    borderRadius: dsRadius.xxl,
  },
  colossus: {
    borderRadius: dsRadius.xxl,
    paddingTop: dsSpace.xl,
    paddingBottom: dsSpace.xl,
    paddingHorizontal: dsSpace.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,170,255,0.22)',
    ...dsElevation.e4,
  },
  colossusEmpty: {
    alignItems: 'flex-start',
  },
  // Pura-Blue bloom in the upper-right of the dark stage — depth + brand pulse.
  colossusBloom: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  colossusKicker: {
    ...dsType.label,
    letterSpacing: 2.2,
    color: blue[200],
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: dsSpace.xs,
  },
  scoreColossal: {
    // THE hero numeral — colossal editorial serif, far larger than anything
    // else on the page. Tabular so it stays rock-steady as it counts up.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 116,
    lineHeight: 116,
    letterSpacing: -5,
    color: ds.onInk,
    ...tnum,
  },
  scoreOutOf: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 30,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: dsSpace.xs,
    marginBottom: dsSpace.base,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: dsSpace.sm,
    marginTop: dsSpace.xs,
  },
  bandWord: {
    // The confident one-word verdict, big and light on the dark stage.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: blue[200],
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.xs,
    paddingVertical: 5,
    paddingHorizontal: dsSpace.sm + 2,
    borderRadius: dsRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  deltaPillUp: {
    backgroundColor: 'rgba(32,166,122,0.16)',
    borderColor: 'rgba(127,211,181,0.32)',
  },
  deltaPillDown: {
    backgroundColor: 'rgba(226,77,77,0.14)',
    borderColor: 'rgba(240,145,143,0.30)',
  },
  deltaPillText: {
    ...dsType.labelSm,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'none',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 15,
  },
  colossusWhy: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: 'rgba(255,255,255,0.78)',
    marginTop: dsSpace.base,
  },
  // ── Transformation ribbon — the "since day one" payoff, set big. ──
  transformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.base,
    marginTop: dsSpace.xl,
    paddingTop: dsSpace.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  transformLift: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  transformBig: {
    // The dramatic before→after number — second only to the score itself.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
    color: success[300],
    ...tnum,
  },
  transformUnit: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 4,
  },
  transformMetaCol: {
    flex: 1,
  },
  transformLabel: {
    ...dsType.labelSm,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.55)',
  },
  transformSub: {
    ...dsType.bodySm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: dsSpace.xs,
  },

  // Generic spaced block
  block: {
    marginTop: dsSpace.xl,
  },

  // ══ THE FACE HERO — editorial portrait of the latest scan ════════════════
  faceWrap: {
    marginHorizontal: H,
  },
  facePortrait: {
    // ~4:5 editorial portrait. Generous radius + brand hairline + a real lift
    // so the scanned face reads as a framed photograph on porcelain, never raw.
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: dsRadius.xl,
    overflow: 'hidden',
    backgroundColor: ds.pageDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ds.hairline,
    ...dsElevation.e3,
  },
  faceScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
  },
  faceTopChip: {
    position: 'absolute',
    top: dsSpace.md,
    left: dsSpace.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpace.xs,
    paddingVertical: 5,
    paddingHorizontal: dsSpace.sm + 2,
    borderRadius: dsRadius.pill,
    backgroundColor: 'rgba(8,10,15,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  faceTopChipText: {
    ...dsType.labelSm,
    letterSpacing: 1.4,
    color: ds.onInk,
  },
  faceCaption: {
    position: 'absolute',
    left: dsSpace.lg,
    right: dsSpace.lg,
    bottom: dsSpace.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: dsSpace.md,
  },
  faceCaptionText: {
    flex: 1,
  },
  faceDay: {
    ...dsType.label,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.78)',
  },
  faceBand: {
    // The confident verdict, set in editorial serif on the portrait.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: ds.onInk,
    marginTop: dsSpace.xs,
  },
  faceScorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: dsSpace.xs + 1,
    paddingHorizontal: dsSpace.md,
    borderRadius: dsRadius.lg,
    backgroundColor: 'rgba(8,10,15,0.46)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  faceScoreNum: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -1,
    color: ds.onInk,
    ...tnum,
  },
  faceScoreUnit: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 2,
  },
  // Honest placeholder — calm porcelain frame inviting a photo-capture scan.
  facePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dsSpace.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ds.borderStrong,
  },
  facePlaceholderBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ds.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ds.borderStrong,
    marginBottom: dsSpace.base,
    ...dsElevation.e1,
  },
  facePlaceholderTitle: {
    ...dsType.title,
    fontSize: 26,
    lineHeight: 30,
    color: ds.textPrimary,
    textAlign: 'center',
  },
  facePlaceholderBody: {
    ...dsType.bodySm,
    color: ds.textSecondary,
    textAlign: 'center',
    marginTop: dsSpace.sm,
    maxWidth: 280,
  },

  // Section heads under the hero — the supporting sections announce themselves.
  sectionHead: {
    ...dsType.label,
    letterSpacing: 1.7,
    color: ds.textTertiary,
    paddingHorizontal: H,
    marginBottom: dsSpace.md,
  },

  // Stat ribbon — the Card is a clear shell that clips a blue-wash fill.
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
    // as they count up. Default columns sit in ink so the single blue accent
    // earns the eye.
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

  // ── Invitation colossus (empty state) ──
  emptyBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,170,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,170,255,0.28)',
    marginBottom: dsSpace.base,
  },
  emptyKicker: {
    ...dsType.label,
    letterSpacing: 2.2,
    color: blue[200],
  },
  emptyColossalTitle: {
    // Same colossal editorial register as the score hero so the empty state
    // carries equal weight — a giant promise, not a smaller fallback.
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.6,
    color: ds.onInk,
    marginTop: dsSpace.sm,
  },
  emptyColossalBody: {
    ...dsType.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: dsSpace.base,
    marginBottom: dsSpace.xl,
  },
  emptyCta: {
    alignSelf: 'stretch',
  },

  // Header / settings labels
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
