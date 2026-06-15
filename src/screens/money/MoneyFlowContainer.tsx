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
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [attempt, setAttempt] = useState(0);
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
  }, [photoUri, goal, attempt]);

  const retry = () => { setOutcome({ status: 'pending' }); setAttempt((a) => a + 1); };

  // Still working → calm loading beat.
  if (outcome.status === 'pending') {
    return (
      <View style={styles.beat}>
        <StatusBar style="dark" />
        <AssistantAuroraOrb state="thinking" size={64} scanTone="balanced" />
        <Text style={styles.beatText}>Shaping your routine…</Text>
      </View>
    );
  }

  // A read we can build on (bad_photo carries a gentle starting read too).
  const read = outcome.status === 'ready' || outcome.status === 'bad_photo' ? outcome.read : null;

  // Terminal outcome with NO read (service error, or a blocked photo with no
  // fallback read). NEVER strand the user on an endless spinner — give them an
  // honest recovery: try again, or step out with their routine untouched.
  if (!read) {
    return (
      <View style={styles.beat}>
        <StatusBar style="dark" />
        <AssistantAuroraOrb state="idle" size={64} scanTone="balanced" />
        <Text style={styles.beatTitle}>I couldn’t shape your routine just now.</Text>
        <Text style={styles.beatBody}>The read didn’t come through — it’s not you. Let’s try once more.</Text>
        <Pressable onPress={retry} accessibilityRole="button" accessibilityLabel="Try again"
          style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.9 : 1 }]}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Not now"
          style={styles.notNow}>
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
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
  beat: { flex: 1, backgroundColor: money.bg, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  beatText: { fontFamily: SERIF, fontSize: 22, color: money.ink },
  beatTitle: { fontFamily: SERIF, fontSize: 26, lineHeight: 30, color: money.ink, textAlign: 'center', letterSpacing: -0.3 },
  beatBody: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22, color: money.muted, textAlign: 'center', maxWidth: 300 },
  retry: { minHeight: 52, borderRadius: 999, backgroundColor: money.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 8 },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' },
  notNow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontFamily: 'Inter-Medium', fontSize: 15, color: money.muted },
});
