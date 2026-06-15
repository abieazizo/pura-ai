/**
 * ConfirmScreen — money flow step 4. "Here's your routine, and here's what
 * you're getting." The daily plan AND the basket + real total in ONE moment.
 * This is where the routine LOCKS (onLock fires with the chosen plan). A clear
 * "Get these" (the swappable buy backend) and a quiet, equal-footing "I'll do
 * it with what I have" product-free path. The affiliate disclosure sits under
 * the button — never hidden.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AssistantAuroraOrb } from '@/screens/assistant/AssistantAuroraOrb';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { CommerceSku } from '@/commerce/types';
import type { SelectedLine } from './YourRoutineScreen';
import { activeBuyBackend, type BuyItem } from './buyHandoff';
import { money, cardShadow, SERIF } from './theme';

const fmt = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;
const STEP_ORDER = ['cleanse', 'treat', 'moisturize', 'protect'];
const STEP_WORD: Record<string, string> = { cleanse: 'Cleanse', treat: 'Treat', moisturize: 'Moisturize', protect: 'Protect' };

interface Resolved { step: string; time: string; sku: CommerceSku; }

export interface ConfirmScreenProps {
  lines: SelectedLine[];
  /** The flow container hoists ONE persistent orb; we reserve its space. */
  hideOrb?: boolean;
  /** Fires the instant the user commits — the routine is LOCKED here. */
  onLock: (plan: Resolved[]) => void;
  onBought: (result: { opened: number }) => void;
  onProductFree: () => void;
}

export function ConfirmScreen({ lines, hideOrb = false, onLock, onBought, onProductFree }: ConfirmScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const resolved: Resolved[] = useMemo(() => {
    return lines
      .filter((l) => l.selected && l.slot.pick)
      .map((l) => {
        const sku = l.chosenId === l.slot.budgetAlternative?.sku.id ? l.slot.budgetAlternative!.sku : l.slot.pick!.sku;
        return { step: l.slot.step, time: l.slot.time, sku };
      })
      .sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));
  }, [lines]);

  const total = resolved.reduce((t, r) => t + r.sku.priceUsd, 0);
  const am = resolved.filter((r) => r.time === 'AM' || r.time === 'both');
  const pm = resolved.filter((r) => (r.time === 'PM' || r.time === 'both') && r.step !== 'protect');

  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.delay(70 * i).springify().damping(18).stiffness(140);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    onLock(resolved); // lock FIRST — the plan is theirs whether or not the handoff opens
    const items: BuyItem[] = resolved.map((r) => ({ sku: r.sku }));
    const res = await activeBuyBackend.checkout(items);
    setBusy(false);
    // If NOTHING opened (popup blocked / handoff failed), don't pretend it
    // worked — keep them here with an honest retry. The routine is still saved.
    if (!res.ok || res.opened === 0) {
      setErr('We couldn’t open the shop — your browser may have blocked it. Tap again, or continue with your routine saved.');
      return;
    }
    onBought({ opened: res.opened });
  };

  const lockFree = () => { onLock(resolved); onProductFree(); };

  const PlanColumn = ({ title, rows }: { title: string; rows: Resolved[] }) =>
    rows.length === 0 ? null : (
      <View style={styles.planCol}>
        <Text style={styles.planTitle} maxFontSizeMultiplier={1.3}>{title}</Text>
        {rows.map((r, i) => (
          <View key={`${title}-${r.step}-${i}`} style={styles.planRow}>
            <Text style={styles.planStep} maxFontSizeMultiplier={1.4}>{STEP_WORD[r.step]}</Text>
            <Text style={styles.planName} maxFontSizeMultiplier={1.4} numberOfLines={1}>{r.sku.brand} {r.sku.name}</Text>
          </View>
        ))}
      </View>
    );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 24, paddingBottom: insets.bottom + 188 }}>
        {hideOrb ? (
          <View style={styles.orbSpacer} />
        ) : (
          <Animated.View entering={enter(0)} style={styles.orbRow}>
            <AssistantAuroraOrb state="responding" size={56} scanTone="balanced" />
          </Animated.View>
        )}
        <Animated.Text entering={enter(1)} style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          Here’s your routine, and here’s what you’re getting.
        </Animated.Text>

        {/* The daily plan — already set for them. */}
        <Animated.View entering={enter(2)} style={[styles.plan, cardShadow]}>
          <PlanColumn title="Morning" rows={am} />
          {am.length > 0 && pm.length > 0 ? <View style={styles.planDivide} /> : null}
          <PlanColumn title="Night" rows={pm} />
          {resolved.length === 0 ? (
            <Text style={styles.planEmpty} maxFontSizeMultiplier={1.5}>No products selected — you’ll do this with what you have.</Text>
          ) : null}
        </Animated.View>

        {/* The basket + real total, same moment. */}
        {resolved.length > 0 ? (
          <Animated.View entering={enter(3)} style={styles.basket}>
            <Text style={styles.section} maxFontSizeMultiplier={1.4}>What you’re getting</Text>
            {resolved.map((r, i) => (
              <View key={`b-${i}`} style={styles.basketRow}>
                <Text style={styles.basketName} maxFontSizeMultiplier={1.4} numberOfLines={1}>{r.sku.brand} {r.sku.name}</Text>
                <Text style={styles.basketPrice} maxFontSizeMultiplier={1.3}>{fmt(r.sku.priceUsd)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel} maxFontSizeMultiplier={1.3}>Total</Text>
              <Text style={styles.totalValue} maxFontSizeMultiplier={1.3}>{fmt(total)}</Text>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        {resolved.length > 0 ? (
          <>
            <Pressable onPress={buy} disabled={busy} accessibilityRole="button"
              accessibilityLabel={`${activeBuyBackend.cta}. ${resolved.length} products, total ${fmt(total)}.`}
              style={({ pressed }) => [styles.cta, { opacity: pressed || busy ? 0.9 : 1 }]}>
              <Text style={styles.ctaText} maxFontSizeMultiplier={1.3}>{activeBuyBackend.cta} · {fmt(total)}</Text>
            </Pressable>
            {err ? (
              <Text style={styles.err} maxFontSizeMultiplier={1.6}>{err}</Text>
            ) : null}
            {activeBuyBackend.disclosure ? (
              <Text style={styles.disclosure} maxFontSizeMultiplier={1.6}>{activeBuyBackend.disclosure}</Text>
            ) : null}
          </>
        ) : null}
        <Pressable onPress={lockFree} accessibilityRole="button" accessibilityLabel="I'll do it with what I have"
          style={styles.free}>
          <Text style={styles.freeText} maxFontSizeMultiplier={1.4}>I’ll do it with what I have</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: money.bg },
  orbRow: { alignItems: 'flex-start', marginBottom: 14 },
  orbSpacer: { height: 56, marginBottom: 14 },
  h1: { fontFamily: SERIF, fontSize: 36, lineHeight: 40, color: money.ink, letterSpacing: -0.5 },
  plan: { backgroundColor: money.surface, borderRadius: 24, padding: 20, marginTop: 24, borderWidth: 1, borderColor: money.hairline },
  planCol: { gap: 10 },
  planTitle: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: money.faint },
  planRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  planStep: { fontFamily: 'Inter-SemiBold', fontSize: 14.5, color: money.ink, width: 92 },
  planName: { fontFamily: 'Inter-Regular', fontSize: 14.5, color: money.muted, flex: 1 },
  planDivide: { height: 1, backgroundColor: money.hairline, marginVertical: 16 },
  planEmpty: { fontFamily: 'Inter-Regular', fontSize: 15, color: money.muted },
  basket: { marginTop: 26 },
  section: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: money.faint, marginBottom: 12 },
  basketRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  basketName: { fontFamily: 'Inter-Regular', fontSize: 15, color: money.ink, flex: 1 },
  basketPrice: { fontFamily: 'Inter-Medium', fontSize: 15, color: money.muted },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: money.hairline },
  totalLabel: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: money.ink },
  totalValue: { fontFamily: SERIF, fontSize: 28, color: money.ink },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: 'rgba(252,253,255,0.96)', borderTopWidth: 1, borderTopColor: money.hairline },
  cta: { minHeight: 54, borderRadius: 999, backgroundColor: money.blue, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' },
  disclosure: { fontFamily: 'Inter-Regular', fontSize: 12.5, lineHeight: 18, color: money.muted, marginTop: 10, textAlign: 'center' },
  err: { fontFamily: 'Inter-Medium', fontSize: 13, lineHeight: 18, color: '#B23B3B', marginTop: 10, textAlign: 'center' },
  free: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  freeText: { fontFamily: 'Inter-Medium', fontSize: 15, color: money.muted },
});
