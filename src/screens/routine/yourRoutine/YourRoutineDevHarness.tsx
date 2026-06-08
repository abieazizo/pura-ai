/**
 * YourRoutineDevHarness — drives the whole experience for verification.
 *
 * Switches mode (reveal / home / ritual), period (dawn / midday / dusk / night),
 * AM/PM, reduced motion, and the rescan→adaptive variant. Renders the composed
 * haptic log, the copy-voice lint (every static + generated line checked against
 * the hard rules), and the injected voice-guidance log. Also exposes a
 * `window.__puraYR` API so the configuration can be driven and the proof read
 * programmatically via preview_eval (orb screens hang screenshots).
 *
 * Loaded by setting `localStorage.__pura_yourroutine_harness__ = '1'` — no
 * navigation edits required.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RoutinePeriod } from '@/theme/routineAtmosphere';
import type { RoutineTimeOfDay } from '@/types/routine';
import { buildYourRoutineModel, type YourRoutineModel } from './model';
import { YourRoutineExperience, type ExperienceMode } from './YourRoutineExperience';
import {
  demoRoutine,
  demoFindings,
  demoMoves,
  rescanFindings,
  adaptiveAfterRescan,
  recentCompletionDates,
} from './fixtures';
import { allStaticVoiceLines, lintVoice, VOICE_RULES, type VoiceViolation } from './voice';
import { getHapticLog } from './ritualHaptics';
import { makeLoggingSpeak } from './voiceGuidance';

function collectModelCopy(m: YourRoutineModel): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [
    { label: 'greeting', text: m.greeting },
    { label: 'firstReveal', text: m.firstReveal },
    { label: 'productFree', text: m.productFree },
    { label: 'progressBridge', text: m.progressBridge },
    { label: 'doneLanding', text: m.doneLandingLine },
    { label: 'focus.prompt', text: m.focus.prompt },
  ];
  if (m.welcomeBack) out.push({ label: 'welcomeBack', text: m.welcomeBack });
  m.moves.forEach((mv, i) => {
    out.push({ label: `move${i}.title`, text: mv.title });
    out.push({ label: `move${i}.why`, text: mv.why });
  });
  [...m.am.steps, ...m.pm.steps].forEach((s) => {
    out.push({ label: `${s.id}.throughline`, text: s.throughline });
    out.push({ label: `${s.id}.lead`, text: s.ritualLead });
    out.push({ label: `${s.id}.benefit`, text: s.benefit });
  });
  if (m.commerce.bundle) {
    out.push({ label: 'bundle.intro', text: m.commerce.bundle.intro });
    m.commerce.bundle.items.forEach((it) => out.push({ label: `bundle.${it.id}.why`, text: it.why }));
    out.push({ label: 'bundle.alsoFree', text: m.commerce.bundle.alsoFree });
  }
  return out;
}

function runLint(model: YourRoutineModel): { total: number; violations: { label: string; text: string; v: VoiceViolation[] }[] } {
  const lines = [...allStaticVoiceLines(), ...collectModelCopy(model)];
  const violations = lines
    .map((l) => ({ ...l, v: lintVoice(l.text) }))
    .filter((l) => l.v.length > 0);
  return { total: lines.length, violations };
}

export function YourRoutineDevHarness() {
  const [mode, setMode] = useState<ExperienceMode>('reveal');
  const [period, setPeriod] = useState<RoutinePeriod>('dawn');
  const [tod, setTod] = useState<RoutineTimeOfDay>('morning');
  const [rm, setRm] = useState(false);
  const [rescan, setRescan] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [, force] = useState(0);

  const voiceMock = useRef(makeLoggingSpeak());
  const now = useMemo(() => new Date(), []);
  const completionDates = useMemo(() => recentCompletionDates(now), [now]);

  const model = useMemo<YourRoutineModel>(() => {
    const built = buildYourRoutineModel({
      routine: demoRoutine,
      findings: rescan ? rescanFindings : demoFindings,
      moves: demoMoves,
      timeOfDay: tod,
      now,
      streak: { count: 5, includesToday: true },
      doneIds: [],
      daysSinceLastUse: rescan ? 4 : 0,
      calmerLately: rescan,
    });
    return { ...built, period }; // force the period so every atmosphere is reachable
  }, [period, tod, rescan, now]);

  const lint = useMemo(() => runLint(model), [model]);

  // Expose a programmatic API for preview_eval-driven verification.
  useEffect(() => {
    (window as unknown as { __puraYR?: unknown }).__puraYR = {
      setMode,
      setPeriod,
      setTod,
      setRm,
      setRescan,
      setVoiceOn,
      getHapticLog: () => getHapticLog(),
      getLint: () => runLint(model),
      getVoiceLog: () => voiceMock.current.log.slice(),
      state: { mode, period, tod, rm, rescan, voiceOn },
    };
  }, [model, mode, period, tod, rm, rescan, voiceOn]);

  const expKey = `${mode}-${period}-${tod}-${rm}-${rescan}-${voiceOn}`;
  const haptic = getHapticLog();

  return (
    <View style={styles.fill}>
      <YourRoutineExperience
        key={expKey}
        model={model}
        reduceMotion={rm}
        initialMode={mode}
        now={now}
        completionDates={completionDates}
        streak={{ count: 5, includesToday: true }}
        adaptive={rescan ? { line: adaptiveAfterRescan.line, milestone: adaptiveAfterRescan.milestone } : null}
        voiceSpeak={voiceMock.current.speak}
        voiceStartEnabled={voiceOn}
        onQuickDone={() => force((n) => n + 1)}
        onRitualComplete={() => force((n) => n + 1)}
      />

      {/* Dev chrome — translucent, above the experience. */}
      <View style={styles.panel} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Group label="mode">
            {(['reveal', 'home', 'ritual'] as ExperienceMode[]).map((m) => (
              <Chip key={m} on={mode === m} label={m} onPress={() => setMode(m)} />
            ))}
          </Group>
          <Group label="period">
            {(['dawn', 'midday', 'dusk', 'night'] as RoutinePeriod[]).map((p) => (
              <Chip key={p} on={period === p} label={p} onPress={() => setPeriod(p)} />
            ))}
          </Group>
          <Group label="tod">
            {(['morning', 'evening'] as RoutineTimeOfDay[]).map((t) => (
              <Chip key={t} on={tod === t} label={t} onPress={() => setTod(t)} />
            ))}
          </Group>
          <Group label="flags">
            <Chip on={rm} label="reduce-motion" onPress={() => setRm((v) => !v)} />
            <Chip on={rescan} label="rescan" onPress={() => setRescan((v) => !v)} />
            <Chip on={voiceOn} label="voice" onPress={() => setVoiceOn((v) => !v)} />
          </Group>
        </ScrollView>

        <View style={styles.logRow}>
          <Text style={styles.logText} nativeID="yr-lint">
            voice-lint: {lint.total - lint.violations.length}/{lint.total} clean
            {lint.violations.length ? ` · ${lint.violations.length} BAD` : ' · all clean'}
          </Text>
          <Text style={styles.logText} nativeID="yr-haptic">
            haptics: {haptic.map((h) => h.weight === 'medium' ? 'M' : h.weight === 'light-light' ? '··' : h.weight === 'none' ? '_' : '·').join(' ')}
          </Text>
          <Text style={styles.logText} nativeID="yr-voice">
            voice-log: {voiceMock.current.log.length} lines
          </Text>
        </View>
        <Text style={styles.rules}>{VOICE_RULES.join(' · ')}</Text>
      </View>
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 11, 18, 0.82)',
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: { paddingHorizontal: 10, gap: 12, alignItems: 'flex-start' },
  group: { marginRight: 8 },
  groupLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: 1, marginLeft: 4, marginBottom: 4, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.92)' },
  chipText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  chipTextOn: { color: '#0A0B12', fontWeight: '600' },
  logRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 14, marginTop: 10 },
  logText: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  rules: { color: 'rgba(255,255,255,0.4)', fontSize: 9, paddingHorizontal: 14, marginTop: 8 },
});
