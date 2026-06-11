/**
 * HomeMode (Mode B) — the daily home. Time-aware and serene.
 *
 * The screen IS the time of day (the atmosphere is owned by the host). On
 * open, the orb settles above-left with its gaze low, then NOTICES you: a soft
 * held brighten (+10%) as the gaze lifts to the viewer and the greeting fades
 * up like the first line of a letter; the one focus card rises in (y +12→0,
 * 420ms). While idle the orb lives — slow breath, irregular 4–9s blinks (set
 * at the provider), and an OCCASIONAL gaze drift every 9–15s, resting between.
 *
 * The DEFAULT is a single next action — never the whole list. A guilt-free
 * welcome-back replaces the greeting after a gap. The progress bridge ties
 * today to the next scan. Full routine, consistency, and products are one
 * quiet tap down — pulled, never pushed.
 *
 * Starting the ritual: the surroundings fade over 400ms while the host
 * expands the focus card's measured surface to fill — the card becomes the
 * ritual.
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

const ARRIVE = Easing.bezier(0.22, 1, 0.36, 1);

export interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HomeModeProps {
  model: YourRoutineModel;
  atmo: PeriodAtmosphere;
  reduceMotion: boolean;
  now: Date;
  completionDates: string[];
  streak: { count: number; includesToday: boolean };
  /** Start the ritual — `cardRect` lets the host expand the focus card. */
  onStart: (cardRect?: CardRect) => void;
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
  const exitT = useSharedValue(1); // surroundings → 0 as the ritual opens
  const did = useRef(false);
  const cardWrapRef = useRef<View>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    // The orb settles above-left of the greeting, gaze low — it hasn't
    // noticed you yet.
    orb.moveTo({ cx: insets.left + 54, cy: insets.top + 52, size: 60 }, { spring: ORB_RITUAL_SPRING });
    orb.setExpression('warm');
    orb.setGlowTemperature(0.2, 500);
    if (did.current) return;
    did.current = true;
    ritualHaptics.silence('morning greeting'); // the greeting is silent, by design

    if (reduceMotion) {
      orb.setGaze('forward');
      return;
    }
    orb.gazeTo(0, 0.5);
    // The "noticing you" beat — after the glide settles: a soft held brighten,
    // the gaze lifts to the viewer, the greeting fades up like a letter.
    later(() => {
      orb.brightenOnce(0.1, 900);
      orb.setGaze('forward');
      greetingT.value = withTiming(1, { duration: routineTiming.noticingBeat, easing: ARRIVE });
      focusT.value = withDelay(140, withTiming(1, { duration: routineTiming.focusRise, easing: ARRIVE }));
    }, 380);

    // Occasional gaze drift — drifts for ~1.8s every 9–15s, rests between.
    let cancelled = false;
    const drift = () => {
      if (cancelled) return;
      const dir = Math.random() < 0.5 ? -0.5 : 0.5;
      orb.gazeTo(dir, 0.08);
      later(() => {
        if (!cancelled) orb.gazeTo(0, 0);
      }, 1800);
      later(drift, 9000 + Math.random() * 6000);
    };
    later(drift, 9000 + Math.random() * 6000);

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Start the ritual: surroundings fade over the full 400ms while the host
   *  expands the measured card surface to fill. */
  function handleStart() {
    if (reduceMotion) {
      onStart();
      return;
    }
    exitT.value = withTiming(0, { duration: routineTiming.ritualEnter, easing: Easing.in(Easing.quad) });
    const node = cardWrapRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        onStart(width > 0 ? { x, y, width, height } : undefined);
      });
    } else {
      onStart();
    }
  }

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingT.value * exitT.value,
    transform: [{ translateY: (1 - greetingT.value) * 8 }],
  }));
  const focusStyle = useAnimatedStyle(() => ({
    opacity: focusT.value,
    transform: [{ translateY: (1 - focusT.value) * 12 }],
  }));
  const surroundStyle = useAnimatedStyle(() => ({ opacity: exitT.value }));

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{ paddingTop: insets.top + 120, paddingHorizontal: 24, paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={greetingStyle}>
        <Text style={[rType.letter, { color: atmo.ink }]} maxFontSizeMultiplier={1.3}>
          {model.welcomeBack ?? model.greeting}
        </Text>
      </Animated.View>

      <Animated.View style={[{ marginTop: 28 }, focusStyle]}>
        <View ref={cardWrapRef} collapsable={false}>
          <FocusCard focus={model.focus} atmo={atmo} onStart={handleStart} onQuickDone={onQuickDone} />
        </View>
      </Animated.View>

      <Animated.View style={surroundStyle}>
        {/* The quiet progress bridge — today's action tied to the next scan. */}
        <Text style={[rType.throughline, { color: atmo.muted, marginTop: 22 }]} maxFontSizeMultiplier={1.3}>
          {model.progressBridge}
        </Text>

        {adaptive ? (
          <View style={[styles.adaptive, { borderColor: atmo.hairline, backgroundColor: atmo.chip }]}>
            <Text style={[rType.label, { color: atmo.faint }]} maxFontSizeMultiplier={1.2}>
              SINCE YOUR LAST SCAN
            </Text>
            <Text style={[rType.throughline, { color: atmo.ink, marginTop: 8 }]} maxFontSizeMultiplier={1.3}>
              {adaptive.line}
            </Text>
          </View>
        ) : null}

        {/* Everything else — pulled, one tap, never pushed. */}
        <View style={styles.links}>
          <PullLink
            label="Full routine"
            active={panel === 'full'}
            expandable
            atmo={atmo}
            onPress={() => setPanel(panel === 'full' ? 'none' : 'full')}
          />
          <PullLink
            label="Consistency"
            active={panel === 'consistency'}
            expandable
            atmo={atmo}
            onPress={() => setPanel(panel === 'consistency' ? 'none' : 'consistency')}
          />
          {model.commerce.anyPicks && (
            <PullLink label="Products" active={false} atmo={atmo} onPress={onOpenBundle} />
          )}
        </View>

        {panel === 'full' && (
          <PanelFade reduceMotion={reduceMotion}>
            <Text style={[rType.label, { color: atmo.faint, marginBottom: 4 }]} maxFontSizeMultiplier={1.2}>
              {model.am.title.toUpperCase()}
            </Text>
            {model.am.steps.map((s) => (
              <StepRow key={s.id} step={s} atmo={atmo} showTag={false} />
            ))}
            <Text style={[rType.label, { color: atmo.faint, marginTop: 18, marginBottom: 4 }]} maxFontSizeMultiplier={1.2}>
              {model.pm.title.toUpperCase()}
            </Text>
            {model.pm.steps.map((s) => (
              <StepRow key={s.id} step={s} atmo={atmo} showTag={false} />
            ))}
          </PanelFade>
        )}

        {panel === 'consistency' && (
          <PanelFade reduceMotion={reduceMotion}>
            <ConsistencyView
              completionDates={completionDates}
              anchor={now}
              atmo={atmo}
              streak={streak}
              milestone={adaptive?.milestone}
            />
          </PanelFade>
        )}
      </Animated.View>
    </ScrollView>
  );
}

/** Pulled content arrives gently — a small fade + rise, never a pop. */
function PanelFade({ reduceMotion, children }: { reduceMotion: boolean; children: React.ReactNode }) {
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) t.value = withTiming(1, { duration: 240, easing: ARRIVE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 8 }],
  }));
  return <Animated.View style={[styles.panel, style]}>{children}</Animated.View>;
}

function PullLink({
  label,
  active,
  expandable,
  atmo,
  onPress,
}: {
  label: string;
  active: boolean;
  expandable?: boolean;
  atmo: PeriodAtmosphere;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={expandable ? { expanded: active } : undefined}
      style={styles.link}
    >
      <Text style={[rType.bodyMed, { color: active ? atmo.ink : atmo.muted }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
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
