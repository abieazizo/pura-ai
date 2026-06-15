/**
 * OverviewScreen — ACT 1, the light Porcelain PLAN.
 *
 * A calm, premium plan — NOT a dashboard, NOT a checklist. Layout, top → bottom:
 *   • AmbientLight        — pure cool-blue backdrop (pointerEvents none)
 *   • OverviewHeader      — eyebrow TODAY · serif title 34 · time subline · the
 *                           44px orb anchor (relayed up via onOrbAnchor)
 *   • StepList (the hero) — the routine as a short, doable sequence, in a scroll
 *                           body so the plan FEELS short (cross-team component)
 *   • StartCTA            — pinned in the safe-area footer; always reachable
 *
 * It derives the time-aware title + total-time subline from the model, picks the
 * active time of day, and chooses Start-vs-rest from `focus.allComplete` (and
 * treats zero steps as rest — never Start into an empty ritual). It measures the
 * Start footer's rect and hands it to `onStart` for the host's shared-element
 * descent. Color from `overviewTone`, type from `flow/type.ts` (no hex).
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardSeconds, phraseMinutes } from './contracts';
import type { FlowRect, OrbTargetXY, OverviewScreenProps } from './contracts';
import { overviewTone } from '@/theme/routineFlow';
import { AmbientLight } from './components/AmbientLight';
import { OverviewHeader } from './components/OverviewHeader';
import { StartCTA } from './components/StartCTA';
import { StepList } from './components/StepList';

const GUTTER = 24;

/**
 * The host (RoutineFlow) drives the SHARED orb, so it needs the header's measured
 * orb anchor. The locked `OverviewScreenProps` has no anchor channel; rather than
 * widen the foundation contract, we build ON it with an additive prop that flows
 * only between two SCAFFOLD-owned files (RoutineFlow → OverviewScreen). The
 * screen relays the header's anchor straight up unchanged.
 */
export interface OverviewScreenSlotProps extends OverviewScreenProps {
  /** Report the header orb anchor (window coords) so the host can park/carry. */
  onOrbAnchor?: (xy: OrbTargetXY) => void;
}

/** A calm, editorial, time-aware title — "Your morning, in three steps".
 *  Built deterministically from the active card so it's never a raw AI line and
 *  never claims a count it doesn't have. Falls back gracefully at 0 steps. */
function overviewTitle(timeOfDay: 'morning' | 'evening', stepCount: number): string {
  const when = timeOfDay === 'morning' ? 'Your morning' : 'Your evening';
  if (stepCount <= 0) return when;
  const count =
    stepCount === 1
      ? 'in one step'
      : stepCount === 2
        ? 'in two steps'
        : stepCount === 3
          ? 'in three steps'
          : `in ${stepCount} steps`;
  return `${when}, ${count}`;
}

export function OverviewScreen({
  model,
  reduceMotion,
  onStart,
  onRescanBridge,
  onOrbAnchor,
}: OverviewScreenSlotProps) {
  const insets = useSafeAreaInsets();
  const footerRef = useRef<View>(null);

  const activeTimeOfDay: 'morning' | 'evening' =
    model.timeOfDay === 'morning' ? 'morning' : 'evening';

  const today = model.today;
  const stepCount = today.steps.length;

  // Rest when the day is finished OR when there's genuinely nothing to do — both
  // resolve to the calm rest state, never a Start into an empty theater.
  const restState = model.focus.allComplete || stepCount === 0;

  const title = useMemo(
    () => overviewTitle(activeTimeOfDay, stepCount),
    [activeTimeOfDay, stepCount],
  );
  const subline = useMemo(() => phraseMinutes(cardSeconds(today)), [today]);

  const startLabel =
    activeTimeOfDay === 'morning' ? 'Start morning routine' : 'Start evening routine';

  // The host carries the shared orb to/from this anchor. OverviewScreen adds no
  // transform vs. the host, so the header's window coords ARE the host's coords
  // — pass them straight through.
  const handleOrbAnchor = useCallback(
    (xy: OrbTargetXY) => onOrbAnchor?.(xy),
    [onOrbAnchor],
  );

  // Measure the Start footer rect, then fire onStart with it for the descent's
  // shared-element handoff. Under reduce-motion the host ignores the rect; we
  // still pass it so a single code path covers both.
  const startWithRect = useCallback(() => {
    const node = footerRef.current;
    if (!node) {
      onStart();
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const rect: FlowRect | undefined =
        width || height ? { x, y, width, height } : undefined;
      onStart(rect);
    });
  }, [onStart]);

  return (
    <View style={styles.root}>
      <AmbientLight />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <OverviewHeader
            title={title}
            subline={subline}
            reduceMotion={reduceMotion}
            onOrbAnchor={handleOrbAnchor}
          />
        </View>

        <View style={styles.listWrap}>
          <StepList
            am={model.am}
            pm={model.pm}
            activeTimeOfDay={activeTimeOfDay}
            reduceMotion={reduceMotion}
            staggerBase={1}
          />
        </View>
      </ScrollView>

      {/* Pinned footer — the Start action is ALWAYS reachable, never under the
          scroll fold or behind the orb. */}
      <View
        ref={footerRef}
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            paddingLeft: insets.left + GUTTER,
            paddingRight: insets.right + GUTTER,
          },
        ]}
      >
        <StartCTA
          label={startLabel}
          restState={restState}
          doneLine="Done for today."
          bridgeLine={model.progressBridge}
          reduceMotion={reduceMotion}
          onStart={startWithRect}
          onRescanBridge={onRescanBridge}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: 24,
  },
  headerWrap: {
    marginBottom: 24,
  },
  listWrap: {
    flex: 1,
  },
  footer: {
    // A quiet seam above the footer so the Start sits on the light field, not
    // a hard divider — the plan stays calm.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewTone.hairline,
    backgroundColor: overviewTone.bg,
  },
});
