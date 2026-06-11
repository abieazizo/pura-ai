/**
 * YourRoutineExperience — the host that holds the three modes together.
 *
 * It mounts the AuroraOrb ONCE (via OrbProvider, birth=false) so the orb is a
 * persistent shared element: it glides — never re-mounts — across the reveal
 * morph, the daily home, and the guided ritual, breathing at the routine's
 * calmer cadence (1.02 over ~4.5s) and blinking irregularly every 4–9s. The
 * atmosphere is the other persistent layer; only the mode content
 * cross-dissolves between them.
 *
 * home → ritual is the spec's expand-to-fill: the focus card's measured
 * surface expands to the full viewport over 400ms (arrival curve) while the
 * home's surroundings fade — the card BECOMES the ritual. Coming home is a
 * gentle cross-dissolve as the orb shrinks back to its corner.
 *
 * Mode routing:
 *   reveal ──Start──▶ ritual ──done──▶ home
 *   home   ──Start──▶ ritual ──done──▶ home
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ROUTINE_ATMOSPHERE,
  routineTiming,
  type RoutinePeriod,
} from '@/theme/routineAtmosphere';
import { OrbProvider } from '@/screens/onboarding/orb/OrbHost';
import type { YourRoutineModel } from './model';
import { Atmosphere } from './components/Atmosphere';
import { HonestBundle } from './components/HonestBundle';
import { RevealMode } from './modes/RevealMode';
import { HomeMode, type CardRect } from './modes/HomeMode';
import { RitualMode } from './modes/RitualMode';
import { createVoiceGuide } from './voiceGuidance';

const ARRIVE = Easing.bezier(0.22, 1, 0.36, 1);

export type ExperienceMode = 'reveal' | 'home' | 'ritual';

/** The orb's resting size per mode — the ritual grows ~10% from wherever it
 *  came from, so the relationship is structural, not coincidental. */
const ORB_REST = { home: 60, reveal: 74 } as const;

export interface YourRoutineExperienceProps {
  model: YourRoutineModel;
  reduceMotion: boolean;
  initialMode?: ExperienceMode;
  now: Date;
  completionDates: string[];
  streak: { count: number; includesToday: boolean };
  adaptive?: { line: string; milestone: string } | null;
  /** Injected TTS for the optional voice guidance (omit for a safe no-op). */
  voiceSpeak?: (text: string) => void;
  /** Start with voice guidance already on (harness/verification only). */
  voiceStartEnabled?: boolean;
  /** Quick-done from the focus card (store toggle in the real app). */
  onQuickDone?: () => void;
  /** Ritual finished — ONLY the steps actually marked done are claimed. */
  onRitualComplete?: (completedStepIds: string[]) => void;
  /** Harness only: drive mode through the experience (no remount), so the
   *  orb's never-remount continuity is demonstrable across mode switches. */
  devModeOverride?: ExperienceMode;
}

export function YourRoutineExperience(props: YourRoutineExperienceProps) {
  const period: RoutinePeriod = props.model.period;
  const atmo = ROUTINE_ATMOSPHERE[period];
  const aura = period === 'dawn' || period === 'midday' ? 'blue-warm' : 'violet-cool';
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const initial: ExperienceMode = props.initialMode ?? 'home';
  // First frame matches the mode's mount target — no visible correction glide.
  const initialTarget = useMemo(
    () =>
      initial === 'home'
        ? { cx: insets.left + 54, cy: insets.top + 52, size: ORB_REST.home }
        : {
            cx: width / 2,
            cy: insets.top + (initial === 'ritual' ? 88 : 84),
            size: initial === 'ritual' ? Math.round(ORB_REST.home * 1.1) : ORB_REST.reveal,
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <OrbProvider
      birth={false}
      dark={atmo.dark}
      auraTheme={aura}
      reduceMotion={props.reduceMotion}
      initialTarget={initialTarget}
      blinkCadence={{ minMs: 4000, maxMs: 9000, blinkMs: 120 }}
      breathProfile={{ amplitude: 1.02, halfMs: 2250 }}
    >
      <StatusBar style={atmo.dark ? 'light' : 'dark'} />
      <ExperienceInner {...props} period={period} viewport={{ width, height }} />
    </OrbProvider>
  );
}

function ExperienceInner({
  model,
  reduceMotion,
  initialMode,
  now,
  completionDates,
  streak,
  adaptive,
  voiceSpeak,
  voiceStartEnabled,
  onQuickDone,
  onRitualComplete,
  devModeOverride,
  period,
  viewport,
}: YourRoutineExperienceProps & {
  period: RoutinePeriod;
  viewport: { width: number; height: number };
}) {
  const atmo = ROUTINE_ATMOSPHERE[period];
  const [mode, setMode] = useState<ExperienceMode>(initialMode ?? 'home');
  const [showBundle, setShowBundle] = useState(false);
  const prevMode = useRef<ExperienceMode>(initialMode ?? 'home');

  const fade = useSharedValue(1);
  const intensify = useSharedValue(0);
  // The expand-to-fill card: 0 = at its measured home rect, 1 = full screen.
  const [expandRect, setExpandRect] = useState<CardRect | null>(null);
  const expandT = useSharedValue(0);

  const voice = useMemo(
    () => createVoiceGuide({ speak: voiceSpeak, enabled: voiceStartEnabled }),
    [voiceSpeak, voiceStartEnabled],
  );

  function go(next: ExperienceMode) {
    prevMode.current = mode;
    if (reduceMotion) {
      setMode(next);
      return;
    }
    // Entering the ritual: the surround fades over the FULL 400ms (the card
    // expansion rides on top). Coming home: a gentle 520ms cross-dissolve.
    const out = next === 'ritual' ? routineTiming.ritualEnter : routineTiming.homeDissolve * 0.5;
    const inn = next === 'ritual' ? 240 : routineTiming.homeDissolve * 0.6;
    const swap = (n: ExperienceMode) => {
      setMode(n);
      fade.value = withTiming(1, { duration: inn });
    };
    fade.value = withTiming(0, { duration: out }, (fin) => {
      if (fin) runOnJS(swap)(next);
    });
  }

  /** home → ritual with the focus card expanding to fill the viewport. */
  function startRitualFromHome(rect?: CardRect) {
    if (!reduceMotion && rect) {
      setExpandRect(rect);
      expandT.value = 0;
      expandT.value = withTiming(1, { duration: routineTiming.ritualEnter, easing: ARRIVE });
    }
    go('ritual');
  }

  function finishRitual(completedStepIds: string[]) {
    onRitualComplete?.(completedStepIds);
    // Idempotent safety: the gradient never stays intensified past the ritual.
    intensify.value = reduceMotion ? 0 : withTiming(0, { duration: routineTiming.homeDissolve });
    setExpandRect(null);
    expandT.value = 0;
    go('home');
  }

  // Harness-only: switch modes through the SAME mounted experience, so the
  // orb's continuity across mode changes is real and demonstrable.
  useEffect(() => {
    if (devModeOverride && devModeOverride !== mode) {
      if (devModeOverride === 'ritual') startRitualFromHome();
      else go(devModeOverride);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devModeOverride]);

  const modeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const expandStyle = useAnimatedStyle(() => {
    if (!expandRect) return { opacity: 0 };
    const t = expandT.value;
    return {
      opacity: interpolate(t, [0, 0.12, 0.82, 1], [0, 1, 1, 0]),
      left: interpolate(t, [0, 1], [expandRect.x, 0]),
      top: interpolate(t, [0, 1], [expandRect.y, 0]),
      width: interpolate(t, [0, 1], [expandRect.width, viewport.width]),
      height: interpolate(t, [0, 1], [expandRect.height, viewport.height]),
      borderRadius: interpolate(t, [0, 1], [24, 0]),
    };
  });

  const ritualBase = prevMode.current === 'reveal' ? ORB_REST.reveal : ORB_REST.home;

  return (
    <View style={[styles.fill, { backgroundColor: atmo.sky[0] }]}>
      <Atmosphere period={period} reduceMotion={reduceMotion} intensify={intensify} />

      <Animated.View
        style={[styles.fill, modeStyle]}
        accessibilityElementsHidden={showBundle}
        importantForAccessibility={showBundle ? 'no-hide-descendants' : 'auto'}
      >
        {mode === 'reveal' && (
          <RevealMode
            model={model}
            atmo={atmo}
            reduceMotion={reduceMotion}
            onStart={() => go('ritual')}
            onOpenBundle={() => setShowBundle(true)}
          />
        )}
        {mode === 'home' && (
          <HomeMode
            model={model}
            atmo={atmo}
            reduceMotion={reduceMotion}
            now={now}
            completionDates={completionDates}
            streak={streak}
            adaptive={adaptive ?? null}
            onStart={startRitualFromHome}
            onQuickDone={() => onQuickDone?.()}
            onOpenBundle={() => setShowBundle(true)}
          />
        )}
        {mode === 'ritual' && (
          <RitualMode
            model={model}
            atmo={atmo}
            reduceMotion={reduceMotion}
            voice={voice}
            intensify={intensify}
            orbBaseSize={ritualBase}
            onToggleVoice={() => {}}
            onFinish={finishRitual}
          />
        )}
      </Animated.View>

      {/* The focus card's surface expanding to fill — the card becomes the
          ritual. Pure overlay; zero layout cost. */}
      {expandRect && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.expandCard,
            { backgroundColor: atmo.card, borderColor: atmo.hairline },
            expandStyle,
          ]}
        />
      )}

      {showBundle && model.commerce.bundle && (
        <View style={styles.overlay} accessibilityViewIsModal>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowBundle(false)}
            accessibilityRole="button"
            accessibilityLabel="Close products"
          />
          <View style={styles.sheetWrap} pointerEvents="box-none">
            <HonestBundle bundle={model.commerce.bundle} atmo={atmo} onClose={() => setShowBundle(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  expandCard: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 10, 15, 0.42)',
  },
  sheetWrap: { padding: 16 },
});
