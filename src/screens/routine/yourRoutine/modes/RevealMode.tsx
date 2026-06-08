/**
 * RevealMode (Mode A) — the morph. The magic moment.
 *
 * The screen-2 move cards persist as a shared element and BECOME the routine:
 *   0–400ms   the stack settles, scaling 1.0 → 0.96
 *   400ms+    each move unfolds 160ms apart — its TITLE rises and lightens into
 *             a section header; its steps cascade beneath (each row opacity 0→1,
 *             y +10→0 over 360ms, 90ms stagger); each throughline fades in 200ms
 *             after its row lands
 *   meanwhile the orb's gaze drifts down the list, its glow warming as the
 *   routine completes; a light haptic locks each header; one fuller haptic marks
 *   the assembly finishing; the "Start" CTA fades up LAST (~1.6s total).
 *
 * The CTA is the ONE loud filled control in the whole experience.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { blue } from '@/theme/ds';
import { ORB_RITUAL_SPRING, routineTiming, type PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import type { MoveVM, YourRoutineModel } from '../model';
import { rType } from '../tokens';
import { ritualHaptics, beginHapticLog } from '../ritualHaptics';

interface RevealModeProps {
  model: YourRoutineModel;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  onStart: () => void;
  onOpenBundle: () => void;
}

interface Section {
  move: MoveVM;
  headerAt: number;
  rowStarts: number[];
}

function buildTimeline(moves: MoveVM[]): { sections: Section[]; assemblyAt: number; ctaAt: number } {
  let header: number = routineTiming.morphSettle; // 400
  let lastRowEnd: number = header;
  const sections = moves.map((move) => {
    const rowStarts = move.steps.map((_, j) => header + 120 + j * routineTiming.morphRowStagger);
    lastRowEnd = Math.max(lastRowEnd, (rowStarts[rowStarts.length - 1] ?? header) + routineTiming.morphRow + routineTiming.morphThroughlineLag);
    const section: Section = { move, headerAt: header, rowStarts };
    header += routineTiming.morphUnfoldGap; // next move's header 160ms later
    return section;
  });
  const assemblyAt = lastRowEnd;
  const ctaAt = assemblyAt + 120;
  return { sections, assemblyAt, ctaAt };
}

export function RevealMode({ model, atmo, reduceMotion, onStart, onOpenBundle }: RevealModeProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orb = useOrb();

  const { sections, assemblyAt, ctaAt } = useMemo(() => buildTimeline(model.moves), [model.moves]);
  const total = ctaAt + routineTiming.morphCtaFade;

  const clock = useSharedValue(0); // ms along the morph
  const settle = useSharedValue(0); // 0→1 stack settle (scale 1→0.96)
  const ctaT = useSharedValue(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    beginHapticLog();

    // Place + prime the orb at the reveal beat (top-center), gaze down the list.
    orb.moveTo({ cx: width / 2, cy: insets.top + 84, size: 74 }, { spring: ORB_RITUAL_SPRING });
    orb.setExpression('warm');
    orb.setGaze('down');
    orb.setFamiliarity(0.28);
    ritualHaptics.revealEnter();

    if (reduceMotion) {
      clock.value = total;
      settle.value = 1;
      ctaT.value = 1;
      sections.forEach((s) => ritualHaptics.headerLock(s.move.title));
      ritualHaptics.assemblyDone();
      orb.setGaze('forward');
      orb.setExpression('validating');
      orb.setFamiliarity(0.85);
      return;
    }

    settle.value = withTiming(1, { duration: routineTiming.morphSettle, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    clock.value = withTiming(total, { duration: total, easing: Easing.linear });
    ctaT.value = withTiming(1, { duration: routineTiming.morphCtaFade }); // its own delayed start handled by style window? simpler: schedule
    ctaT.value = 0;

    const timers: ReturnType<typeof setTimeout>[] = [];
    // Header locks — light haptic + orb warms + gaze creeps down.
    sections.forEach((s, i) => {
      timers.push(
        setTimeout(() => {
          ritualHaptics.headerLock(s.move.title);
          orb.setGaze('down');
          orb.blinkNow();
          orb.setFamiliarity(0.3 + ((i + 1) / sections.length) * 0.55);
        }, s.headerAt),
      );
    });
    // Assembly finishes — the fuller beat; orb turns to the viewer, fully warm.
    timers.push(
      setTimeout(() => {
        ritualHaptics.assemblyDone();
        orb.setGaze('forward');
        orb.setExpression('validating');
        orb.setFamiliarity(0.9);
        orb.emphasisPulse();
      }, assemblyAt),
    );
    // CTA fades up last.
    timers.push(setTimeout(() => (ctaT.value = withTiming(1, { duration: routineTiming.morphCtaFade })), ctaAt));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(settle.value, [0, 1], [1, 0.96]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [{ translateY: interpolate(ctaT.value, [0, 1], [10, 0]) }],
  }));

  return (
    <View style={[styles.fill, { paddingTop: insets.top + 150 }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* The first-reveal line — the opening of the letter. */}
        <Text style={[rType.letter, { color: atmo.ink }]}>{model.firstReveal}</Text>
        <Text style={[rType.throughline, { color: atmo.muted, marginTop: 12 }]}>{model.productFree}</Text>

        <Animated.View style={[{ marginTop: 28 }, stackStyle]}>
          {sections.map((s, i) => (
            <MoveSection key={s.move.id} section={s} clock={clock} atmo={atmo} reduceMotion={reduceMotion} last={i === sections.length - 1} />
          ))}
        </Animated.View>
      </ScrollView>

      {/* Footer: the one loud control + the honest bundle invite. */}
      <Animated.View
        style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: 'transparent' }, ctaStyle]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={model.focus.ctaLabel}
          style={({ pressed }) => [styles.cta, { backgroundColor: blue[500], opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={[rType.button, { color: '#FFFFFF' }]}>{model.focus.ctaLabel}</Text>
        </Pressable>
        {model.commerce.anyPicks && (
          <Pressable onPress={onOpenBundle} hitSlop={8} accessibilityRole="button" style={styles.bundleLink}>
            <Text style={[rType.bodySm, { color: atmo.muted, textDecorationLine: 'underline' }]}>
              Here's everything for your routine
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

function MoveSection({
  section,
  clock,
  atmo,
  reduceMotion,
  last,
}: {
  section: Section;
  clock: SharedValue<number>;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  last: boolean;
}) {
  // The title rises a touch and lightens (card title → section header).
  const headerStyle = useAnimatedStyle(() => {
    const p = reduceMotion ? 1 : interpolate(clock.value, [section.headerAt - 80, section.headerAt + 120], [0, 1], 'clamp');
    return {
      opacity: 0.6 + p * 0.4,
      transform: [{ translateY: interpolate(p, [0, 1], [6, 0]) }],
    };
  });

  return (
    <View style={{ marginBottom: last ? 8 : 26 }}>
      <Animated.Text style={[rType.section, { color: atmo.ink }, headerStyle]}>
        {section.move.title}
      </Animated.Text>
      <View style={{ marginTop: 8 }}>
        {section.move.steps.map((step, j) => (
          <CascadeRow key={step.id} startAt={section.rowStarts[j]} clock={clock} atmo={atmo} reduceMotion={reduceMotion}
            action={step.action} throughline={step.throughline} tag={step.timeOfDay === 'morning' ? 'AM' : 'PM'} />
        ))}
      </View>
    </View>
  );
}

function CascadeRow({
  startAt,
  clock,
  atmo,
  reduceMotion,
  action,
  throughline,
  tag,
}: {
  startAt: number;
  clock: SharedValue<number>;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  action: string;
  throughline: string;
  tag: string;
}) {
  const rowStyle = useAnimatedStyle(() => {
    const p = reduceMotion ? 1 : interpolate(clock.value, [startAt, startAt + routineTiming.morphRow], [0, 1], 'clamp');
    return { opacity: p, transform: [{ translateY: interpolate(p, [0, 1], [10, 0]) }] };
  });
  const tlStyle = useAnimatedStyle(() => {
    const start = startAt + routineTiming.morphThroughlineLag;
    const p = reduceMotion ? 1 : interpolate(clock.value, [start, start + 200], [0, 1], 'clamp');
    return { opacity: p };
  });
  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.rowHead}>
        <Text style={[rType.body, { color: atmo.ink, flex: 1 }]}>{action}</Text>
        <Text style={[rType.labelSm, { color: atmo.faint, marginLeft: 12 }]}>{tag}</Text>
      </View>
      <Animated.Text style={[rType.throughline, { color: atmo.muted, marginTop: 6 }, tlStyle]}>
        {throughline}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { paddingVertical: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, alignItems: 'center' },
  cta: {
    height: 56,
    alignSelf: 'stretch',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bundleLink: { marginTop: 16, paddingVertical: 6 },
});
