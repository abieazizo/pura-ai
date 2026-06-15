/**
 * TailoringScreen — money flow step 2. Sits AFTER the findings, BEFORE the
 * routine. Two quick taps in the orb's voice, framed as "how involved do you
 * want to be" — never a clinical quiz:
 *
 *   Q1  "How much do you want to take on?"  → essentials / full / choose
 *   Q2  "Anything you already use and love?" → multi-select owned steps / skip
 *
 * Its only output is the engine's TailoringInput. The lazy path is two taps:
 * pick a depth, tap Continue (Q2 skipped). Light Porcelain, calm orb, serif
 * questions, staggered spring entrances.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';

import { AssistantAuroraOrb } from '@/screens/assistant/AssistantAuroraOrb';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { RoutineStepKind, TailoringInput } from '@/commerce/types';
import { money, cardShadow, SERIF } from './theme';

type Depth = TailoringInput['depth'];

const DEPTHS: { key: Depth; title: string; note: string }[] = [
  { key: 'essentials', title: 'Just the essentials', note: 'The few steps that matter most. Two minutes, tops.' },
  { key: 'full', title: 'A full routine', note: 'The complete set, morning and night.' },
  { key: 'choose', title: 'Let me choose', note: 'Show me everything — I’ll pick.' },
];

const OWNED: { key: RoutineStepKind; label: string }[] = [
  { key: 'cleanse', label: 'A cleanser' },
  { key: 'moisturize', label: 'A moisturizer' },
  { key: 'protect', label: 'Sunscreen' },
  { key: 'treat', label: 'A treatment / serum' },
];

export interface TailoringScreenProps {
  /** For the orb's first line — kept warm, never clinical. */
  goal?: string;
  /** The flow container hoists ONE persistent orb; we reserve its space. */
  hideOrb?: boolean;
  onComplete: (tailoring: TailoringInput) => void;
}

export function TailoringScreen({ hideOrb = false, onComplete }: TailoringScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [depth, setDepth] = useState<Depth | null>(null);
  const [owned, setOwned] = useState<Set<RoutineStepKind>>(new Set());

  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.delay(90 * i).springify().damping(18).stiffness(140);

  const toggleOwned = (k: RoutineStepKind) =>
    setOwned((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const finish = () => depth && onComplete({ depth, ownedSteps: [...owned] });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: insets.bottom + 120 }}
      >
        {hideOrb ? (
          <View style={styles.orbSpacer} />
        ) : (
          <Animated.View entering={enter(0)} style={styles.orbRow}>
            <AssistantAuroraOrb state="idle" size={60} scanTone="balanced" />
          </Animated.View>
        )}

        {/* Q1 — the orb's voice, serif. */}
        <Animated.Text entering={enter(1)} style={styles.q} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          How much do you want to take on?
        </Animated.Text>
        <Animated.Text entering={enter(2)} style={styles.sub} maxFontSizeMultiplier={1.6}>
          No wrong answer — we’ll shape it around you.
        </Animated.Text>

        <View style={styles.choices}>
          {DEPTHS.map((d, i) => {
            const on = depth === d.key;
            return (
              <Animated.View key={d.key} entering={enter(3 + i)} layout={reduceMotion ? undefined : Layout.springify()}>
                <Pressable
                  onPress={() => setDepth(d.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${d.title}. ${d.note}`}
                  style={[styles.choice, cardShadow, on && styles.choiceOn]}
                >
                  <View style={styles.choiceText}>
                    <Text style={[styles.choiceTitle, on && { color: money.blueDeep }]} maxFontSizeMultiplier={1.4}>
                      {d.title}
                    </Text>
                    <Text style={styles.choiceNote} maxFontSizeMultiplier={1.5}>{d.note}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Q2 — springs in once Q1 is answered. Skippable (the lazy path). */}
        {depth ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(280)} style={{ marginTop: 36 }}>
            <Text style={styles.q2} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
              Anything you already use and love?
            </Text>
            <Text style={styles.sub} maxFontSizeMultiplier={1.6}>
              We’ll skip those — no point buying twice.
            </Text>
            <View style={styles.owned}>
              {OWNED.map((o) => {
                const on = owned.has(o.key);
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => toggleOwned(o.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={o.label}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && { color: '#FFFFFF' }]} maxFontSizeMultiplier={1.4}>
                      {on ? '✓ ' : ''}{o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Continue — appears the moment a depth is picked (Q2 stays optional). */}
      {depth ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.springify().damping(18).stiffness(140)}
          style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}
        >
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Continue to your routine"
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}>
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.3}>
              {owned.size > 0 ? 'Continue' : 'Continue'}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: money.bg },
  orbRow: { alignItems: 'flex-start', marginBottom: 18 },
  orbSpacer: { height: 60, marginBottom: 18 },
  q: { fontFamily: SERIF, fontSize: 38, lineHeight: 42, color: money.ink, letterSpacing: -0.5 },
  q2: { fontFamily: SERIF, fontSize: 30, lineHeight: 34, color: money.ink, letterSpacing: -0.4 },
  sub: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 21, color: money.muted, marginTop: 8 },
  choices: { marginTop: 22, gap: 12 },
  choice: {
    backgroundColor: money.surface, borderRadius: 22, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: money.hairline,
  },
  choiceOn: { borderColor: money.blue, backgroundColor: money.blue06 },
  choiceText: { flex: 1 },
  choiceTitle: { fontFamily: 'Inter-SemiBold', fontSize: 17, color: money.ink },
  choiceNote: { fontFamily: 'Inter-Regular', fontSize: 13.5, lineHeight: 19, color: money.muted, marginTop: 3 },
  radio: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(8,22,56,0.18)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: money.blue },
  radioDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: money.blue },
  owned: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: money.hairline, backgroundColor: money.surface },
  chipOn: { backgroundColor: money.blue, borderColor: money.blue },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 14.5, color: money.ink },
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: 'rgba(252,253,255,0.92)', borderTopWidth: 1, borderTopColor: money.hairline,
  },
  cta: { minHeight: 54, borderRadius: 999, backgroundColor: money.blue, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' },
});
