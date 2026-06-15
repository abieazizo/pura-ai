/**
 * RoutineCard — one routine step = one real product (money flow step 3).
 *
 * The recommendation IS the routine: each card is a real SKU with a REAL
 * packshot that bleeds oversized past the card's top edge with a soft contact
 * shadow (never text-only, never a vector/emoji), its brand + name + price, the
 * ONE plain why-line tied to its finding, the calibrated label, an honest
 * budget swap, and an add/remove control. Owned steps render as a quiet
 * "skipped — you've got this" row instead of a sell.
 */
import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PickLabel, RoutineSlot } from '@/commerce/types';
import { money, cardShadow, SERIF } from './theme';

const STEP_WORD: Record<string, string> = { cleanse: 'Cleanse', treat: 'Treat', moisturize: 'Moisturize', protect: 'Protect' };
/** Real consumer nouns for the owned-skip line — never the raw engine enum
 *  ("you've got a moisturize" is not English). */
const OWNED_NOUN: Record<string, string> = { cleanse: 'cleanser', treat: 'treatment', moisturize: 'moisturizer', protect: 'sunscreen' };

const LABEL_PILL: Record<PickLabel, { text: string; bg: string; ink: string }> = {
  good_match: { text: 'Good match', bg: money.blue10, ink: money.blueDeep },
  optional: { text: 'Optional', bg: 'rgba(8,22,56,0.06)', ink: money.muted },
  skippable: { text: 'You can skip this for now', bg: 'rgba(8,22,56,0.05)', ink: money.faint },
};

const fmt = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;

export interface RoutineCardProps {
  slot: RoutineSlot;
  /** Which SKU is chosen for this slot (pick.id or budgetAlternative.id). */
  chosenId: string;
  selected: boolean;
  onToggleSelected: () => void;
  onUseBudget: () => void;
  onUsePick: () => void;
}

export function RoutineCard({ slot, chosenId, selected, onToggleSelected, onUseBudget, onUsePick }: RoutineCardProps) {
  // Owned → never re-sold; the routine simply tells the user it skipped it.
  if (slot.skippedBecauseOwned) {
    const noun = OWNED_NOUN[slot.step] ?? 'one';
    return (
      <View style={[styles.owned]} accessibilityLabel={`You've already got a ${noun} — we left it out.`}>
        <Text style={styles.ownedText} maxFontSizeMultiplier={1.5}>
          You’ve already got a {noun} — we left it out.
        </Text>
      </View>
    );
  }
  if (!slot.pick) return null;

  const onBudget = !!slot.budgetAlternative && chosenId === slot.budgetAlternative.sku.id;
  const active = onBudget ? slot.budgetAlternative! : slot.pick;
  const sku = active.sku;
  const pill = LABEL_PILL[slot.label];

  return (
    <View
      style={[styles.card, cardShadow, !selected && styles.cardOff]}
      accessible
      accessibilityLabel={`${STEP_WORD[slot.step]}: ${sku.brand} ${sku.name}, ${fmt(sku.priceUsd)}. ${active.whyLine}. ${pill.text}. ${selected ? 'Added' : 'Not added'}.`}
    >
      {/* The bottle, bleeding past the top edge with a contact shadow. */}
      <View style={styles.shelf}>
        <View style={styles.contact} />
        {sku.image != null ? (
          <Image source={sku.image} style={styles.packshot} contentFit="contain" />
        ) : (
          // No packshot yet → a deliberate editorial tile (tinted wash + serif
          // initial), never a gray "broken" rectangle. (Real packshots are still
          // being sourced for the full catalog; the engine prefers SKUs that have
          // one, so this is the exception, not the rule.)
          <View style={styles.brandTile} accessibilityElementsHidden>
            <Text style={styles.brandInitial}>{sku.brand.trim().charAt(0)}</Text>
            <Text style={styles.brandTileText} numberOfLines={1}>{sku.brand}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.step} maxFontSizeMultiplier={1.3}>{STEP_WORD[slot.step]} · {slot.time}</Text>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.pillText, { color: pill.ink }]} maxFontSizeMultiplier={1.3}>{pill.text}</Text>
          </View>
        </View>

        <Text style={styles.brand} maxFontSizeMultiplier={1.3}>{sku.brand}</Text>
        <Text style={styles.name} maxFontSizeMultiplier={1.3}>{sku.name}</Text>
        <Text style={styles.why} maxFontSizeMultiplier={1.6}>{active.whyLine}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price} maxFontSizeMultiplier={1.3}>{fmt(sku.priceUsd)}</Text>
          <Pressable
            onPress={onToggleSelected}
            accessibilityRole="button"
            accessibilityLabel={selected ? `Remove ${sku.name}` : `Add ${sku.name}`}
            style={({ pressed }) => [styles.addBtn, selected ? styles.addBtnOn : styles.addBtnOff, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.addText, selected ? { color: money.blueDeep } : { color: '#FFFFFF' }]} maxFontSizeMultiplier={1.3}>
              {selected ? '✓ Added' : 'Add'}
            </Text>
          </Pressable>
        </View>

        {/* The honest budget path — always offered when the pick isn't budget. */}
        {slot.budgetAlternative ? (
          <Pressable
            onPress={onBudget ? onUsePick : onUseBudget}
            accessibilityRole="button"
            accessibilityLabel={onBudget
              ? `Use the recommended ${slot.pick.sku.name} instead`
              : `Use the budget option, ${slot.budgetAlternative.sku.name}, ${fmt(slot.budgetAlternative.sku.priceUsd)}`}
            style={styles.budgetRow}
          >
            <Text style={styles.budgetText} maxFontSizeMultiplier={1.5}>
              {onBudget
                ? `↺ Use the pick instead — ${slot.pick.sku.brand} ${fmt(slot.pick.sku.priceUsd)}`
                : `Tighter budget? ${slot.budgetAlternative.sku.brand} ${slot.budgetAlternative.sku.name} — ${fmt(slot.budgetAlternative.sku.priceUsd)}`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: money.surface, borderRadius: 24, marginTop: 30, borderWidth: 1, borderColor: money.hairline },
  cardOff: { opacity: 0.72 },
  shelf: { height: 86, alignItems: 'center', justifyContent: 'flex-end' },
  // The bottle floats up out of the card; the soft ellipse is its contact shadow.
  packshot: { position: 'absolute', top: -34, width: 120, height: 150 },
  contact: { position: 'absolute', bottom: 8, width: 92, height: 14, borderRadius: 999, backgroundColor: 'rgba(8,22,56,0.10)', transform: [{ scaleX: 1.1 }] },
  brandTile: { position: 'absolute', top: -18, width: 92, height: 116, borderRadius: 16, backgroundColor: money.blue06, borderWidth: 1, borderColor: money.blue10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 4 },
  brandInitial: { fontFamily: SERIF, fontSize: 44, lineHeight: 46, color: money.blueDeep },
  brandTileText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: money.muted, textAlign: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 16, paddingTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: money.faint },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 0.2 },
  brand: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: money.muted, marginTop: 12 },
  name: { fontFamily: SERIF, fontSize: 23, lineHeight: 26, color: money.ink, marginTop: 1 },
  why: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20, color: money.muted, marginTop: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  price: { fontFamily: SERIF, fontSize: 26, color: money.ink },
  addBtn: { minWidth: 92, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  addBtnOff: { backgroundColor: money.blue },
  addBtnOn: { backgroundColor: money.blue10, borderWidth: 1, borderColor: money.blue15 },
  addText: { fontFamily: 'Inter-SemiBold', fontSize: 14.5 },
  budgetRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: money.hairline, minHeight: 40, justifyContent: 'center' },
  budgetText: { fontFamily: 'Inter-Medium', fontSize: 13, color: money.budget },
  owned: { marginTop: 14, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, backgroundColor: 'rgba(8,22,56,0.035)' },
  ownedText: { fontFamily: 'Inter-Medium', fontSize: 14, color: money.muted },
});
