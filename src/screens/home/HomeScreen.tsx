import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useContextual } from '@/components/contextual/ContextualProvider';
import { HomeHeader } from '@/components/home/HomeHeader';
import { DateStrip, type DateStripDay } from '@/components/home/DateStrip';
import { SkinScoreHero } from '@/components/home/SkinScoreHero';
import { ZoneRow } from '@/components/home/ZoneRow';
import { RoutineNextCard } from '@/components/home/RoutineNextCard';
import { RoutineTonightRow } from '@/components/home/RoutineTonightRow';
import { CompareStrip } from '@/components/home/CompareStrip';
import { HomePullquote } from '@/components/home/HomePullquote';
import {
  selectNextMorningStep,
  useAppStore,
} from '@/store/useAppStore';
import { seedProducts } from '@/data/seed';
import { colors } from '@/theme';
import { useDayNumber } from '@/store/useAppStore';

/**
 * Home, rebuilt per the final spec. One screen, fixed composition. Every
 * visual-heavy component is its own file under `components/home/`. This file
 * owns data wiring + scroll + safe-area + tab-bar clearance only.
 */
export function HomeScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const scans = useAppStore((s) => s.scans);
  const dayNumber = useDayNumber();
  const nextStep = useAppStore(selectNextMorningStep);
  // Primitive-length selectors: the array `.filter()` is scratch — the
  // returned value is a stable number, so useSyncExternalStore is happy.
  const morningLen = useAppStore(
    (s) => s.routine.filter((r) => r.slot === 'morning').length
  );
  const eveningLen = useAppStore(
    (s) => s.routine.filter((r) => r.slot === 'evening').length
  );
  const markStepDone = useAppStore((s) => s.markStepDone);
  const hasAnsweredRoutineFitback = useAppStore(
    (s) => s.hasAnsweredRoutineFitback
  );
  const { requestFitbackSheet } = useContextual();

  // Ã‚Â§3.4 Ã¢â‚¬â€ Trigger 3 day-7 routine check. Fires once when the user has
  // been scanning for exactly 7 calendar days. The provider gates on
  // `hasAnsweredRoutineFitback` internally; we also check here to avoid
  // even requesting when the flag is already true (less queue noise).
  useEffect(() => {
    if (hasAnsweredRoutineFitback) return;
    const first = scans[0];
    if (!first) return;
    const firstDate = new Date(first.capturedAt);
    firstDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSince = Math.floor(
      (today.getTime() - firstDate.getTime()) / 86400000
    );
    if (daysSince === 7) {
      requestFitbackSheet();
    }
  }, [hasAnsweredRoutineFitback, scans, requestFitbackSheet]);

  const latest = scans[scans.length - 1];
  const first = scans[0];
  const score = latest?.overallScore ?? 0;

  const deltaFromDay1 =
    latest && first && latest.id !== first.id
      ? latest.overallScore - first.overallScore
      : 0;

  // Spec Ã‚Â§5 seeds the readout for Day 2; otherwise take the scan's summary.
  // If neither exists (pre-scan) fall back to the seed.
  const readout = latest?.summaryBody ?? "Chin's speaking up again. Barrier's holding.";

  const days: DateStripDay[] = useMemo(() => buildDays(scans), [scans]);
  const todayIso = days[days.length - 1]?.date.toISOString() ?? new Date().toISOString();
  const [selectedIso, setSelectedIso] = useState(todayIso);

  // Today has a scan if any scan was captured on the current calendar day.
  const todayHasScan = days[days.length - 1]?.scanned ?? false;

  const nextStepProduct = nextStep
    ? seedProducts.find((p) => p.id === nextStep.productId)
    : undefined;

  // Clear the tab bar (60) + FAB overlap (~34) + safe bottom + breathing room.
  const bottomClearance = insets.bottom + 140;

  const onTonightPress = () => {
    // Ã‚Â§8: tonight routine detail doesn't exist yet. Stub Ã¢â‚¬â€ no-op.
  };

  const onComparePress = () => {
    // Jump to the Progress tab where the full compare lives. Safe on both
    // the typed `(tabs)` nav and bare stack wrappers Ã¢â‚¬â€ if `getParent()` is
    // null, we no-op.
    const parent = nav.getParent?.();
    parent?.navigate?.('ProgressTab');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      <HomeHeader score={score} />

      <DateStrip days={days} selectedIso={selectedIso} onSelect={setSelectedIso} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SkinScoreHero
          score={score}
          dayNumber={dayNumber}
          deltaFromDay1={deltaFromDay1}
          readout={readout}
        />

        <ZoneRow scans={scans} />

        {nextStep && nextStepProduct && morningLen > 0 ? (
          <RoutineNextCard
            stepIndex={nextStep.order}
            totalSteps={morningLen}
            brand={nextStepProduct.brand}
            productName={nextStepProduct.name}
            instruction={nextStep.instruction}
            scheduledTime="7:22"
            completed={!!nextStep.completedAt}
            onMarkDone={() => markStepDone(nextStep.id)}
          />
        ) : null}

        {eveningLen > 0 ? (
          <RoutineTonightRow
            startsAt="9:30 PM"
            stepCount={eveningLen}
            onPress={onTonightPress}
          />
        ) : null}

        {todayHasScan && first && latest ? (
          <CompareStrip
            day1Uri={first.photoUri}
            todayUri={latest.photoUri}
            onPress={onComparePress}
          />
        ) : null}

        <HomePullquote />
      </ScrollView>
    </SafeAreaView>
  );
}

// Build the 7-day strip ending today. Days inherit `scanned=true` when any
// scan in history was captured on their calendar day.
function buildDays(scans: { capturedAt: string }[]): DateStripDay[] {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() - (6 - i));
    const scanned = scans.some((s) => sameCalendarDay(new Date(s.capturedAt), d));
    return {
      date: d,
      scanned,
      isToday: i === 6,
    };
  });
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 0,
  },
});
