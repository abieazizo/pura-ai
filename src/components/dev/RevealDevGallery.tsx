/**
 * Dev-only gallery for the post-scan reveal arc (screens 1–6).
 *
 * Param-driven so the web preview harness can jump straight to any surface
 * pixel-clean — `window.__pura_nav__.navigate('ScanRevealDev', { surface: 3 })`
 * — with no overlay chrome polluting the screenshot. With no param it shows a
 * tappable index for on-device browsing.
 *
 * Every surface is fed the dev REVEAL_FIXTURE SkinState; these fixtures are
 * NEVER used by production paths.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ArrowLeft } from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { puraReveal, puraRevealType } from '@/theme/tokens';
import { REVEAL_FIXTURE } from '@/screens/scan/reveal/revealFixture';
import { ScanRevealScreen } from '@/screens/scan/reveal/ScanRevealScreen';
import { RevealAnalyzingSlide } from '@/screens/scan/reveal/RevealAnalyzingSlide';
import { ScanBuildCeremony } from '@/screens/scan/reveal/ScanBuildCeremony';
import { RoutineLandingView } from '@/screens/scan/reveal/RoutineLandingView';
import {
  buildCeremonyRoutine,
  buildSingleStep,
} from '@/services/routine/routineBuilderService';
import {
  pillarKeyToStepType,
  type CustomRoutine,
  type PillarKey,
  type RoutineTimeOfDay,
} from '@/types/routine';

type Surface = 1 | 2 | 3 | 4 | 5 | 6 | 'pager' | 'ceremony' | 'routine';
type Nav = NativeStackNavigationProp<RootStackParamList, 'ScanRevealDev'>;
type Rt = RouteProp<RootStackParamList, 'ScanRevealDev'>;

const ITEMS: ReadonlyArray<{ surface: Surface; label: string; hint: string }> = [
  { surface: 1, label: '1 · Analyzing', hint: 'AI Skin Analysis in progress' },
  { surface: 2, label: '2 · Skin Map', hint: 'Zones + concern chips' },
  { surface: 3, label: '3 · Top Focus Areas', hint: 'Three priority cards' },
  { surface: 4, label: '4 · Personalized Insights', hint: 'Sparkle disc + 3 cards' },
  { surface: 5, label: '5 · Your Skin Plan', hint: 'Four pillars · starts tonight' },
  { surface: 6, label: '6 · Ready when you are', hint: 'Build my routine CTA' },
  { surface: 'ceremony', label: '7 · Build Ceremony', hint: '~13s build · 4 pillars resolve' },
  { surface: 'routine', label: '8 · Routine (populated)', hint: '4 pillars · check off · why' },
  { surface: 'pager', label: 'Full pager (from 2)', hint: 'Walk 2→6 with Next' },
];

export function RevealDevGallery() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const surface = route.params?.surface;

  const toIndex = () => nav.setParams({ surface: undefined });
  const onBuild = () => nav.setParams({ surface: 'ceremony' });
  const noop = () => {};

  // Surface 8 renders the populated landing page off a deterministic routine
  // (no scan / store needed) with fully local, mutable state so the dev
  // surface is interactive in isolation — reorder, remove, add, complete.
  const [devRoutine, setDevRoutine] = React.useState<CustomRoutine>(() =>
    buildCeremonyRoutine({ scanId: 'dev-routine-scan' }),
  );
  const [devTimeOfDay, setDevTimeOfDay] = React.useState<RoutineTimeOfDay>('evening');
  const [devDone, setDevDone] = React.useState<{ morning: string[]; evening: string[] }>({
    morning: [],
    evening: [],
  });

  const devReorder = (from: number, to: number) =>
    setDevRoutine((r) => {
      const steps = devTimeOfDay === 'morning' ? r.morningSteps : r.eveningSteps;
      if (from < 0 || to < 0 || from >= steps.length || to >= steps.length || from === to) {
        return r;
      }
      const arr = steps.slice();
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      const renum = arr.map((s, i) => ({ ...s, order: i + 1 }));
      return devTimeOfDay === 'morning'
        ? { ...r, morningSteps: renum }
        : { ...r, eveningSteps: renum };
    });

  const devRemove = (stepId: string) =>
    setDevRoutine((r) => {
      const steps = devTimeOfDay === 'morning' ? r.morningSteps : r.eveningSteps;
      const next = steps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 }));
      return devTimeOfDay === 'morning'
        ? { ...r, morningSteps: next }
        : { ...r, eveningSteps: next };
    });

  const devAdd = (pillar: PillarKey) =>
    setDevRoutine((r) => {
      const steps = devTimeOfDay === 'morning' ? r.morningSteps : r.eveningSteps;
      if (steps.some((s) => s.type === pillarKeyToStepType(pillar))) return r;
      const next = [...steps, buildSingleStep(pillar, devTimeOfDay)].map((s, i) => ({
        ...s,
        order: i + 1,
      }));
      return devTimeOfDay === 'morning'
        ? { ...r, morningSteps: next }
        : { ...r, eveningSteps: next };
    });

  const devToggle = (stepId: string) =>
    setDevDone((d) => {
      const list = devTimeOfDay === 'morning' ? d.morning : d.evening;
      const next = list.includes(stepId)
        ? list.filter((x) => x !== stepId)
        : [...list, stepId];
      return devTimeOfDay === 'morning' ? { ...d, morning: next } : { ...d, evening: next };
    });

  if (surface === 1) {
    return <RevealAnalyzingSlide stage="ai_result_returned" onCancel={toIndex} />;
  }
  if (surface === 'ceremony') {
    return (
      <ScanBuildCeremony
        scanId="dev-ceremony-scan"
        onComplete={toIndex}
        onHowItWorks={toIndex}
      />
    );
  }
  if (surface === 'routine') {
    return (
      <RoutineLandingView
        routine={devRoutine}
        timeOfDay={devTimeOfDay}
        onChangeTimeOfDay={setDevTimeOfDay}
        doneIds={devTimeOfDay === 'morning' ? devDone.morning : devDone.evening}
        onToggleComplete={devToggle}
        onReorder={devReorder}
        onRemoveStep={devRemove}
        onAddStep={devAdd}
        onHowItWorks={toIndex}
      />
    );
  }
  if (surface === 2 || surface === 3 || surface === 4 || surface === 5 || surface === 6) {
    // `key` forces a remount when the surface param changes — the pager seeds
    // its step from `initialStep` only at mount, so without this a param jump
    // (2→3) would keep showing the old step.
    return (
      <ScanRevealScreen
        key={`reveal-${surface}`}
        skinState={REVEAL_FIXTURE}
        initialStep={surface - 2}
        onExit={toIndex}
        onBuildRoutine={onBuild}
        onSkip={toIndex}
      />
    );
  }
  if (surface === 'pager') {
    return (
      <ScanRevealScreen
        skinState={REVEAL_FIXTURE}
        initialStep={0}
        onExit={toIndex}
        onBuildRoutine={onBuild}
        onSkip={toIndex}
      />
    );
  }

  // Index
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} weight="bold" color={puraReveal.ink} />
        </Pressable>
        <Text style={[puraRevealType.cardTitle, { color: puraReveal.ink }]}>
          Reveal Arc · Dev Gallery
        </Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {ITEMS.map((item) => (
          <Pressable
            key={String(item.surface)}
            onPress={() => nav.setParams({ surface: item.surface })}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: puraReveal.porcelain }]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            nativeID={`reveal-surface-${item.surface}`}
          >
            <Text style={[puraRevealType.concernName, { color: puraReveal.ink }]}>{item.label}</Text>
            <Text style={[puraRevealType.body, { color: puraReveal.muted, marginTop: 2 }]}>
              {item.hint}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: puraReveal.bg },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraReveal.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: puraReveal.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: puraReveal.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraReveal.border,
  },
});
