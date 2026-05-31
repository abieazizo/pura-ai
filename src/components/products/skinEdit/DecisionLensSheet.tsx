/**
 * DecisionLensSheet — replaces the generic Filter & Sort sheet.
 *
 * Strategic recommendation control surface: priority (single select),
 * avoid (multi select), routine fit (toggles). Applying re-runs the
 * Skin Edit pipeline with the chosen lens.
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
import { DEFAULT_LENS, type DecisionLens, type SkinEditLens } from '@/state/skinEdit';

interface DecisionLensSheetProps {
  visible: boolean;
  current: DecisionLens;
  onApply: (next: DecisionLens) => void;
  onDismiss: () => void;
}

const PRIORITY_OPTIONS: Array<{ key: SkinEditLens; label: string }> = [
  { key: 'fastest_improvement', label: 'Fastest visible improvement' },
  { key: 'gentlest_routine', label: 'Gentlest routine' },
  { key: 'lowest_cost', label: 'Lowest cost' },
  { key: 'fewest_products', label: 'Fewest products' },
  { key: 'target_active_breakouts', label: 'Target active breakouts first' },
  { key: 'fade_marks_gently', label: 'Fade marks without irritation' },
];

const AVOID_OPTIONS: Array<{ key: keyof DecisionLens['avoid']; label: string }> = [
  { key: 'strongActives', label: 'Strong actives' },
  { key: 'fragrance', label: 'Fragrance' },
  { key: 'over25', label: 'Products over $25' },
  { key: 'duplicateIngredients', label: 'Duplicate ingredients already in my routine' },
  { key: 'routineConflicts', label: 'Products that conflict with tonight’s routine' },
];

const ROUTINE_FIT_OPTIONS: Array<{ key: keyof DecisionLens['routineFit']; label: string }> = [
  { key: 'onlySafeNow', label: 'Only show products safe to add now' },
  { key: 'hideOwned', label: 'Hide products I already use' },
  { key: 'lowIrritation', label: 'Prioritize low irritation risk' },
];

export function DecisionLensSheet({
  visible,
  current,
  onApply,
  onDismiss,
}: DecisionLensSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);
  const [draft, setDraft] = useState<DecisionLens>(current);

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

  const setPriority = (key: SkinEditLens) => {
    hapt.select();
    setDraft((d) => ({ ...d, priority: key }));
  };
  const toggleAvoid = (key: keyof DecisionLens['avoid']) => {
    hapt.select();
    setDraft((d) => ({ ...d, avoid: { ...d.avoid, [key]: !d.avoid[key] } }));
  };
  const toggleFit = (key: keyof DecisionLens['routineFit']) => {
    hapt.select();
    setDraft((d) => ({ ...d, routineFit: { ...d.routineFit, [key]: !d.routineFit[key] } }));
  };
  const reset = () => {
    hapt.select();
    setDraft(DEFAULT_LENS);
  };
  const apply = () => {
    hapt.select();
    onApply(draft);
  };

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
              <View>
                <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                  What matters most right now?
                </Text>
                <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
                  Pura will rebuild your edit around this priority.
                </Text>
              </View>
              <Pressable
                onPress={reset}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Reset lens"
              >
                <Text style={styles.resetLabel} maxFontSizeMultiplier={1.1}>
                  Reset
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 480 }}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
                PRIMARY PRIORITY
              </Text>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectRow
                  key={opt.key}
                  label={opt.label}
                  active={draft.priority === opt.key}
                  variant="radio"
                  onPress={() => setPriority(opt.key)}
                />
              ))}

              <Text style={[styles.sectionLabel, { marginTop: 22 }]} maxFontSizeMultiplier={1.1}>
                AVOID
              </Text>
              {AVOID_OPTIONS.map((opt) => (
                <SelectRow
                  key={opt.key}
                  label={opt.label}
                  active={draft.avoid[opt.key]}
                  variant="check"
                  onPress={() => toggleAvoid(opt.key)}
                />
              ))}

              <Text style={[styles.sectionLabel, { marginTop: 22 }]} maxFontSizeMultiplier={1.1}>
                ROUTINE FIT
              </Text>
              {ROUTINE_FIT_OPTIONS.map((opt) => (
                <SelectRow
                  key={opt.key}
                  label={opt.label}
                  active={draft.routineFit[opt.key]}
                  variant="check"
                  onPress={() => toggleFit(opt.key)}
                />
              ))}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rebuild my edit"
                onPress={apply}
                style={({ pressed }) => [
                  styles.applyBtn,
                  pressed && styles.applyBtnPressed,
                ]}
              >
                <Text style={styles.applyLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                  Rebuild my edit
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SelectRow({
  label,
  active,
  variant,
  onPress,
}: {
  label: string;
  active: boolean;
  variant: 'radio' | 'check';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={variant === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.row,
        active ? rowStyles.rowActive : null,
        pressed && { opacity: 0.94 },
      ]}
    >
      <Text
        style={[rowStyles.label, active ? rowStyles.labelActive : null]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
      <View style={[rowStyles.indicator, active ? rowStyles.indicatorActive : null]}>
        {active ? (
          variant === 'radio' ? (
            <View style={rowStyles.radioDot} />
          ) : (
            <Check size={12} color={palette.inkInverse} weight="bold" />
          )
        ) : null}
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    minHeight: 44,
  },
  rowActive: {
    borderColor: palette.clay,
    backgroundColor: palette.clayPaper,
  },
  label: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 18,
    color: palette.ink,
    marginRight: 12,
  },
  labelActive: {
    color: palette.clayDeep,
    fontFamily: 'Inter-SemiBold',
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    backgroundColor: palette.clay,
    borderColor: palette.clay,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.inkInverse,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.hairline,
    marginTop: 8,
    marginBottom: 8,
  },
  inner: {
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 16,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 4,
    paddingRight: 12,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    paddingRight: 12,
  },
  resetLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.clayDeep,
    paddingTop: 6,
  },
  body: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  actions: {
    marginTop: 8,
    gap: 8,
  },
  applyBtn: {
    height: 54,
    backgroundColor: palette.ink,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnPressed: {
    backgroundColor: '#0A0C12',
  },
  applyLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.inkInverse,
  },
});
