/**
 * SettingsKit — the shared component vocabulary for the rebuilt Me-tab
 * settings pages (Skin profile, Notifications, Privacy, Appearance).
 *
 * Every primitive here reads exclusively from the puraShop design tokens
 * (white + Pura Blue + ink — no orange/peach) so the four pages feel like
 * one calm, premium control center. Nothing in this file fakes a control:
 * each piece is a presentation primitive the screens wire to real state.
 *
 * Animations are one-shot (no infinite loops) and collapse to instant when
 * the user's motion preference / OS Reduce Motion is on.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretRight, Check, Info, X } from 'phosphor-react-native';

import {
  colors,
  puraShop,
  puraShopType,
  puraShopRadius,
  puraShopLayout,
} from '@/theme';
import { hapt } from '@/utils/haptics';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// ===========================================================================
// Layout primitives
// ===========================================================================

/** White surface card — the container for grouped controls. */
export function SettingsCard({
  children,
  style,
  padded = true,
  tone = 'surface',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'surface' | 'warm';
}) {
  return (
    <View
      style={[
        styles.card,
        tone === 'warm' && styles.cardWarm,
        padded && styles.cardPadded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Section block — serif title, optional right-aligned hint, optional footnote. */
export function SettingsSection({
  title,
  hint,
  footnote,
  children,
  style,
}: {
  title?: string;
  hint?: string;
  footnote?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>
            {title}
          </Text>
          {hint ? (
            <Text style={styles.sectionHint} maxFontSizeMultiplier={1.2}>
              {hint}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {footnote ? (
        <Text style={styles.sectionFootnote} maxFontSizeMultiplier={1.25}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

/** Hairline divider, for stacking rows inside a card. */
export function SettingsDivider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

// ===========================================================================
// Chips & choice groups
// ===========================================================================

export type ChipOption<T extends string = string> = {
  value: T;
  label: string;
};

/** A single selectable pill. Checkmark when selected; numbered badge in ranked mode. */
export function ChoiceChip({
  label,
  selected = false,
  disabled = false,
  onPress,
  rank = null,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** 1-based rank shown as a leading badge (ranked groups only). */
  rank?: number | null;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipActive,
        disabled && !selected && styles.chipMuted,
        pressed && !disabled && styles.chipPressed,
      ]}
    >
      {rank != null && selected ? (
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText} maxFontSizeMultiplier={1.1}>
            {rank}
          </Text>
        </View>
      ) : selected ? (
        <Check size={13} color={puraShop.coralDeep} weight="bold" />
      ) : null}
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextActive,
          disabled && !selected && styles.chipTextMuted,
        ]}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ChipGroupProps<T extends string> =
  | {
      mode: 'single';
      options: readonly ChipOption<T>[];
      value: T | null;
      onChange: (value: T) => void;
    }
  | {
      mode: 'multi' | 'ranked';
      options: readonly ChipOption<T>[];
      values: readonly T[];
      onChange: (values: T[]) => void;
      max?: number;
      capNote?: string;
      counterLabel?: (selected: number, max: number) => string;
      /** Legend words by position, e.g. ['Primary','Secondary','Watching']. */
      rankLabels?: readonly string[];
    };

/**
 * ChipGroup — single / multi / ranked selection over a set of chips.
 * - single: one value, taps replace.
 * - multi: many values, taps toggle, optional `max` mutes the rest at cap.
 * - ranked: like multi, but selected chips show their 1-based position and a
 *   legend maps positions to words (Primary / Secondary / Watching).
 */
export function ChipGroup<T extends string>(props: ChipGroupProps<T>) {
  const isRanked = props.mode === 'ranked';
  const selectedValues: readonly T[] =
    props.mode === 'single'
      ? props.value != null
        ? [props.value]
        : []
      : props.values;

  const max = props.mode === 'single' ? undefined : props.max;
  const atCap = max != null && selectedValues.length >= max;

  const handlePress = (value: T) => {
    if (props.mode === 'single') {
      props.onChange(value);
      return;
    }
    const has = props.values.includes(value);
    if (has) {
      props.onChange(props.values.filter((v) => v !== value));
    } else if (max == null || props.values.length < max) {
      props.onChange([...props.values, value]);
    }
  };

  const filledLegend =
    isRanked && 'rankLabels' in props && props.rankLabels
      ? props.rankLabels.slice(0, Math.max(selectedValues.length, 0))
      : [];

  return (
    <View>
      <View style={styles.chipWrap}>
        {props.options.map((o) => {
          const selected = selectedValues.includes(o.value);
          const muted = !selected && atCap;
          const rank = isRanked && selected
            ? selectedValues.indexOf(o.value) + 1
            : null;
          return (
            <ChoiceChip
              key={o.value}
              label={o.label}
              selected={selected}
              disabled={muted}
              rank={rank}
              onPress={() => handlePress(o.value)}
            />
          );
        })}
      </View>

      {isRanked && filledLegend.length > 0 ? (
        <View style={styles.legendRow}>
          {filledLegend.map((word, i) => (
            <Text key={word} style={styles.legendItem} maxFontSizeMultiplier={1.2}>
              <Text style={styles.legendNum}>{i + 1}</Text>
              {`  ${word}`}
            </Text>
          ))}
        </View>
      ) : null}

      {props.mode !== 'single' && max != null ? (
        <Text style={styles.counter} maxFontSizeMultiplier={1.2}>
          {props.counterLabel
            ? props.counterLabel(selectedValues.length, max)
            : `${selectedValues.length} of ${max} selected`}
        </Text>
      ) : null}

      {props.mode !== 'single' && atCap && props.capNote ? (
        <Text style={styles.capNote} maxFontSizeMultiplier={1.2}>
          {props.capNote}
        </Text>
      ) : null}
    </View>
  );
}

// ===========================================================================
// Rows
// ===========================================================================

/** Label + optional meta on the left, a Switch on the right. */
export function ToggleRow({
  label,
  meta,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  meta?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} maxFontSizeMultiplier={1.25}>
          {label}
        </Text>
        {meta ? (
          <Text style={styles.rowMeta} maxFontSizeMultiplier={1.3}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          hapt.select();
          onValueChange(v);
        }}
        trackColor={{ false: puraShop.inkFaint, true: puraShop.coral }}
        thumbColor={puraShop.white}
        ios_backgroundColor={puraShop.inkFaint}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Tappable row — label + meta, with a trailing chevron (or custom trailing). */
export function OptionRow({
  label,
  meta,
  onPress,
  trailing,
  showChevron = true,
  tone = 'default',
  disabled = false,
}: {
  label: string;
  meta?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const danger = tone === 'danger';
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        hapt.tap();
        onPress?.();
      }}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowText}>
        <Text
          style={[styles.rowLabel, danger && styles.rowLabelDanger]}
          maxFontSizeMultiplier={1.25}
        >
          {label}
        </Text>
        {meta ? (
          <Text style={styles.rowMeta} maxFontSizeMultiplier={1.3}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (showChevron && onPress ? (
          <CaretRight
            size={16}
            color={danger ? colors.danger : puraShop.inkFaint}
            weight="bold"
          />
        ) : null)}
    </Pressable>
  );
}

// ===========================================================================
// Segmented control (settings-styled — static, premium, robust)
// ===========================================================================

export function SettingsSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              hapt.select();
              onChange(o.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
              maxFontSizeMultiplier={1.15}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ===========================================================================
// Status pill + notice card
// ===========================================================================

export type NoticeTone = 'success' | 'info' | 'warning' | 'neutral';

function toneColors(tone: NoticeTone): { bg: string; text: string } {
  switch (tone) {
    case 'success':
      return { bg: puraShop.sageSoft, text: puraShop.sageText };
    case 'warning':
      return { bg: puraShop.honeySoft, text: puraShop.honeyText };
    case 'info':
      return { bg: puraShop.oceanSoft, text: puraShop.oceanText };
    default:
      return { bg: puraShop.surfaceWarm, text: puraShop.inkMuted };
  }
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: NoticeTone;
}) {
  const c = toneColors(tone);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

/** A larger tinted card for status / disclosure messages, with optional CTA. */
export function NoticeCard({
  tone = 'neutral',
  title,
  body,
  cta,
  onPressCta,
}: {
  tone?: NoticeTone;
  title: string;
  body: string;
  cta?: string;
  onPressCta?: () => void;
}) {
  const c = toneColors(tone);
  return (
    <View style={[styles.notice, { backgroundColor: c.bg }]}>
      <Text style={[styles.noticeTitle, { color: c.text }]} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <Text style={[styles.noticeBody, { color: puraShop.inkSecondary }]} maxFontSizeMultiplier={1.3}>
        {body}
      </Text>
      {cta && onPressCta ? (
        <Pressable
          onPress={() => {
            hapt.tap();
            onPressCta();
          }}
          accessibilityRole="button"
          accessibilityLabel={cta}
          style={({ pressed }) => [styles.noticeCta, pressed && styles.noticeCtaPressed]}
        >
          <Text style={[styles.noticeCtaText, { color: c.text }]} maxFontSizeMultiplier={1.2}>
            {cta}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ===========================================================================
// Progress bar (skin-profile completion)
// ===========================================================================

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: clamped, min: 0, max: 100 }}
    >
      <View style={[styles.progressFill, { width: `${clamped}%` }]} />
    </View>
  );
}

// ===========================================================================
// "Saved just now" indicator
// ===========================================================================

export function SavedIndicator({ label }: { label: string }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View style={[styles.savedRow, { opacity }]} accessibilityRole="text">
      <Check size={13} color={puraShop.sageText} weight="bold" />
      <Text style={styles.savedText} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Animated.View>
  );
}

// ===========================================================================
// Toast
// ===========================================================================

export type ToastState = { message: string; nonce: number } | null;

export function useToast(): [
  ToastState,
  (message: string) => void,
  () => void,
] {
  const [state, setState] = useState<ToastState>(null);
  const show = useCallback((message: string) => {
    setState((prev) => ({ message, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);
  const hide = useCallback(() => setState(null), []);
  return [state, show, hide];
}

export function Toast({
  state,
  onHide,
  holdMs = 2000,
}: {
  state: ToastState;
  onHide: () => void;
  holdMs?: number;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!state) return;
    const useNative = Platform.OS !== 'web';
    const animateIn = reduceMotion
      ? () => {
          opacity.setValue(1);
          translateY.setValue(0);
        }
      : () =>
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: useNative,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 220,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: useNative,
            }),
          ]).start();

    animateIn();
    const timer = setTimeout(() => {
      if (reduceMotion) {
        opacity.setValue(0);
        onHide();
        return;
      }
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: useNative,
      }).start(({ finished }) => {
        if (finished) {
          translateY.setValue(12);
          onHide();
        }
      });
    }, holdMs);
    return () => clearTimeout(timer);
    // re-run whenever a new toast is requested (nonce changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.nonce]);

  if (!state) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toastWrap,
        { bottom: puraShopLayout.dockBarHeight + insets.bottom + 18, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.toast}>
        <Check size={15} color={puraShop.white} weight="bold" />
        <Text style={styles.toastText} maxFontSizeMultiplier={1.2}>
          {state.message}
        </Text>
      </View>
    </Animated.View>
  );
}

// ===========================================================================
// Bottom sheet primitive + Info / Confirm sheets
// ===========================================================================

function SettingsSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    if (visible) {
      setMounted(true);
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
      ]).start();
    } else if (mounted) {
      if (reduceMotion) {
        setMounted(false);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.timing(translateY, {
          toValue: 40,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: useNative,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Animated.View style={[styles.sheetBackdrop, { opacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheetPanel,
            { paddingBottom: insets.bottom + 20, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Informational sheet — title, body, optional bullets, footnote. */
export function InfoSheet({
  visible,
  title,
  body,
  bullets,
  footnote,
  onClose,
  closeLabel = 'Got it',
}: {
  visible: boolean;
  title: string;
  body?: string;
  bullets?: readonly string[];
  footnote?: string;
  onClose: () => void;
  closeLabel?: string;
}) {
  return (
    <SettingsSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetHeaderRow}>
        <View style={styles.sheetIcon}>
          <Info size={18} color={puraShop.coralDeep} weight="bold" />
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.sheetClose, pressed && styles.rowPressed]}
        >
          <X size={16} color={puraShop.inkMuted} weight="bold" />
        </Pressable>
      </View>
      <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {body ? (
        <Text style={styles.sheetBody} maxFontSizeMultiplier={1.3}>
          {body}
        </Text>
      ) : null}
      {bullets && bullets.length > 0 ? (
        <View style={styles.bulletList}>
          {bullets.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText} maxFontSizeMultiplier={1.3}>
                {b}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {footnote ? (
        <Text style={styles.sheetFootnote} maxFontSizeMultiplier={1.3}>
          {footnote}
        </Text>
      ) : null}
      <Pressable
        onPress={() => {
          hapt.tap();
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        style={({ pressed }) => [styles.sheetGhostBtn, pressed && styles.sheetGhostBtnPressed]}
      >
        <Text style={styles.sheetGhostText} maxFontSizeMultiplier={1.2}>
          {closeLabel}
        </Text>
      </Pressable>
    </SettingsSheet>
  );
}

/** Confirmation sheet — title, body, cancel + confirm (optionally destructive). */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <SettingsSheet visible={visible} onClose={onCancel}>
      <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <Text style={styles.sheetBody} maxFontSizeMultiplier={1.3}>
        {body}
      </Text>
      <View style={styles.confirmActions}>
        <Pressable
          onPress={() => {
            hapt.select();
            onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          style={({ pressed }) => [styles.confirmCancel, pressed && styles.sheetGhostBtnPressed]}
        >
          <Text style={styles.confirmCancelText} maxFontSizeMultiplier={1.2}>
            {cancelLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            hapt.warning();
            onConfirm();
          }}
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          style={({ pressed }) => [
            styles.confirmConfirm,
            destructive ? styles.confirmDanger : styles.confirmPrimary,
            pressed && styles.confirmPressed,
          ]}
        >
          <Text style={styles.confirmConfirmText} maxFontSizeMultiplier={1.2}>
            {confirmLabel}
          </Text>
        </Pressable>
      </View>
    </SettingsSheet>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  // Cards
  card: {
    borderRadius: puraShopRadius.card,
    backgroundColor: puraShop.surface,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
  },
  cardWarm: {
    backgroundColor: puraShop.surfaceWarm,
  },
  cardPadded: {
    padding: 16,
  },

  // Sections
  section: {
    marginBottom: 26,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    ...puraShopType.supportingProductSerif,
    color: puraShop.ink,
    flexShrink: 1,
  },
  sectionHint: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    textAlign: 'right',
  },
  sectionFootnote: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    marginTop: 12,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: puraShop.hairline,
  },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: puraShopRadius.chip,
    backgroundColor: puraShop.surface,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
  },
  chipActive: {
    backgroundColor: puraShop.coralSoft,
    borderColor: puraShop.coral,
  },
  chipMuted: {
    opacity: 0.4,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
  },
  chipTextActive: {
    color: puraShop.coralDeep,
  },
  chipTextMuted: {
    color: puraShop.inkMuted,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: puraShop.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    ...puraShopType.matchLabel,
    fontSize: 11,
    letterSpacing: 0,
    color: puraShop.white,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    ...puraShopType.meta,
    color: puraShop.inkSecondary,
  },
  legendNum: {
    ...puraShopType.meta,
    color: puraShop.coralDeep,
  },
  counter: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    marginTop: 10,
  },
  capNote: {
    ...puraShopType.meta,
    color: puraShop.coralDeep,
    marginTop: 6,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    minHeight: puraShopLayout.minTouchTarget,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    ...puraShopType.contextPill,
    color: puraShop.ink,
  },
  rowLabelDanger: {
    color: colors.danger,
  },
  rowMeta: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    lineHeight: 17,
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    backgroundColor: puraShop.surfaceWarm,
    borderRadius: puraShopRadius.chip,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: puraShopRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: puraShop.surface,
    borderWidth: 1,
    borderColor: puraShop.coral,
  },
  segmentText: {
    ...puraShopType.chipLabel,
    color: puraShop.inkSecondary,
  },
  segmentTextActive: {
    color: puraShop.coralDeep,
  },

  // Status pill
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: puraShopRadius.chip,
  },
  pillText: {
    ...puraShopType.tagLabel,
  },

  // Notice card
  notice: {
    borderRadius: puraShopRadius.cardSmall,
    padding: 16,
    gap: 7,
  },
  noticeTitle: {
    ...puraShopType.chipLabel,
    fontSize: 15,
  },
  noticeBody: {
    ...puraShopType.sectionSub,
    lineHeight: 19,
  },
  noticeCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  noticeCtaPressed: {
    opacity: 0.6,
  },
  noticeCtaText: {
    ...puraShopType.chipLabel,
    textDecorationLine: 'underline',
  },

  // Progress
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: puraShop.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: puraShop.coral,
  },

  // Saved indicator
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedText: {
    ...puraShopType.meta,
    color: puraShop.sageText,
  },

  // Toast
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: puraShop.black,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: puraShopRadius.chip,
    maxWidth: 420,
  },
  toastText: {
    ...puraShopType.chipLabel,
    color: puraShop.white,
    flexShrink: 1,
  },

  // Sheet
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
  },
  sheetPanel: {
    backgroundColor: puraShop.surface,
    borderTopLeftRadius: puraShopRadius.hero,
    borderTopRightRadius: puraShopRadius.hero,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: puraShop.inkFaint,
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: puraShop.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: puraShop.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    ...puraShopType.sectionSerif,
    color: puraShop.ink,
    marginBottom: 8,
  },
  sheetBody: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 14,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: puraShop.coral,
    marginTop: 7,
  },
  bulletText: {
    ...puraShopType.sectionSub,
    color: puraShop.inkSecondary,
    fontSize: 14.5,
    lineHeight: 20,
    flex: 1,
  },
  sheetFootnote: {
    ...puraShopType.meta,
    color: puraShop.inkMuted,
    marginTop: 16,
    lineHeight: 17,
  },
  sheetGhostBtn: {
    marginTop: 22,
    height: 52,
    borderRadius: puraShopRadius.cardSmall,
    backgroundColor: puraShop.surfaceWarm,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetGhostBtnPressed: {
    opacity: 0.7,
  },
  sheetGhostText: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
  },

  // Confirm actions
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  confirmCancel: {
    flex: 1,
    height: 52,
    borderRadius: puraShopRadius.cardSmall,
    backgroundColor: puraShop.surfaceWarm,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
  },
  confirmConfirm: {
    flex: 1,
    height: 52,
    borderRadius: puraShopRadius.cardSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPrimary: {
    backgroundColor: puraShop.black,
  },
  confirmDanger: {
    backgroundColor: colors.danger,
  },
  confirmPressed: {
    opacity: 0.85,
  },
  confirmConfirmText: {
    ...puraShopType.chipLabel,
    color: puraShop.white,
  },
});
