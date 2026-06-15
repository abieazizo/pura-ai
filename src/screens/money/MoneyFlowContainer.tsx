/**
 * MoneyFlowContainer — the PRODUCTION integration point for the money flow.
 * Reached from "Build my routine" after Your Skin. It:
 *   1. reuses the MEMOISED plain-language read for this photo (the analyzing
 *      screen already computed it — a cache hit, no second API call),
 *   2. runs the full money flow (tailoring → routine → confirm → buy → account),
 *   3. on Confirm-lock, COMMITS the chosen products AS the canonical routine
 *      (useRoutineStore.completeBuild → lifecycle active) so Home + the ritual
 *      show exactly what the user picked — the recommendation IS the routine,
 *   4. hands off to the Routine tab when done.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { readSkinFromPhoto } from '@/api/skinRead';
import { useAppStore } from '@/store/useAppStore';
import { useRoutineStore } from '@/state/routine/routineStore';
import type { SkinReadOutcome } from '@/types/skinRead';
import { AssistantAuroraOrb } from '@/screens/assistant/AssistantAuroraOrb';
import { MoneyFlow } from './MoneyFlow';
import { routineFromSelection } from './toRoutine';
import { money, SERIF } from './theme';

export interface MoneyFlowContainerProps {
  scanId: string;
  photoUri: string;
  /** Flow finished → focus the Routine tab (or close the modal). */
  onDone: () => void;
}

export function MoneyFlowContainer({ scanId, photoUri, onDone }: MoneyFlowContainerProps) {
  const [outcome, setOutcome] = useState<SkinReadOutcome>({ status: 'pending' });
  const reqId = useRef(0);
  const goal = useAppStore.getState().goal ?? undefined;

  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    // Cache hit in the live flow (Your Skin already ran it); fetches only if
    // the user deep-linked straight here.
    readSkinFromPhoto({ photoUri, signal: ctrl.signal, goal })
      .then((o) => { if (reqId.current === id) setOutcome(o); })
      .catch(() => { if (reqId.current === id) setOutcome({ status: 'service_error', message: 'read failed' }); });
    return () => ctrl.abort();
  }, [photoUri, goal]);

  const read = outcome.status === 'ready' || outcome.status === 'bad_photo' ? outcome.read : null;
  if (!read) {
    return (
      <View style={styles.beat}>
        <StatusBar style="dark" />
        <AssistantAuroraOrb state="thinking" size={64} scanTone="balanced" />
        <Text style={styles.beatText}>Shaping your routine…</Text>
      </View>
    );
  }

  return (
    <MoneyFlow
      read={read}
      goal={goal}
      hasAccount={!!useAppStore.getState().user}
      onLock={(lines) => {
        // THE LOCK — the chosen products become the routine, committed exactly
        // like the legacy ceremony (completeBuild → active), so Home + ritual
        // read a real, populated routine of what the user actually picked.
        const routine = routineFromSelection(lines, scanId, new Date().toISOString());
        const store = useRoutineStore.getState();
        store.completeBuild(routine);
        store.setLifecycle('active');
      }}
      onDone={onDone}
    />
  );
}

const styles = StyleSheet.create({
  beat: { flex: 1, backgroundColor: money.bg, alignItems: 'center', justifyContent: 'center', gap: 18 },
  beatText: { fontFamily: SERIF, fontSize: 22, color: money.ink },
});
