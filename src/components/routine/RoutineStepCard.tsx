/**
 * RoutineStepCard — one step in the daily plan.
 *
 * Renders:
 *   • Completion checkbox (local state, lifted up via onToggle)
 *   • STEP N · CATEGORY kicker
 *   • Title + instruction
 *   • "Why today" line from the plan
 *   • Product slot — either the user's product (when added) or an empty
 *     state with "Add my product" + "Find Pura match" pressables
 *
 * Even with zero products added, every step renders with structure so
 * the routine never reads as empty.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Plus, Sparkle } from 'phosphor-react-native';
import { ProductPlaceholderImage } from '@/components/products/ProductPlaceholderImage';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { Product } from '@/types';
import type { RoutineStepPlan, StepPriority } from '@/state/routinePlan';

// v23.3 — priority-chip tone helpers. Keep alongside the card so the
// chip palette stays adjacent to where it renders.
function priorityChipTone(priority: StepPriority) {
  switch (priority) {
    case 'non-negotiable':
      return {
        backgroundColor: palette.mossLight,
        borderColor: palette.moss,
      };
    case 'highest':
      return {
        backgroundColor: palette.clayPaper,
        borderColor: palette.clay,
      };
    case 'high':
      return {
        backgroundColor: palette.bgDeep,
        borderColor: palette.hairline,
      };
    case 'medium':
      return {
        backgroundColor: palette.bgDeep,
        borderColor: palette.hairline,
      };
    case 'optional':
      return {
        backgroundColor: palette.bgDeep,
        borderColor: palette.hairline,
      };
  }
}

function priorityChipTextTone(priority: StepPriority) {
  switch (priority) {
    case 'non-negotiable':
      return { color: palette.mossDeep };
    case 'highest':
      return { color: palette.clayDeep };
    case 'high':
    case 'medium':
    case 'optional':
      return { color: palette.inkSecondary };
  }
}

interface Props {
  step: RoutineStepPlan;
  completed: boolean;
  onToggle: () => void;
  /** When set, the user has assigned a product to this step. */
  product?: Product;
  /** Opens the "Add my product" flow (e.g. Saved + Products tab). */
  onAddProduct: () => void;
  /** Opens the Products tab filtered for this step's category. */
  onFindMatch: () => void;
  /** Opens the product detail when a product is attached. */
  onOpenProduct?: () => void;
}

export function RoutineStepCard({
  step,
  completed,
  onToggle,
  product,
  onAddProduct,
  onFindMatch,
  onOpenProduct,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        completed && styles.cardCompleted,
      ]}
    >
      <View style={styles.headRow}>
        <Pressable
          onPress={() => {
            hapt.select();
            onToggle();
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          accessibilityLabel={
            completed ? `Mark ${step.title} not done` : `Mark ${step.title} done`
          }
          hitSlop={6}
          style={({ pressed }) => [
            styles.checkBtn,
            completed && styles.checkBtnDone,
            pressed && { opacity: 0.85 },
          ]}
        >
          {completed ? (
            <Check size={14} color={palette.inkInverse} weight="bold" />
          ) : null}
        </Pressable>

        <View style={{ flex: 1 }}>
          {/* v23.3 — SPF stays uppercase because the categoryLabel is
              already 'SPF' (not 'Spf'); other labels uppercase the
              way they always did. */}
          <Text
            style={[styles.kicker, completed && styles.textCompleted]}
            maxFontSizeMultiplier={1.1}
          >
            {`STEP ${step.step} · ${step.categoryLabel === 'SPF' ? 'SPF' : step.categoryLabel.toUpperCase()}`}
          </Text>
          <Text
            style={[styles.title, completed && styles.textCompleted]}
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
          >
            {step.title}
          </Text>
        </View>

        {/* v23.3 — priority-aware badge. The plan now ships an explicit
            badge string per step ("Priority today" / "Non-negotiable" /
            "Safe choice today") so we never invent badge text on the
            screen side. Falls back to OPTIONAL for the optional step. */}
        {step.badge ? (
          <View
            style={[
              styles.priorityChip,
              priorityChipTone(step.priority),
            ]}
          >
            <Text
              style={[
                styles.priorityChipText,
                priorityChipTextTone(step.priority),
              ]}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
            >
              {step.badge}
            </Text>
          </View>
        ) : step.optional ? (
          <View style={styles.optionalChip}>
            <Text style={styles.optionalChipText} maxFontSizeMultiplier={1.1}>
              OPTIONAL
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[styles.instruction, completed && styles.textCompletedSoft]}
        maxFontSizeMultiplier={1.2}
        numberOfLines={3}
      >
        {step.instruction}
      </Text>

      <View style={styles.reasonRow}>
        <Sparkle size={11} color={palette.clayDeep} weight="fill" />
        <Text
          style={styles.reasonText}
          maxFontSizeMultiplier={1.2}
          numberOfLines={3}
        >
          {step.reason}
        </Text>
      </View>

      {/* Product slot — attached product or empty CTA. */}
      {product ? (
        <Pressable
          onPress={() => {
            if (!onOpenProduct) return;
            hapt.select();
            onOpenProduct();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${product.brand} ${product.name}, open product details`}
          style={({ pressed }) => [
            styles.productSlot,
            pressed && { opacity: 0.95 },
          ]}
        >
          <View style={styles.productThumb}>
            <ProductPlaceholderImage
              product={product}
              silhouetteSize={26}
              showBrandWord={false}
              showMockupBadge={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={styles.productName}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {product.name}
            </Text>
            <Text
              style={styles.productBrand}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
            >
              {product.brand}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptySlot}>
          {/* v23.3 — "No X selected yet" is warmer than "No X added".
              `emptyNoun` lets SPF read as "No SPF selected yet" (not
              "No spf selected yet"). */}
          <Text style={styles.emptySlotText} maxFontSizeMultiplier={1.15}>
            {`No ${step.emptyNoun ?? step.categoryLabel.toLowerCase()} selected yet`}
          </Text>
          <View style={styles.emptyCtaRow}>
            <Pressable
              onPress={() => {
                hapt.tap();
                onAddProduct();
              }}
              accessibilityRole="button"
              accessibilityLabel="Add product I own"
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Plus size={12} color={palette.inkInverse} weight="bold" />
              <Text style={styles.addBtnText} maxFontSizeMultiplier={1.15}>
                Add product I own
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapt.select();
                onFindMatch();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Find ${step.matchKeyword} match`}
              style={({ pressed }) => [
                styles.findBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.findBtnText} maxFontSizeMultiplier={1.15}>
                {`Find ${step.matchKeyword} match`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  cardCompleted: {
    backgroundColor: palette.mossLight,
    borderColor: palette.moss,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  checkBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.inkTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: 'transparent',
  },
  checkBtnDone: {
    backgroundColor: palette.mossDeep,
    borderColor: palette.mossDeep,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
  },
  optionalChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: palette.bgDeep,
  },
  optionalChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.6,
    color: palette.inkTertiary,
  },
  // v23.3 — priority chip on the step header. Sits beside the title and
  // tells the user, in one phrase, why this step matters today.
  priorityChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 140,
  },
  priorityChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  textCompleted: {
    color: palette.mossDeep,
  },
  textCompletedSoft: {
    color: palette.inkSecondary,
    textDecorationLine: 'line-through',
  },
  instruction: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginBottom: 10,
    paddingLeft: 36,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.clayPaper,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: palette.ink,
  },
  productSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
  },
  productThumb: {
    width: 44,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  productName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: -0.1,
    color: palette.ink,
    marginBottom: 2,
  },
  productBrand: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: palette.inkTertiary,
  },
  emptySlot: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderStyle: 'dashed',
  },
  emptySlotText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: palette.inkTertiary,
    marginBottom: 10,
  },
  emptyCtaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  addBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
  findBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  findBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.1,
    color: palette.inkSecondary,
  },
});
