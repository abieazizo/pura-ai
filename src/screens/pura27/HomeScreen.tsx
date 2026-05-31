/**
 * pura27 — Home screen.
 *
 * The nightly control center. Three states, driven by the shared
 * `PuraSession.stage` so Home, Products and Routine never tell
 * conflicting stories:
 *
 *   • pre_scan        — "Start tonight's scan"
 *   • scan_ready      — "View tonight's routine"
 *   • routine_active  — "Continue tonight's routine"
 *   • routine_complete— "You did enough tonight." → "View progress"
 *
 * Below the hero module, the 84-day progress card is always visible
 * and reflects the same `progress.currentDay` the Routine screen's
 * Progress tab reads. Completing the routine on Routine flips the
 * Home stage without re-incrementing progress.
 *
 * Trust contract: nothing here claims diagnostic certainty; copy speaks
 * in "appears", "active-looking", "visible irritation".
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { pura27, pura27Radius, pura27Shadow } from '@/theme';
import { hapt } from '@/utils/haptics';
import { usePuraSession } from '@/state/pura27/puraSession';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import {
  Body,
  BodyLarge,
  BreathGlow,
  Card,
  CountUp,
  DisplayHero,
  FunctionalTitle,
  PrimaryButton,
  ProgressMeter,
  PuraScreen,
  SectionLabel,
  StatusPill,
} from './components';
import type { PuraSession } from '@/state/pura27/types';

type RootNav = NavigationProp<RootStackParamList>;
type HomeNav = NativeStackNavigationProp<HomeStackParamList>;

// ===========================================================================
// HomeP27Screen
// ===========================================================================

export function HomeP27Screen() {
  const rootNav = useNavigation<RootNav>();
  const homeNav = useNavigation<HomeNav>();
  const { session, todayLabel } = usePuraSession();

  const userInitials = useAppStore((s) => s.user?.initials ?? null);
  const userName = useAppStore((s) => s.user?.name ?? s.name ?? null);
  const initials =
    userInitials ??
    (userName ? userName.trim()[0]?.toUpperCase() ?? null : null);

  const handleStartScan = useCallback(() => {
    hapt.tap();
    rootNav.navigate('ScanModal');
  }, [rootNav]);

  const handleViewRoutine = useCallback(() => {
    hapt.select();
    // From inside the Home stack, navigate to the Routine route which
    // exists on the same stack. This keeps the back-affordance natural.
    homeNav.navigate('Routine');
  }, [homeNav]);

  const handleViewProgress = useCallback(() => {
    hapt.select();
    // Routine route opens its Progress tab by default when reached via
    // tab navigation; from the Home stack we land on the same screen.
    homeNav.navigate('Routine');
  }, [homeNav]);

  const handleOpenProfile = useCallback(() => {
    hapt.select();
    // The profile circle is a second entry point into the Me tab — not a
    // modal. HomeStack sits inside the Tab navigator, so its parent IS the
    // tab navigator; switching to MeTab reads as a natural tab change.
    homeNav.getParent<NavigationProp<TabParamList>>()?.navigate('MeTab');
  }, [homeNav]);

  const handleSecondaryRecovery = useCallback(() => {
    hapt.select();
    homeNav.navigate('Routine');
  }, [homeNav]);

  return (
    <PuraScreen>
      <View style={styles.headerRow}>
        <View style={styles.dayMeta}>
          <SectionLabel>
            {`DAY ${session.progress.currentDay} OF ${session.progress.totalDays} · ${
              session.stage === 'scan_ready' || session.stage === 'routine_active'
                ? 'TONIGHT'
                : todayLabel.toUpperCase()
            }`}
          </SectionLabel>
        </View>
        {initials ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
            onPress={handleOpenProfile}
            style={({ pressed }) => [
              styles.avatar,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.1}
              style={styles.avatarText}
            >
              {initials}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {session.stage === 'pre_scan' ? (
        <PreScanState
          session={session}
          onStartScan={handleStartScan}
          onRecoveryNight={handleSecondaryRecovery}
        />
      ) : null}

      {session.stage === 'scan_ready' || session.stage === 'routine_active' ? (
        <ScanReadyState
          session={session}
          onViewRoutine={handleViewRoutine}
        />
      ) : null}

      {session.stage === 'routine_complete' ? (
        <CompletedState
          session={session}
          onViewProgress={handleViewProgress}
        />
      ) : null}

      <ProgressCard
        session={session}
        completedTonight={session.stage === 'routine_complete'}
      />

      {session.stage !== 'routine_complete' ? (
        <AdaptationCard session={session} />
      ) : null}
    </PuraScreen>
  );
}

// ===========================================================================
// State A — Pre-scan
// ===========================================================================

function PreScanState({
  session,
  onStartScan,
  onRecoveryNight,
}: {
  session: PuraSession;
  onStartScan: () => void;
  onRecoveryNight: () => void;
}) {
  return (
    <View style={stateStyles.wrap}>
      <DisplayHero style={stateStyles.heroHeading}>
        Your skin needed{'\n'}less last night.
      </DisplayHero>
      <BodyLarge style={stateStyles.heroBody}>
        Pausing your retinoid helped calm visible irritation around your{' '}
        {session.tonightScan.priorityRegion}.
      </BodyLarge>

      <HeroModule
        label="TONIGHT’S CHECK-IN"
        heading="See whether your chin is ready for treatment again."
        meta="30 seconds · Private · No judgment"
        ctaLabel="Start tonight’s scan"
        ctaAccessibility="Start tonight’s scan. Opens the nightly check-in camera."
        onCta={onStartScan}
        secondary={{
          label: 'Choose another recovery night',
          onPress: onRecoveryNight,
          accessibility: 'Choose a recovery night without scanning',
        }}
      />
    </View>
  );
}

// ===========================================================================
// State B — Scan complete, routine ready (or in progress)
// ===========================================================================

function ScanReadyState({
  session,
  onViewRoutine,
}: {
  session: PuraSession;
  onViewRoutine: () => void;
}) {
  const isActive = session.stage === 'routine_active';
  const completedCount = session.currentRoutine.steps.filter((s) => s.completed)
    .length;
  const totalSteps = session.currentRoutine.steps.length;
  const remaining = totalSteps - completedCount;

  const heading = isActive
    ? `Pick up where you left off, step ${Math.min(
        completedCount + 1,
        totalSteps,
      )} of ${totalSteps}.`
    : 'Focused care for one active area.';

  const meta = isActive
    ? `${remaining} step${remaining === 1 ? '' : 's'} remaining`
    : `${totalSteps} steps · About 4 minutes`;

  const ctaLabel = isActive
    ? 'Continue tonight’s routine'
    : 'View tonight’s routine';

  const skipped = session.currentRoutine.skipped[0];

  return (
    <View style={stateStyles.wrap}>
      <DisplayHero style={stateStyles.heroHeading}>
        Your routine{'\n'}is ready.
      </DisplayHero>
      <BodyLarge style={stateStyles.heroBody}>
        Treat your chin only tonight. Keep stronger actives paused.
      </BodyLarge>

      <HeroModule
        label="TONIGHT’S ROUTINE"
        heading={heading}
        meta={meta}
        ctaLabel={ctaLabel}
        ctaAccessibility={`${ctaLabel}. Opens the routine screen.`}
        onCta={onViewRoutine}
      />

      <View style={stateStyles.statusRow}>
        {session.tonightScan.reliability === 'reliable' ? (
          <StatusPill label="Reliable scan" variant="success" />
        ) : (
          <StatusPill label="Limited-confidence scan" variant="warning" />
        )}
        {skipped ? (
          <StatusPill
            label={`Paused tonight: ${skipped.productName}`}
            variant="warning"
          />
        ) : null}
      </View>
    </View>
  );
}

// ===========================================================================
// State C — Routine complete tonight
// ===========================================================================

function CompletedState({
  session,
  onViewProgress,
}: {
  session: PuraSession;
  onViewProgress: () => void;
}) {
  const completedSteps = session.currentRoutine.steps.filter(
    (s) => s.completed,
  );
  const fallbackSteps = session.currentRoutine.steps; // used only as label source if persistence is stale
  const recapSteps =
    completedSteps.length > 0 ? completedSteps : fallbackSteps;
  const skipped = session.currentRoutine.skipped[0];

  return (
    <View style={stateStyles.wrap}>
      <DisplayHero style={stateStyles.heroHeading}>
        You did enough{'\n'}tonight.
      </DisplayHero>
      <BodyLarge style={stateStyles.heroBody}>
        Focused treatment completed. Your progress is saved.
      </BodyLarge>

      <HeroModule
        label="TONIGHT COMPLETE"
        heading="Your skin can rest now."
        meta="Routine logged · Day tracked"
        ctaLabel="View progress"
        ctaAccessibility="View progress. Opens the Routine progress tab."
        onCta={onViewProgress}
      />

      <Card style={recapStyles.card}>
        <SectionLabel>TONIGHT AT A GLANCE</SectionLabel>
        <View style={recapStyles.list}>
          {recapSteps.map((step) => (
            <View key={step.id} style={recapStyles.row}>
              <View style={recapStyles.bullet} />
              <View style={recapStyles.copy}>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={recapStyles.title}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={recapStyles.subtitle}
                  numberOfLines={1}
                >
                  {step.productName}
                </Text>
              </View>
            </View>
          ))}
          {skipped ? (
            <View style={[recapStyles.row, recapStyles.skippedRow]}>
              <View
                style={[recapStyles.bullet, recapStyles.skippedBullet]}
              />
              <View style={recapStyles.copy}>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={recapStyles.title}
                  numberOfLines={1}
                >
                  Paused: {skipped.productName}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={recapStyles.subtitle}
                  numberOfLines={1}
                >
                  {skipped.reason}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

const recapStyles = StyleSheet.create({
  card: {
    marginTop: 22,
    padding: 22,
  },
  list: {
    marginTop: 12,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skippedRow: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: pura27.border,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: pura27.success,
  },
  skippedBullet: {
    backgroundColor: pura27.warning,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    color: pura27.ink,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: pura27.inkSecondary,
    marginTop: 2,
  },
});

const stateStyles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
  },
  heroHeading: {
    marginTop: 8,
  },
  heroBody: {
    marginTop: 20,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
});

// ===========================================================================
// HeroModule — warm rounded card carrying the literal nightly action.
// ===========================================================================

interface HeroModuleProps {
  label: string;
  heading: string;
  meta: string;
  ctaLabel: string;
  ctaAccessibility: string;
  onCta: () => void;
  secondary?: {
    label: string;
    onPress: () => void;
    accessibility: string;
  };
}

function HeroModule({
  label,
  heading,
  meta,
  ctaLabel,
  ctaAccessibility,
  onCta,
  secondary,
}: HeroModuleProps) {
  return (
    <View style={moduleStyles.frame}>
      {/* Soft warm wash anchored to the bottom-left, behind content. The
          BreathGlow lives on top-right as a quiet, full-rounded blush. */}
      <View pointerEvents="none" style={moduleStyles.washBL} />
      <BreathGlow
        size={220}
        style={moduleStyles.glow}
        peakOpacity={0.46}
        troughOpacity={0.30}
      />
      <View style={moduleStyles.content}>
        <View style={moduleStyles.labelRow}>
          <View style={moduleStyles.labelDot} />
          <SectionLabel tone="accent">{label}</SectionLabel>
        </View>
        <FunctionalTitle style={moduleStyles.heading}>
          {heading}
        </FunctionalTitle>
        <Text
          maxFontSizeMultiplier={1.2}
          style={moduleStyles.meta}
        >
          {meta}
        </Text>
        <Pressable
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaAccessibility}
          style={({ pressed }) => [
            moduleStyles.ctaBtn,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Text style={moduleStyles.ctaLabel} maxFontSizeMultiplier={1.15}>
            {ctaLabel}
          </Text>
          <View style={moduleStyles.ctaArrow}>
            <Text style={moduleStyles.ctaArrowText}>→</Text>
          </View>
        </Pressable>
        {secondary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondary.accessibility}
            hitSlop={8}
            onPress={secondary.onPress}
            style={({ pressed }) => [
              moduleStyles.secondary,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={moduleStyles.secondaryText}
            >
              {secondary.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const moduleStyles = StyleSheet.create({
  frame: {
    marginTop: 28,
    borderRadius: pura27Radius.hero,
    backgroundColor: pura27.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: pura27.border,
    overflow: 'hidden',
    minHeight: 282,
    ...pura27Shadow.elevated,
  },
  washBL: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: pura27.surfaceWarm,
    opacity: 0.95,
  },
  glow: {
    top: -70,
    right: -50,
  },
  content: {
    paddingHorizontal: 28,
    paddingVertical: 30,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: pura27.accent,
  },
  heading: {
    marginTop: 14,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  meta: {
    marginTop: 14,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: pura27.inkTertiary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  // Inline editorial CTA — not a full-width pill. Refines the hero
  // moment from generic action button to confident statement.
  ctaBtn: {
    marginTop: 28,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: pura27.buttonPrimary,
    paddingLeft: 22,
    paddingRight: 10,
    height: 52,
    borderRadius: 26,
    gap: 12,
    shadowColor: '#080A0F',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: pura27.white,
    letterSpacing: -0.1,
  },
  ctaArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: pura27.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: pura27.white,
    lineHeight: 18,
    marginTop: -1,
  },
  secondary: {
    marginTop: 18,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura27.accentText,
    letterSpacing: -0.1,
  },
});

// ===========================================================================
// 84-day progress card — always visible.
// ===========================================================================

function ProgressCard({
  session,
  completedTonight,
}: {
  session: PuraSession;
  completedTonight: boolean;
}) {
  const progress = session.progress;
  const trendVariant =
    progress.trend === 'improving'
      ? 'success'
      : progress.trend === 'watch'
      ? 'warning'
      : 'info';
  const completed = completedTonight
    ? progress.currentDay
    : progress.routinesComplete;
  const remaining = Math.max(0, progress.totalDays - progress.currentDay);
  return (
    <Card style={progressCardStyles.card}>
      <SectionLabel>84-DAY PROGRESS</SectionLabel>
      <View style={progressCardStyles.row}>
        <View style={progressCardStyles.titleRow}>
          <FunctionalTitle style={progressCardStyles.title}>
            Day{' '}
          </FunctionalTitle>
          <CountUp
            value={progress.currentDay}
            style={progressCardStyles.titleNumber}
          />
          <FunctionalTitle style={progressCardStyles.title}>
            {' '}of {progress.totalDays}
          </FunctionalTitle>
        </View>
        <StatusPill label={progress.trendLabel} variant={trendVariant} />
      </View>
      <ProgressMeter
        value={progress.currentDay}
        max={progress.totalDays}
        accessibilityLabel={`Day ${progress.currentDay} of ${progress.totalDays}`}
        style={progressCardStyles.meter}
      />
      <View style={progressCardStyles.footerRow}>
        <Body style={progressCardStyles.footerLabel}>
          {`${completed} scan${completed === 1 ? '' : 's'} complete`}
        </Body>
        <Body style={progressCardStyles.footerLabel}>
          {`${remaining} day${remaining === 1 ? '' : 's'} remaining`}
        </Body>
      </View>
    </Card>
  );
}

const progressCardStyles = StyleSheet.create({
  card: {
    marginTop: 22,
    padding: 22,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
  },
  titleNumber: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 24,
    color: pura27.ink,
    letterSpacing: -0.4,
  },
  meter: {
    marginTop: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 8,
    flexWrap: 'wrap',
  },
  footerLabel: {
    fontFamily: 'Inter-Medium',
    color: pura27.inkSecondary,
  },
});

// ===========================================================================
// Adaptation card — what changed last night.
// ===========================================================================

function AdaptationCard({
  session,
}: {
  session: PuraSession;
}) {
  // Informational card. Earlier versions included a "Choose another
  // recovery night" link that routed to the same destination as the
  // primary hero CTA — a brutal-client redundancy. Removed: the
  // adaptation is past-tense reading, not a navigation surface.
  const { lastAdaptationTitle, lastAdaptationBody } = session.progress;
  return (
    <Card style={adaptStyles.card}>
      <SectionLabel>LAST NIGHT’S CHANGE</SectionLabel>
      <FunctionalTitle style={adaptStyles.title}>
        {lastAdaptationTitle}
      </FunctionalTitle>
      <Body style={adaptStyles.body}>{lastAdaptationBody}</Body>
    </Card>
  );
}

const adaptStyles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 22,
  },
  title: {
    marginTop: 8,
  },
  body: {
    marginTop: 10,
  },
  link: {
    marginTop: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  linkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura27.accentText,
    letterSpacing: -0.1,
  },
});

// ===========================================================================
// Header styles
// ===========================================================================

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  dayMeta: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: pura27.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: pura27.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: pura27.inkSecondary,
    letterSpacing: 0.2,
  },
});
