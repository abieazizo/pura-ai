/**
 * RoutineFlowDevHarness — drives the two-act RoutineFlow for verification.
 *
 * Builds a deterministic model from the shared fixtures and renders the real
 * RoutineFlow (overview → descent → ritual → completion). Translucent dev chrome
 * toggles reduce-motion, time-of-day, and the rescan variant; a `window.__puraRF`
 * API lets preview_eval drive config + read the completion result programmatically
 * (orb screens hang screenshots — verify via eval + bundle grep + the live DOM).
 *
 * Loaded by setting `localStorage.__pura_routineflow__ = '1'` — no nav edits.
 * Dev-only; nothing here ships in the live flow.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoutineTimeOfDay } from '@/types/routine';
import { buildYourRoutineModel } from '../model';
import { RoutineFlow } from './RoutineFlow';
import {
  demoRoutine,
  demoFindings,
  demoMoves,
  rescanFindings,
  adaptiveAfterRescan,
} from '../fixtures';

export function RoutineFlowDevHarness() {
  const [tod, setTod] = useState<RoutineTimeOfDay>('morning');
  const [rm, setRm] = useState(false);
  const [rescan, setRescan] = useState(false);
  const [done, setDone] = useState<string[] | null>(null);

  const now = useMemo(() => new Date(), []);

  const model = useMemo(
    () =>
      buildYourRoutineModel({
        routine: demoRoutine,
        findings: rescan ? rescanFindings : demoFindings,
        moves: demoMoves,
        timeOfDay: tod,
        now,
        streak: { count: 5, includesToday: true },
        doneIds: [],
        daysSinceLastUse: rescan ? 4 : 0,
        calmerLately: rescan,
      }),
    [tod, rescan, now],
  );

  // Programmatic control + proof read-out for preview_eval verification.
  useEffect(() => {
    (window as unknown as { __puraRF?: unknown }).__puraRF = {
      setTod,
      setRm,
      setRescan,
      state: { tod, rm, rescan },
      lastDone: done,
    };
  }, [tod, rm, rescan, done]);

  // Remount on config that legitimately needs a fresh tree (tod / rm / rescan).
  const key = `${tod}-${rm}-${rescan}`;

  return (
    <View style={styles.fill}>
      <RoutineFlow
        key={key}
        model={model}
        reduceMotion={rm}
        now={now}
        onComplete={(ids) => {
          (window as unknown as { __puraRFDone?: string[] }).__puraRFDone = ids;
          setDone(ids);
        }}
        onRescanBridge={() => {
          (window as unknown as { __puraRFRescan?: boolean }).__puraRFRescan = true;
        }}
      />

      <View style={styles.panel} pointerEvents="box-none">
        <View style={styles.row}>
          <Group label="tod">
            {(['morning', 'evening'] as RoutineTimeOfDay[]).map((t) => (
              <Chip key={t} on={tod === t} label={t} onPress={() => setTod(t)} />
            ))}
          </Group>
          <Group label="flags">
            <Chip on={rm} label="reduce-motion" onPress={() => setRm((v) => !v)} />
            <Chip on={rescan} label="rescan" onPress={() => setRescan((v) => !v)} />
          </Group>
          {done && (
            <Text style={styles.log} nativeID="rf-done">
              done: {done.length ? done.join(', ') : '(none)'}
            </Text>
          )}
        </View>
        <Text style={styles.note}>
          set localStorage.__pura_routineflow__='1' · adaptive: {rescan ? adaptiveAfterRescan.milestone : 'off'}
        </Text>
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, on && styles.chipOn]}
    >
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
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  group: { marginRight: 8 },
  groupLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: 1, marginLeft: 4, marginBottom: 4, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.92)' },
  chipText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  chipTextOn: { color: '#0A0B12', fontWeight: '600' },
  log: { color: 'rgba(255,255,255,0.85)', fontSize: 11, alignSelf: 'center' },
  note: { color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 8, marginLeft: 4 },
});
