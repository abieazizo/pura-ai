/**
 * Routine Companion — the vertically-scrolling real-time companion that
 * replaces the old cards-in-a-list landing. Five zones share one
 * surface: header + AM/PM toggle, the streak-aware greeting, the hero
 * focus card (centerpiece), the upcoming atmosphere preview, and the
 * completed tail — with a vertical progress line down the left edge and
 * a cinematic entrance reveal on focus.
 *
 * This screen is presentational: the routine, the day's completion ids,
 * and every mutation are owned by the host (PuraRoutineScreen → routine
 * store). It reads one derivation — `buildCompanionModel` — so no zone
 * recomputes "which step is current" inline.
 *
 * Built in steps; zones are layered in as the signatures land.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Sparkle } from 'phosphor-react-native';
import type {
  CustomRoutine,
  RoutineStep,
  RoutineTimeOfDay,
} from '@/types/routine';
import { CC, companionGeo, companionType } from './companionTokens';
import { buildCompanionModel } from './companionModel';
import { HeroFocusCard } from './HeroFocusCard';

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatToday(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export interface RoutineCompanionScreenProps {
  routine: CustomRoutine;
  timeOfDay: RoutineTimeOfDay;
  onChangeTimeOfDay: (next: RoutineTimeOfDay) => void;
  /** Step ids completed today for the active time of day. */
  doneIds: string[];
  onToggleComplete: (stepId: string) => void;
  /** Tap the hero product image → product detail sheet (wired later). */
  onOpenDetail: (step: RoutineStep) => void;
  /** Header "Customize" → customize sheet (wired later). */
  onCustomize: () => void;
  onHowItWorks: () => void;
}

export function RoutineCompanionScreen({
  routine,
  timeOfDay,
  onChangeTimeOfDay,
  doneIds,
  onToggleComplete,
  onOpenDetail,
  onCustomize,
  onHowItWorks,
}: RoutineCompanionScreenProps) {
  const model = React.useMemo(
    () => buildCompanionModel({ routine, timeOfDay, doneIds }),
    [routine, timeOfDay, doneIds],
  );

  const hero = model.heroRow;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Zone 1 — header (toggle added in a later step). */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={companionType.pageTitle}>Routine</Text>
              <Sparkle
                size={18}
                weight="fill"
                color={CC.blue}
                style={styles.sparkle}
              />
            </View>
            <Text style={companionType.date}>{formatToday()}</Text>
          </View>

          {/* Zone 3 — hero focus card. */}
          <View style={styles.heroWrap}>
            {hero ? (
              <HeroFocusCard
                step={hero.step}
                stepIndex={hero.index}
                totalSteps={model.total}
                onMarkDone={() => onToggleComplete(hero.step.id)}
                onOpenDetail={() => onOpenDetail(hero.step)}
              />
            ) : model.allComplete ? (
              <View style={styles.placeholderCard}>
                <Sparkle size={40} weight="fill" color={CC.blue} />
                <Text style={[companionType.celebrationTitle, styles.placeholderTitle]}>
                  {timeOfDay === 'morning'
                    ? 'Morning routine, complete.'
                    : 'Tonight’s routine, complete.'}
                </Text>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <Text style={companionType.celebrationSubtitle}>
                  No steps for this time of day yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CC.porcelain,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkle: {
    marginLeft: 7,
    marginTop: 2,
  },
  heroWrap: {
    paddingHorizontal: companionGeo.screenMargin,
    paddingTop: 4,
  },
  placeholderCard: {
    borderRadius: companionGeo.heroRadius,
    backgroundColor: CC.white,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    marginTop: 4,
  },
});
