/**
 * YourRoutineTabScreen — the RoutineTab + "Build my routine" destination.
 *
 * Reads the canonical SkinState (per CLAUDE.md — never raw AI output) and the
 * routine store, projects them through `buildYourRoutineModel`, and renders the
 * three-mode experience. Integration is a SUPERSET, not a rip-out: the existing
 * `PuraRoutineScreen` still owns the no-scan / building / review lifecycle (all
 * already polished); this screen takes over only once a routine is ACTIVE. The
 * first open of a freshly-built routine plays the reveal morph; later opens land
 * on the serene daily home.
 *
 * Production wiring the experience depends on:
 *   • timeOfDay comes from the CLOCK — the screen IS the time of day; the old
 *     persisted AM/PM toggle belongs to the legacy companion screen.
 *   • The screen-2 moves come from the routineFocusMoves slice (true morph
 *     continuity), falling back to derived buckets for older scans.
 *   • Welcome-back keys off days since the last OPEN (presence), never off
 *     completions — the orb doesn't guilt, and it doesn't misremember.
 *   • The last shown greeting persists, so rotation provably never repeats.
 *   • calmerLately comes from the canonical progress comparison.
 *   • Ending the ritual early marks done ONLY what was actually done.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { SkinState } from '@/types/canonical';
import type { SemanticFaceZone, VisibleFinding } from '@/types/scanResults';
import { useSkinState } from '@/hooks/useCanonical';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  useRoutineStore,
  selectDailyDoneIds,
  selectCompletionStreak,
  defaultTimeOfDayForNow,
  todayDateKey,
} from '@/state/routine/routineStore';
import { useRoutineFocusMoves, movesForScan } from '@/state/routineFocusMoves';
import { getProgressComparison } from '@/services/routine/progressComparisonService';
import { PuraRoutineScreen } from '../pura/PuraRoutineScreen';
import { buildYourRoutineModel } from './model';
import { YourRoutineExperience, type ExperienceMode } from './YourRoutineExperience';
import { YourRoutineDevHarness } from './YourRoutineDevHarness';

/** Routine ids whose reveal morph has already played this session. */
const revealSeen = new Set<string>();

function harnessOn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.localStorage?.getItem('__pura_yourroutine_harness__') === '1' ||
      (window as unknown as { __puraYourRoutineHarness__?: boolean }).__puraYourRoutineHarness__ === true
    );
  } catch {
    return false;
  }
}

function mapFindings(skin: SkinState | null): VisibleFinding[] {
  if (!skin) return [];
  return (skin.topConcerns ?? [])
    .filter((c) => c.rank !== 0)
    .map((c) => ({
      id: String(c.concern),
      type: c.concern as VisibleFinding['type'],
      displayName: c.summary,
      present: true,
      supportedByScan: true,
      confidence: c.confidence,
      priority: c.rank === 1 ? 'high' : c.rank === 2 ? 'medium' : 'low',
      zones: (c.regions ?? []) as SemanticFaceZone[],
      shortFinding: c.summary,
      recommendedDirection: '',
    }));
}

function daysBetween(prevKey: string | null, now: Date): number {
  if (!prevKey) return 0;
  const [y, m, d] = prevKey.split('-').map(Number);
  if (!y) return 0;
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(y, m - 1, d);
  return Math.max(0, Math.floor((a - b) / 86_400_000));
}

/** Hook-free shell: the dev harness branch must never change hook order. */
export function YourRoutineTabScreen() {
  if (harnessOn()) return <YourRoutineDevHarness />;
  return <YourRoutineTabScreenLive />;
}

function YourRoutineTabScreenLive() {
  const skin = useSkinState();
  const reduceMotion = useReduceMotion();
  const { lifecycle, routine, dailyChecklist, completionDates } = useRoutineStore(
    useShallow((s) => ({
      lifecycle: s.lifecycle,
      routine: s.routine,
      dailyChecklist: s.dailyChecklist,
      completionDates: s.completionDates,
    })),
  );
  const toggleStepComplete = useRoutineStore((s) => s.toggleStepComplete);
  const byScanId = useRoutineFocusMoves((s) => s.byScanId);
  const markOpened = useRoutineFocusMoves((s) => s.markOpened);
  const setLastGreeting = useRoutineFocusMoves((s) => s.setLastGreeting);
  // Captured ONCE per mount (not subscribed): the no-repeat guard is across
  // DAYS — feeding back the greeting we just persisted would make the visible
  // line oscillate whenever the model rebuilds mid-session (e.g. quick-done).
  const lastGreetingRef = useRef<string | null | undefined>(undefined);
  if (lastGreetingRef.current === undefined) {
    lastGreetingRef.current = useRoutineFocusMoves.getState().lastGreeting;
  }
  const lastGreeting = lastGreetingRef.current;

  const isActive =
    !!routine &&
    (lifecycle === 'active' || lifecycle === 'session_in_progress' || lifecycle === 'session_complete');

  // Decide reveal-vs-home once, before the experience mounts.
  const initialModeRef = useRef<ExperienceMode | null>(null);
  if (isActive && initialModeRef.current === null && routine) {
    initialModeRef.current = revealSeen.has(routine.id) ? 'home' : 'reveal';
    revealSeen.add(routine.id);
  }

  const now = new Date();
  // The screen IS the time of day — derived from the clock on every open.
  const timeOfDay = defaultTimeOfDayForNow(now);
  const doneIds = selectDailyDoneIds(dailyChecklist, timeOfDay, now);
  const streak = selectCompletionStreak(completionDates, now);
  const findings = useMemo(() => mapFindings(skin), [skin]);

  // Welcome-back is about PRESENCE: stamp this open, read the previous one.
  const prevOpenRef = useRef<string | null>(null);
  const stamped = useRef(false);
  if (!stamped.current) {
    stamped.current = true;
    prevOpenRef.current = useRoutineFocusMoves.getState().lastOpenDate;
  }
  useEffect(() => {
    markOpened(todayDateKey(now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const model = useMemo(() => {
    if (!routine) return null;
    const comparison = getProgressComparison();
    const calmerLately =
      comparison.canCompare && (comparison.overallImprovementPercent ?? 0) >= 5;
    const moves = movesForScan(byScanId, routine.scanId);
    return buildYourRoutineModel({
      routine,
      findings,
      moves: moves ?? undefined,
      timeOfDay,
      now,
      streak,
      doneIds,
      daysSinceLastUse: daysBetween(prevOpenRef.current, now),
      calmerLately,
      lastGreeting: lastGreeting ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, findings, timeOfDay, doneIds.join(','), streak.count, streak.includesToday, byScanId]);

  // Persist the greeting we actually showed — tomorrow's no-repeat guard.
  useEffect(() => {
    if (model?.greeting) setLastGreeting(model.greeting);
  }, [model?.greeting, setLastGreeting]);

  // Not yet an active routine — the existing screen owns scan/build/review.
  if (!isActive || !model) return <PuraRoutineScreen />;

  return (
    <YourRoutineExperience
      model={model}
      reduceMotion={reduceMotion}
      initialMode={initialModeRef.current ?? 'home'}
      now={now}
      completionDates={completionDates}
      streak={streak}
      onQuickDone={() => {
        const id = model.focus.heroStep?.id;
        if (id) toggleStepComplete(timeOfDay, id);
      }}
      onRitualComplete={(completedStepIds) => {
        // Honest by construction: only the steps actually marked done in the
        // ritual are claimed — skips and early-end leftovers stay open.
        for (const s of model.today.steps) {
          if (!s.done && completedStepIds.includes(s.id)) {
            toggleStepComplete(timeOfDay, s.id);
          }
        }
      }}
    />
  );
}
