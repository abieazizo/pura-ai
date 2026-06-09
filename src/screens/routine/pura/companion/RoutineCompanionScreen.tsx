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
 * recomputes "which step is current" inline. The one piece of local
 * state it owns is a manual *focus override*: tapping an upcoming step
 * promotes it into the hero without reordering the routine.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Sparkle } from 'phosphor-react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { hapt } from '@/utils/haptics';
import type {
  CustomRoutine,
  RoutineStep,
  RoutineTimeOfDay,
} from '@/types/routine';
import { tnum } from '@/theme';
import { CC, DAY_ATMOSPHERE, companionGeo, companionMotion, companionType } from './companionTokens';
import { buildCompanionModel, type CompanionRow } from './companionModel';
import { buildCompanionGreeting } from './companionGreeting';
import { HeroFocusCard } from './HeroFocusCard';
import { CelebrationCard } from './CelebrationCard';
import { VerticalProgressLine } from './VerticalProgressLine';
import { AmPmToggle } from './AmPmToggle';
import { UpcomingCard } from './UpcomingCard';
import { CompletedTail } from './CompletedTail';
import { ScanFacePortrait } from './ScanFacePortrait';

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

/** Eased sub-progress for a zone's slice of the master reveal clock. */
function zoneAt(reveal: number, start: number, end: number): number {
  'worklet';
  const t = (reveal - start) / (end - start);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - c) * (1 - c) * (1 - c);
}

export interface RoutineCompanionScreenProps {
  routine: CustomRoutine;
  timeOfDay: RoutineTimeOfDay;
  onChangeTimeOfDay: (next: RoutineTimeOfDay) => void;
  /** Step ids completed today for the active time of day. */
  doneIds: string[];
  /** Consecutive-day completion streak (from `selectCompletionStreak`). */
  streak: { count: number; includesToday: boolean };
  onToggleComplete: (stepId: string) => void;
  /** Tap the hero product image → product detail sheet (wired later). */
  onOpenDetail: (step: RoutineStep) => void;
  /** Header "Customize" → customize sheet (wired later). */
  onCustomize: () => void;
  onHowItWorks: () => void;
  /**
   * Cycle 12 — the recurring hero image. The canonical `Scan.photoUri` of the
   * latest scan; undefined when none exists (the portrait shows its honest
   * locked placeholder). `scanMeta` is a short caption ("Day 6 · Jun 8").
   */
  facePhotoUri?: string;
  scanMeta?: string;
  /** Tap the portrait → revisit the scan; placeholder CTA → start a scan. */
  onRevisitScan?: () => void;
}

export function RoutineCompanionScreen({
  routine,
  timeOfDay,
  onChangeTimeOfDay,
  doneIds,
  streak,
  onToggleComplete,
  onOpenDetail,
  onCustomize,
  onHowItWorks,
  facePhotoUri,
  scanMeta,
  onRevisitScan,
}: RoutineCompanionScreenProps) {
  const model = React.useMemo(
    () => buildCompanionModel({ routine, timeOfDay, doneIds }),
    [routine, timeOfDay, doneIds],
  );

  const reduceMotion = useReduceMotion();
  const { height: vh } = useWindowDimensions();
  const compact = vh < companionGeo.compactBelow;

  // Entrance reveal (Signature #1). One master clock, driven 0→1 on every
  // tab focus; the hero reads five staggered windows off it while the
  // header and the lower zones fade in behind it. Linear here — each
  // layer eases itself.
  const reveal = useSharedValue(0);
  useFocusEffect(
    React.useCallback(() => {
      if (reduceMotion) {
        reveal.value = 1;
        return;
      }
      reveal.value = 0;
      reveal.value = withTiming(1, {
        duration: companionMotion.reveal,
        easing: Easing.linear,
      });
    }, [reduceMotion, reveal]),
  );
  const headerStyle = useAnimatedStyle(() => {
    const t = Math.min(1, reveal.value / 0.45);
    return { opacity: t, transform: [{ translateY: 6 * (1 - t) }] };
  });
  const greetingStyle = useAnimatedStyle(() => {
    const v = zoneAt(reveal.value, 0.08, 0.5);
    return { opacity: v, transform: [{ translateY: 8 * (1 - v) }] };
  });
  const upcomingStyle = useAnimatedStyle(() => {
    const v = zoneAt(reveal.value, 0.45, 0.95);
    return { opacity: v, transform: [{ translateY: 12 * (1 - v) }] };
  });
  const completedStyle = useAnimatedStyle(() => {
    const v = zoneAt(reveal.value, 0.5, 1);
    return { opacity: v, transform: [{ translateY: 12 * (1 - v) }] };
  });

  // Manual focus override — tapping an upcoming step promotes it to the
  // hero. Cleared whenever the time-of-day flips (a different list).
  const [focusId, setFocusId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setFocusId(null);
  }, [timeOfDay]);

  const heroRow = React.useMemo(() => {
    if (focusId) {
      const overridden = model.rows.find(
        (r) => r.step.id === focusId && !r.done,
      );
      if (overridden) return overridden;
    }
    return model.heroRow;
  }, [focusId, model.rows, model.heroRow]);
  const heroId = heroRow?.step.id ?? null;

  // Not-done rows other than whatever currently owns the hero — stays
  // consistent whether the hero is the natural next step or an override.
  const upcoming = React.useMemo(
    () => model.rows.filter((r) => !r.done && r.step.id !== heroId),
    [model.rows, heroId],
  );
  const completed = model.completed;

  const greeting = React.useMemo(
    () =>
      buildCompanionGreeting({
        timeOfDay,
        doneCount: model.doneCount,
        total: model.total,
        allComplete: model.allComplete,
        streakCount: streak.count,
        streakIncludesToday: streak.includesToday,
      }),
    [
      timeOfDay,
      model.doneCount,
      model.total,
      model.allComplete,
      streak.count,
      streak.includesToday,
    ],
  );

  // The hero slot normally mirrors the (possibly overridden) hero. During
  // a completion it is pinned to the just-completed step so that card can
  // depart (slide down + fade) while the next rises into its place — the
  // slot, not a keyed remount, owns that choreography so nothing unmounts
  // mid-animation.
  const [view, setView] = React.useState<{
    row: CompanionRow | null;
    celebrate: boolean;
  }>(() => ({ row: heroRow, celebrate: model.allComplete }));
  const transitioningRef = React.useRef(false);
  const slotY = useSharedValue(0);
  const slotO = useSharedValue(1);

  React.useEffect(() => {
    if (transitioningRef.current) return;
    setView({ row: heroRow, celebrate: model.allComplete });
    slotY.value = 0;
    slotO.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, model.allComplete, timeOfDay]);

  const slotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slotY.value }],
    opacity: slotO.value,
  }));

  const endTransition = React.useCallback(() => {
    transitioningRef.current = false;
  }, []);

  const rise = React.useCallback(
    (next: CompanionRow | null) => {
      setView({ row: next, celebrate: next == null });
      // Routine fully complete → the fuller ritual celebration as the
      // celebration card blooms into the slot. (The per-step success tick
      // already fired at the checkmark, so non-final steps stay lighter.)
      if (next == null) hapt.ritualComplete();
      slotY.value = 28;
      slotO.value = 0;
      // Springy rise with a touch of overshoot — the next step "lands".
      slotY.value = withSpring(0, companionMotion.heroRiseSpring);
      slotO.value = withTiming(
        1,
        { duration: companionMotion.heroSwap, easing: companionMotion.entrance },
        (finished) => {
          'worklet';
          if (finished) runOnJS(endTransition)();
        },
      );
    },
    [slotO, slotY, endTransition],
  );

  const handleHeroDone = React.useCallback(
    (done: CompanionRow) => {
      transitioningRef.current = true;
      const next = upcoming[0] ?? null;
      setFocusId(null);
      onToggleComplete(done.step.id);
      slotY.value = withTiming(60, {
        duration: companionMotion.cardExit,
        easing: companionMotion.exit,
      });
      slotO.value = withTiming(
        0.3,
        { duration: companionMotion.cardExit, easing: companionMotion.exit },
        (finished) => {
          'worklet';
          if (finished) runOnJS(rise)(next);
        },
      );
    },
    [upcoming, onToggleComplete, slotO, slotY, rise],
  );

  const focusStep = React.useCallback(
    (row: CompanionRow) => {
      if (row.step.id === heroId) return;
      transitioningRef.current = true;
      setFocusId(row.step.id);
      rise(row);
    },
    [heroId, rise],
  );

  // Celebration "View what you did →" — scroll the surface down to the
  // completed tail (always present when allComplete).
  const scrollRef = React.useRef<ScrollView>(null);
  const handleViewWhatYouDid = React.useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <DayAtmosphere timeOfDay={timeOfDay} reduceMotion={reduceMotion} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Zone 1 — header + AM/PM toggle. */}
          <Animated.View style={[styles.header, headerStyle]}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Text style={[companionType.pageTitle, styles.pageTitle]}>Routine</Text>
                <Sparkle
                  size={19}
                  weight="fill"
                  color={CC.blue}
                  style={styles.sparkle}
                />
              </View>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                onPress={() => {
                  hapt.select();
                  onCustomize();
                }}
              >
                <Text style={companionType.link}>Customize</Text>
              </Pressable>
            </View>
            <Text style={[companionType.date, styles.date]}>{formatToday()}</Text>
            <View style={styles.toggleWrap}>
              <AmPmToggle value={timeOfDay} onChange={onChangeTimeOfDay} />
            </View>
          </Animated.View>

          {/* Zone 2 — the scanned-face hero portrait (Cycle 12). The user's
              real capture frames the greeting; the streak-aware line + scan
              metadata ride its bottom scrim. Falls back to an honest locked
              placeholder when no scan photo exists. */}
          <Animated.View style={[styles.portraitWrap, greetingStyle]}>
            <ScanFacePortrait
              photoUri={facePhotoUri}
              eyebrow={timeOfDay === 'morning' ? 'TODAY’S SKIN' : 'TONIGHT’S SKIN'}
              greeting={greeting}
              meta={scanMeta}
              compact={compact}
              onPress={facePhotoUri ? onRevisitScan : undefined}
              onScan={onRevisitScan}
            />
          </Animated.View>

          {/* Zone 3 — hero focus card. */}
          <Animated.View style={[styles.heroWrap, slotStyle]}>
            {view.row ? (
              <HeroFocusCard
                key={view.row.step.id}
                step={view.row.step}
                stepIndex={view.row.index}
                totalSteps={model.total}
                reveal={reveal}
                onMarkDone={() => handleHeroDone(view.row!)}
                onOpenDetail={() => onOpenDetail(view.row!.step)}
              />
            ) : view.celebrate ? (
              <CelebrationCard
                timeOfDay={timeOfDay}
                streak={streak}
                onViewWhatYouDid={handleViewWhatYouDid}
              />
            ) : (
              <View style={styles.placeholderCard}>
                <Text style={companionType.celebrationSubtitle}>
                  No steps for this time of day yet.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Zone 4 — upcoming preview. Hidden when nothing is queued. */}
          {upcoming.length > 0 ? (
            <Animated.View style={[styles.section, upcomingStyle]}>
              <Text style={[companionType.eyebrow, styles.eyebrow]}>COMING UP</Text>
              <Text style={[companionType.hint, styles.hint]}>
                Tap any step to focus on it
              </Text>
              <View style={styles.upcomingList}>
                {upcoming.map((r) => (
                  <UpcomingCard key={r.step.id} row={r} onPress={focusStep} />
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Zone 5 — completed tail. Hidden until the first step is done. */}
          {completed.length > 0 ? (
            <Animated.View style={completedStyle}>
              <CompletedTail rows={completed} timeOfDay={timeOfDay} />
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Zone 0 — vertical progress spine (fixed; does not scroll). */}
        <VerticalProgressLine
          ratio={model.completionRatio}
          total={model.total}
          done={model.doneCount}
        />
      </SafeAreaView>
    </View>
  );
}

/**
 * DayAtmosphere — the AM/PM ambient sky behind the whole companion. A full-page
 * gradient keyed to the time of day (warm dawn for AM, cool dusk for PM) with a
 * soft top glow that slowly breathes, cross-fading on AM↔PM toggle. Purely
 * decorative (pointerEvents none); reduce-motion → static glow, instant swap.
 */
function DayAtmosphere({
  timeOfDay,
  reduceMotion,
}: {
  timeOfDay: RoutineTimeOfDay;
  reduceMotion: boolean;
}) {
  const atm = DAY_ATMOSPHERE[timeOfDay];
  const restOpacity = atm.glowOpacity;
  const breath = useSharedValue(0);

  React.useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, {
        duration: companionMotion.atmosphereBreathMs,
        easing: companionMotion.breath,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduceMotion, breath]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [restOpacity * 0.78, restOpacity]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.07]) }],
  }));

  const content = (
    <>
      <LinearGradient
        colors={atm.sky}
        locations={[0, 0.46, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.atmGlow, { height: `${Math.round(atm.glowHeight * 100)}%` }, glowStyle]}
      >
        <LinearGradient
          colors={[atm.glow, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );

  if (reduceMotion) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {content}
      </View>
    );
  }

  return (
    <Animated.View
      key={timeOfDay}
      entering={FadeIn.duration(companionMotion.atmosphereSwap)}
      exiting={FadeOut.duration(companionMotion.atmosphereSwap)}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CC.porcelain,
  },
  atmGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
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
    paddingTop: 6,
    paddingBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    // Editorial page mark — larger and tighter than the timid 26px default.
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.7,
  },
  date: {
    // Tabular date so the day number doesn't shift the line day-to-day.
    ...tnum,
    marginTop: 5,
    letterSpacing: 0.2,
  },
  sparkle: {
    marginLeft: 8,
    marginTop: 3,
  },
  toggleWrap: {
    marginTop: 12,
  },
  portraitWrap: {
    paddingHorizontal: companionGeo.screenMargin,
    paddingTop: 12,
    paddingBottom: 6,
  },
  heroWrap: {
    paddingHorizontal: companionGeo.screenMargin,
    paddingTop: 2,
  },
  section: {
    paddingTop: 24,
  },
  eyebrow: {
    paddingHorizontal: 20,
    // Hold the caps eyebrow at a confident, even track.
    letterSpacing: 2,
  },
  hint: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 14,
  },
  upcomingList: {
    paddingHorizontal: companionGeo.screenMargin,
    gap: 10,
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
});
