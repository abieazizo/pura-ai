/**
 * HomeMode (Mode B) — the daily home. Time-aware and serene.
 *
 * The screen IS the time of day (the atmosphere is owned by the host). On open,
 * the "noticing you" beat fires: the orb brightens ~10%, its gaze lifts to the
 * viewer, and the greeting fades up like the first line of a letter; the one
 * focus card rises in (y +12→0, 420ms). The DEFAULT is a single next action —
 * never the whole list. A guilt-free welcome-back replaces the greeting after a
 * gap. The progress bridge ties today to the next scan. Full routine,
 * consistency, and products are all one quiet tap down — pulled, never pushed.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ORB_RITUAL_SPRING, routineTiming, type PeriodAtmosphere } from '@/theme/routineAtmosphere';
import { useOrb } from '@/screens/onboarding/orb/OrbHost';
import type { YourRoutineModel } from '../model';
import { rType } from '../tokens';
import { ritualHaptics } from '../ritualHaptics';
import { FocusCard } from '../components/FocusCard';
import { StepRow } from '../components/StepRow';
import { ConsistencyView } from '../components/ConsistencyView';

interface HomeModeProps {
  model: YourRoutineModel;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  now: Date;
  completionDates: string[];
  streak: { count: number; includesToday: boolean };
  onStart: () => void;
  onQuickDone: () => void;
  onOpenBundle: () => void;
  adaptive?: { line: string; milestone: string } | null;
}

type Panel = 'none' | 'full' | 'consistency';

export function HomeMode({
  model,
  atmo,
  reduceMotion,
  now,
  completionDates,
  streak,
  onStart,
  onQuickDone,
  onOpenBundle,
  adaptive,
}: HomeModeProps) {
  const insets = useSafeAreaInsets();
  const orb = useOrb();
  const [panel, setPanel] = useState<Panel>('none');

  const greetingT = useSharedValue(reduceMotion ? 1 : 0);
  const focusT = useSharedValue(reduceMotion ? 1 : 0);
  const did = useRef(false);

  useEffect(() => {
    // Orb settles above-left of the greeting and "notices you".
    orb.moveTo({ cx: insets.left + 54, cy: insets.top + 52, size: 60 }, { spring: ORB_RITUAL_SPRING });
    orb.setExpression('warm');
    orb.setGaze('forward');
    if (!did.current) {
      did.current = true;
      ritualHaptics.silence('morning greeting'); // the greeting is silent, by design
      if (!reduceMotion) {
        orb.emphasisPulse(); // brighten + a small scale lift = "noticing you"
        orb.setFamiliarity(0.55);
        greetingT.value = withTiming(1, { duration: routineTiming.noticingBeat, easing: Easing.bezier(0.22, 1, 0.36, 1) });
        focusT.value = withDelay(140, withTiming(1, { duration: routineTiming.focusRise, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
      } else {
        orb.setFamiliarity(0.55);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingT.value,
    transform: [{ translateY: (1 - greetingT.value) * 8 }],
  }));
  const focusStyle = useAnimatedStyle(() => ({
    opacity: focusT.value,
    transform: [{ translateY: (1 - focusT.value) * 12 }],
  }));

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{ paddingTop: insets.top + 120, paddingHorizontal: 24, paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={greetingStyle}>
        <Text style={[rType.letter, { color: atmo.ink }]}>{model.welcomeBack ?? model.greeting}</Text>
      </Animated.View>

      <Animated.View style={[{ marginTop: 28 }, focusStyle]}>
        <FocusCard focus={model.focus} atmo={atmo} onStart={onStart} onQuickDone={onQuickDone} />
      </Animated.View>

      {/* The quiet progress bridge — today's action tied to the next scan. */}
      <Text style={[rType.throughline, { color: atmo.muted, marginTop: 22 }]}>{model.progressBridge}</Text>

      {adaptive ? (
        <View style={[styles.adaptive, { borderColor: atmo.hairline, backgroundColor: atmo.chip }]}>
          <Text style={[rType.label, { color: atmo.faint }]}>SINCE YOUR LAST SCAN</Text>
          <Text style={[rType.throughline, { color: atmo.ink, marginTop: 8 }]}>{adaptive.line}</Text>
        </View>
      ) : null}

      {/* Everything else — pulled, one tap, never pushed. */}
      <View style={styles.links}>
        <PullLink label="Full routine" active={panel === 'full'} atmo={atmo} onPress={() => setPanel(panel === 'full' ? 'none' : 'full')} />
        <PullLink label="Consistency" active={panel === 'consistency'} atmo={atmo} onPress={() => setPanel(panel === 'consistency' ? 'none' : 'consistency')} />
        {model.commerce.anyPicks && <PullLink label="Products" active={false} atmo={atmo} onPress={onOpenBundle} />}
      </View>

      {panel === 'full' && (
        <View style={styles.panel}>
          <Text style={[rType.label, { color: atmo.faint, marginBottom: 4 }]}>{model.am.title.toUpperCase()}</Text>
          {model.am.steps.map((s) => (
            <StepRow key={s.id} step={s} atmo={atmo} showTag={false} />
          ))}
          <Text style={[rType.label, { color: atmo.faint, marginTop: 18, marginBottom: 4 }]}>{model.pm.title.toUpperCase()}</Text>
          {model.pm.steps.map((s) => (
            <StepRow key={s.id} step={s} atmo={atmo} showTag={false} />
          ))}
        </View>
      )}

      {panel === 'consistency' && (
        <View style={styles.panel}>
          <ConsistencyView
            completionDates={completionDates}
            anchor={now}
            atmo={atmo}
            streak={streak}
            milestone={adaptive?.milestone}
          />
        </View>
      )}
    </ScrollView>
  );
}

function PullLink({
  label,
  active,
  atmo,
  onPress,
}: {
  label: string;
  active: boolean;
  atmo: PeriodAtmosphere;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={styles.link}>
      <Text style={[rType.bodyMed, { color: active ? atmo.ink : atmo.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  adaptive: { marginTop: 22, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  links: { flexDirection: 'row', marginTop: 30, gap: 22 },
  link: { paddingVertical: 6 },
  panel: { marginTop: 18 },
});
