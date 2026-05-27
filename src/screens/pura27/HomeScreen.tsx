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
} from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import {
  Body,
  BodyLarge,
  Card,
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
    const root = (homeNav as any).getParent?.()?.getParent?.();
    (root ?? homeNav).navigate?.('ProfileSheet' as never);
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
        <AdaptationCard
          session={session}
          onSecondary={handleSecondaryRecovery}
        />
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
  session: _session,
  onViewProgress,
}: {
  session: PuraSession;
  onViewProgress: () => void;
}) {
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
    </View>
  );
}

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
      <View
        accessibilityLabel="Warm blush glow"
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={moduleStyles.glow}
      />
      <View style={moduleStyles.content}>
        <SectionLabel tone="accent">{label}</SectionLabel>
        <FunctionalTitle style={moduleStyles.heading}>
          {heading}
        </FunctionalTitle>
        <Text
          maxFontSizeMultiplier={1.2}
          style={moduleStyles.meta}
        >
          {meta}
        </Text>
        <PrimaryButton
          label={ctaLabel}
          onPress={onCta}
          accessibilityLabel={ctaAccessibility}
          style={moduleStyles.cta}
        />
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
    backgroundColor: pura27.surfaceWarm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: pura27.border,
    overflow: 'hidden',
    minHeight: 282,
    ...pura27Shadow.elevated,
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: pura27.blush,
    opacity: 0.6,
  },
  content: {
    paddingHorizontal: 26,
    paddingVertical: 28,
  },
  heading: {
    marginTop: 14,
    fontSize: 24,
    lineHeight: 30,
  },
  meta: {
    marginTop: 12,
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: pura27.inkTertiary,
    letterSpacing: 0.5,
  },
  cta: {
    marginTop: 24,
  },
  secondary: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 10,
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
        <FunctionalTitle style={progressCardStyles.title}>
          Day {progress.currentDay} of {progress.totalDays}
        </FunctionalTitle>
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
  title: {
    fontSize: 20,
    lineHeight: 24,
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
  onSecondary,
}: {
  session: PuraSession;
  onSecondary: () => void;
}) {
  const { lastAdaptationTitle, lastAdaptationBody } = session.progress;
  return (
    <Card style={adaptStyles.card}>
      <SectionLabel>LAST NIGHT’S CHANGE</SectionLabel>
      <FunctionalTitle style={adaptStyles.title}>
        {lastAdaptationTitle}
      </FunctionalTitle>
      <Body style={adaptStyles.body}>{lastAdaptationBody}</Body>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose another recovery night"
        hitSlop={8}
        onPress={onSecondary}
        style={({ pressed }) => [
          adaptStyles.link,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text
          maxFontSizeMultiplier={1.2}
          style={adaptStyles.linkText}
        >
          Choose another recovery night
        </Text>
      </Pressable>
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
