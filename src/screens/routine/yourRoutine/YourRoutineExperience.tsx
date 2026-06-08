/**
 * YourRoutineExperience — the host that holds the three modes together.
 *
 * It mounts the AuroraOrb ONCE (via OrbProvider, birth=false) so the orb is a
 * persistent shared element: it glides — never re-mounts — across the reveal
 * morph, the daily home, and the guided ritual. The atmosphere is the other
 * persistent layer; only the mode content cross-dissolves between them, so the
 * orb and the surface flow continuously while the screens change underneath.
 *
 * Mode routing:
 *   reveal ──Start──▶ ritual ──done──▶ home
 *   home   ──Start──▶ ritual ──done──▶ home
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
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
import { HomeMode } from './modes/HomeMode';
import { RitualMode } from './modes/RitualMode';
import { createVoiceGuide } from './voiceGuidance';

export type ExperienceMode = 'reveal' | 'home' | 'ritual';

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
  /** Ritual finished — mark today's steps complete (store wiring in the app). */
  onRitualComplete?: () => void;
}

export function YourRoutineExperience(props: YourRoutineExperienceProps) {
  const period: RoutinePeriod = props.model.period;
  const atmo = ROUTINE_ATMOSPHERE[period];
  const aura = period === 'dawn' || period === 'midday' ? 'blue-warm' : 'violet-cool';

  const initial: ExperienceMode = props.initialMode ?? 'home';
  const initialTarget =
    initial === 'home'
      ? { cx: 54, cy: 84, size: 60 }
      : { cx: 200, cy: 88, size: initial === 'ritual' ? 80 : 74 }; // re-placed precisely by the mode on mount

  return (
    <OrbProvider
      birth={false}
      dark={atmo.dark}
      auraTheme={aura}
      reduceMotion={props.reduceMotion}
      initialTarget={initialTarget}
    >
      <StatusBar style={atmo.dark ? 'light' : 'dark'} />
      <ExperienceInner {...props} period={period} />
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
  period,
}: YourRoutineExperienceProps & { period: RoutinePeriod }) {
  const atmo = ROUTINE_ATMOSPHERE[period];
  const [mode, setMode] = useState<ExperienceMode>(initialMode ?? 'home');
  const [showBundle, setShowBundle] = useState(false);

  const fade = useSharedValue(1);
  const intensify = useSharedValue(0);
  const voice = useMemo(
    () => createVoiceGuide({ speak: voiceSpeak, enabled: voiceStartEnabled }),
    [voiceSpeak, voiceStartEnabled],
  );

  function go(next: ExperienceMode) {
    if (reduceMotion) {
      setMode(next);
      return;
    }
    const dur = next === 'ritual' ? routineTiming.ritualEnter : routineTiming.homeDissolve;
    const swap = (n: ExperienceMode) => {
      setMode(n);
      fade.value = withTiming(1, { duration: dur * 0.6 });
    };
    fade.value = withTiming(0, { duration: dur * 0.5 }, (fin) => {
      if (fin) runOnJS(swap)(next);
    });
  }

  function finishRitual() {
    onRitualComplete?.();
    go('home');
  }

  const modeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View style={[styles.fill, { backgroundColor: atmo.sky[0] }]}>
      <Atmosphere period={period} reduceMotion={reduceMotion} intensify={intensify} />

      <Animated.View style={[styles.fill, modeStyle]}>
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
            onStart={() => go('ritual')}
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
            onToggleVoice={() => {}}
            onFinish={finishRitual}
          />
        )}
      </Animated.View>

      {showBundle && model.commerce.bundle && (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowBundle(false)} accessibilityLabel="Close" />
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 10, 15, 0.42)',
  },
  sheetWrap: { padding: 16 },
});
