/**
 * v22.11 — Real filter & sort sheet.
 *
 * Replaces the v18.x placeholder stub. Backed entirely by
 * existing product data — only renders filters that are actually
 * supported by the current result set:
 *
 *   • SORT       — Best match (default) / Price low → high (only when
 *                  at least one candidate has a numeric price > 0)
 *   • IMAGES     — Products with images first (toggle)
 *   • CATEGORIES — Multi-select chip list built from the categories
 *                  present in the current result set
 *
 * Reset clears filters back to defaults. Apply closes the sheet.
 * Cancel discards uncommitted changes.
 *
 * The component is presentation-only: it receives the current
 * filter state + the set of available categories from the parent
 * (ProductsScreen), and emits filter changes back through
 * `onChange`. Parent applies them to its `liveResults` array.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

export type ProductSortMode = 'best-match' | 'price-asc';

export interface ProductFilterState {
  sort: ProductSortMode;
  imagesOnly: boolean;
  categories: ReadonlySet<string>;
}

export const INITIAL_FILTER_STATE: ProductFilterState = {
  sort: 'best-match',
  imagesOnly: false,
  categories: new Set<string>(),
};

export function isFilterActive(state: ProductFilterState): boolean {
  return (
    state.sort !== 'best-match' ||
    state.imagesOnly ||
    state.categories.size > 0
  );
}

export interface FiltersSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /**
   * Currently-committed filter state. Used to seed the sheet on open.
   */
  current: ProductFilterState;
  /**
   * Called when the user taps Apply. The new state replaces the
   * parent's filter state. Sheet closes automatically.
   */
  onApply: (next: ProductFilterState) => void;
  /**
   * Categories present in the unfiltered result set. The chip list
   * only renders categories that actually appear in `liveResults`,
   * so the user can't filter to a category with zero matches.
   */
  availableCategories: readonly string[];
  /**
   * True when at least one candidate has a numeric price > 0. Only
   * then does the Price sort option render.
   */
  hasPriceData: boolean;
}

export function FiltersStubSheet({
  visible,
  onDismiss,
  current,
  onApply,
  availableCategories,
  hasPriceData,
}: FiltersSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);

  // Working state — only commits on Apply. Reset to `current` on open.
  const [draft, setDraft] = useState<ProductFilterState>(current);
  useEffect(() => {
    if (visible) setDraft(current);
  }, [visible, current]);

  useEffect(() => {
    y.value = visible
      ? withSpring(0, { damping: 22, stiffness: 140, mass: 1 })
      : withSpring(1, { damping: 22, stiffness: 140, mass: 1 });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const toggleCategory = (cat: string) => {
    hapt.select();
    setDraft((d) => {
      const next = new Set(d.categories);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return { ...d, categories: next };
    });
  };

  const setSort = (sort: ProductSortMode) => {
    hapt.select();
    setDraft((d) => ({ ...d, sort }));
  };

  const toggleImagesOnly = () => {
    hapt.select();
    setDraft((d) => ({ ...d, imagesOnly: !d.imagesOnly }));
  };

  const reset = () => {
    hapt.select();
    setDraft(INITIAL_FILTER_STATE);
  };

  const apply = () => {
    hapt.select();
    onApply(draft);
    onDismiss();
  };

  const hasCategories = availableCategories.length > 0;
  const draftIsDirty =
    draft.sort !== current.sort ||
    draft.imagesOnly !== current.imagesOnly ||
    !setsEqual(draft.categories, current.categories);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
          <View style={styles.tint} pointerEvents="none" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber} />
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <View style={styles.headerRow}>
              <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
                FILTER & SORT
              </Text>
              <Pressable
                onPress={() => {
                  hapt.select();
                  reset();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
              >
                <Text style={styles.resetLabel} maxFontSizeMultiplier={1.1}>
                  Reset
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              {/* SORT */}
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
                Sort
              </Text>
              <SortRow
                label="Best match"
                active={draft.sort === 'best-match'}
                onPress={() => setSort('best-match')}
              />
              {hasPriceData ? (
                <SortRow
                  label="Price · low to high"
                  active={draft.sort === 'price-asc'}
                  onPress={() => setSort('price-asc')}
                />
              ) : null}

              {/* IMAGES */}
              <Text
                style={[styles.sectionLabel, { marginTop: 18 }]}
                maxFontSizeMultiplier={1.1}
              >
                Images
              </Text>
              <ToggleRow
                label="Products with images only"
                active={draft.imagesOnly}
                onPress={toggleImagesOnly}
              />

              {/* CATEGORIES */}
              {hasCategories ? (
                <>
                  <Text
                    style={[styles.sectionLabel, { marginTop: 18 }]}
                    maxFontSizeMultiplier={1.1}
                  >
                    Category
                  </Text>
                  <View style={styles.chipWrap}>
                    {availableCategories.map((cat) => {
                      const selected = draft.categories.has(cat);
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => toggleCategory(cat)}
                          accessibilityRole="button"
                          accessibilityLabel={`Filter category ${cat}`}
                          accessibilityState={{ selected }}
                          style={({ pressed }) => [
                            styles.chip,
                            selected ? styles.chipActive : styles.chipIdle,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              {
                                color: selected
                                  ? palette.inkInverse
                                  : palette.ink,
                              },
                            ]}
                            maxFontSizeMultiplier={1.1}
                            numberOfLines={1}
                          >
                            {prettyCategory(cat)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => {
                  hapt.select();
                  onDismiss();
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.cancelLabel} maxFontSizeMultiplier={1.1}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={apply}
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
                accessibilityState={{ disabled: !draftIsDirty }}
                disabled={!draftIsDirty}
                style={({ pressed }) => [
                  styles.applyBtn,
                  pressed && { opacity: 0.92 },
                  !draftIsDirty && { opacity: 0.55 },
                ]}
              >
                <Text style={styles.applyLabel} maxFontSizeMultiplier={1.1}>
                  Apply
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Internals.
// ---------------------------------------------------------------------------

function SortRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.rowLabel} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

function ToggleRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.rowLabel} maxFontSizeMultiplier={1.1}>
        {label}
      </Text>
      <View style={[styles.checkbox, active && styles.checkboxActive]}>
        {active ? (
          <Check size={12} color={palette.inkInverse} weight="bold" />
        ) : null}
      </View>
    </Pressable>
  );
}

function prettyCategory(cat: string): string {
  if (!cat || cat === 'unknown') return 'Other';
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.32)',
  },
  sheet: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -16 },
    elevation: 12,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11,18,32,0.15)',
    marginTop: 12,
    marginBottom: 4,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
  },
  resetLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  body: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  rowLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: palette.ink,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: palette.ink,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.ink,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: palette.bgDeep,
    borderColor: palette.hairline,
  },
  chipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  chipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: -0.05,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
  cancelLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
  applyLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.inkInverse,
  },
});
