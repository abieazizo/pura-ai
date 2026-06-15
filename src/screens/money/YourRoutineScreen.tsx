/**
 * YourRoutineScreen — money flow step 3. The recommendation rendered AS the
 * routine: a clean list, essentials first and PRE-SELECTED (the lazy path is
 * zero work), the full routine one tap away, each step a real product card.
 * It owns the basket selection and hands it to Confirm — nothing is bought
 * here; the routine only LOCKS at Confirm.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AssistantAuroraOrb } from '@/screens/assistant/AssistantAuroraOrb';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { RecommendationSet, RoutineSlot, TailoringInput } from '@/commerce/types';
import { RoutineCard } from './RoutineCard';
import { money, SERIF } from './theme';

/** One line of the basket: a chosen SKU for a slot + whether it's in. */
export interface SelectedLine {
  slotIndex: number;
  slot: RoutineSlot;
  chosenId: string;
  selected: boolean;
}

const fmt = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;

export interface YourRoutineScreenProps {
  recommendation: RecommendationSet;
  /** Onboarding goal for the header line, when known. */
  goalLine?: string;
  /**
   * How involved they chose to be (from Tailoring). 'choose' = "Show me
   * everything — I'll pick": the full routine is shown expanded with NOTHING
   * pre-selected, so the user genuinely picks each step. 'essentials'/'full'
   * keep the lazy path (essentials pre-selected). Undefined → lazy path.
   */
  depth?: TailoringInput['depth'];
  /** The flow container hoists ONE persistent orb; we reserve its space. */
  hideOrb?: boolean;
  onConfirm: (lines: SelectedLine[]) => void;
}

export function YourRoutineScreen({ recommendation, goalLine, depth, hideOrb = false, onConfirm }: YourRoutineScreenProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const userPicks = depth === 'choose';
  const completeSet = depth === 'full';
  // 'choose' AND 'full' show the whole routine up front; 'essentials' tucks the
  // extras behind "See the full routine".
  const [showFull, setShowFull] = useState(userPicks || completeSet);

  // Selection diverges by depth so the three choices aren't three labels for the
  // same basket:
  //   • essentials → only the core essential steps pre-selected (the 2-min path)
  //   • full       → the COMPLETE set pre-selected (every buyable step the engine
  //                  kept, minus ones it honestly labelled "skippable")
  //   • choose     → NOTHING pre-selected — the choice is genuinely the user's,
  //                  so "Show me everything — I'll pick" isn't an empty promise.
  const [lines, setLines] = useState<SelectedLine[]>(() =>
    recommendation.slots.map((slot, slotIndex) => ({
      slotIndex,
      slot,
      chosenId: slot.pick?.sku.id ?? '',
      selected: userPicks
        ? false
        : completeSet
          ? !!slot.pick && !slot.skippedBecauseOwned && slot.label !== 'skippable'
          : !!slot.pick && slot.essential && !slot.skippedBecauseOwned,
    })),
  );

  const setLine = (i: number, patch: Partial<SelectedLine>) =>
    setLines((prev) => prev.map((l) => (l.slotIndex === i ? { ...l, ...patch } : l)));

  const buyable = lines.filter((l) => !l.slot.skippedBecauseOwned && l.slot.pick);
  const essentials = buyable.filter((l) => l.slot.essential);
  const extras = buyable.filter((l) => !l.slot.essential);
  const ownedSlots = recommendation.slots.filter((s) => s.skippedBecauseOwned);

  const { count, total } = useMemo(() => {
    let c = 0;
    let t = 0;
    for (const l of lines) {
      if (!l.selected || !l.slot.pick) continue;
      const sku = l.chosenId === l.slot.budgetAlternative?.sku.id ? l.slot.budgetAlternative!.sku : l.slot.pick.sku;
      c += 1;
      t += sku.priceUsd;
    }
    return { count: c, total: t };
  }, [lines]);

  const enter = (i: number) =>
    reduceMotion ? undefined : FadeInDown.delay(70 * i).springify().damping(18).stiffness(140);

  const renderCard = (l: SelectedLine, i: number) => (
    <Animated.View key={l.slotIndex} entering={enter(i)}>
      <RoutineCard
        slot={l.slot}
        chosenId={l.chosenId}
        selected={l.selected}
        onToggleSelected={() => setLine(l.slotIndex, { selected: !l.selected })}
        // Swapping to the budget variant must NOT change basket membership — the
        // Add/Remove toggle is the only control that does. (Forcing selected:true
        // here silently re-added a card the user had removed, bumping the total.)
        onUseBudget={() => setLine(l.slotIndex, { chosenId: l.slot.budgetAlternative!.sku.id })}
        onUsePick={() => setLine(l.slotIndex, { chosenId: l.slot.pick!.sku.id })}
      />
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 24, paddingBottom: insets.bottom + 130 }}>
        {hideOrb ? (
          <View style={styles.orbSpacer} />
        ) : (
          <Animated.View entering={enter(0)} style={styles.orbRow}>
            <AssistantAuroraOrb state="responding" size={56} scanTone="balanced" />
          </Animated.View>
        )}
        <Animated.Text entering={enter(1)} style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          Here’s your routine.
        </Animated.Text>
        <Animated.Text entering={enter(2)} style={styles.sub} maxFontSizeMultiplier={1.6}>
          {goalLine ?? 'Built from what your scan actually showed — each step is one real product, picked for fit.'}
        </Animated.Text>

        {buyable.length === 0 ? (
          <Animated.Text entering={enter(3)} style={styles.covered} maxFontSizeMultiplier={1.6}>
            You’re already covered — nothing to add. Your routine’s the steps you’ve got; just keep them going.
          </Animated.Text>
        ) : null}
        {essentials.length > 0 ? (
          <>
            <Animated.Text entering={enter(3)} style={styles.section} maxFontSizeMultiplier={1.4}>The essentials</Animated.Text>
            {essentials.map((l, i) => renderCard(l, i))}
          </>
        ) : null}

        {ownedSlots.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            {ownedSlots.map((s) => (
              <RoutineCard key={`owned-${s.step}`} slot={s} chosenId="" selected={false} onToggleSelected={() => {}} onUseBudget={() => {}} onUsePick={() => {}} />
            ))}
          </View>
        ) : null}

        {extras.length > 0 ? (
          showFull ? (
            <>
              <Text style={[styles.section, { marginTop: 30 }]} maxFontSizeMultiplier={1.4}>The full routine</Text>
              {extras.map((l, i) => renderCard(l, i))}
            </>
          ) : (
            <Pressable onPress={() => setShowFull(true)} accessibilityRole="button"
              accessibilityLabel={`See the full routine, ${extras.length} more`}
              style={styles.more}>
              <Text style={styles.moreText} maxFontSizeMultiplier={1.4}>See the full routine — {extras.length} more ›</Text>
            </Pressable>
          )
        ) : null}
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.dockInfo}>
          <Text style={styles.dockCount} maxFontSizeMultiplier={1.4}>{count} {count === 1 ? 'product' : 'products'}</Text>
          <Text style={styles.dockTotal} maxFontSizeMultiplier={1.3}>{fmt(total)}</Text>
        </View>
        <Pressable onPress={() => onConfirm(lines)} accessibilityRole="button" accessibilityLabel={count > 0 ? 'Review and confirm' : 'Continue with what you have'}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}>
          <Text style={styles.ctaText} maxFontSizeMultiplier={1.3}>{count > 0 ? 'Review & confirm' : 'Continue'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: money.bg },
  orbRow: { alignItems: 'flex-start', marginBottom: 14 },
  orbSpacer: { height: 56, marginBottom: 14 },
  h1: { fontFamily: SERIF, fontSize: 42, lineHeight: 46, color: money.ink, letterSpacing: -0.6 },
  sub: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22, color: money.muted, marginTop: 10 },
  section: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: money.faint, marginTop: 30 },
  covered: { fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 23, color: money.muted, marginTop: 28, maxWidth: 320 },
  more: { marginTop: 26, minHeight: 48, justifyContent: 'center' },
  moreText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: money.blueDeep },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 12, backgroundColor: 'rgba(252,253,255,0.94)', borderTopWidth: 1, borderTopColor: money.hairline },
  dockInfo: { minWidth: 84 },
  dockCount: { fontFamily: 'Inter-Medium', fontSize: 12.5, color: money.muted },
  dockTotal: { fontFamily: SERIF, fontSize: 24, color: money.ink },
  cta: { flex: 1, minHeight: 54, borderRadius: 999, backgroundColor: money.blue, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFFFFF' },
});
