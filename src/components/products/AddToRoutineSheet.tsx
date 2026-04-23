import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
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
import * as Notifications from 'expo-notifications';
import {
  HeartStraight,
  Moon,
  Sun,
  CaretRight,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';

export type AddToRoutineTarget = 'morning' | 'evening' | 'saved';

export interface AddToRoutineSheetProps {
  visible: boolean;
  productId: string;
  productName: string;
  onDismiss: () => void;
  /** Fired after a row is picked + the sheet has animated out. */
  onAdded?: (target: AddToRoutineTarget, productId: string) => void;
}

interface RowDef {
  target: AddToRoutineTarget;
  Icon: React.FC<PhosphorIconProps>;
  iconTint: string;
  iconBg: string;
  label: string;
  helper: string;
  toastLabel: string;
}

// v9.8 — each row gets its own tint-keyed icon cell so the three options
// read as distinct destinations, not identical tiles. Morning → amber,
// Evening → deep ink-blue, Saved → clay. Same tint treatment used in
// Home's concern-card icon cells.
const ROWS: RowDef[] = [
  {
    target: 'morning',
    Icon: Sun,
    iconTint: palette.amberDeep,
    iconBg: palette.amberLight,
    label: 'Morning routine',
    helper: 'Starts tomorrow at 7:00',
    toastLabel: 'morning routine',
  },
  {
    target: 'evening',
    Icon: Moon,
    iconTint: palette.clayDeep,
    iconBg: palette.clayPaper,
    label: 'Evening routine',
    helper: 'Tonight at 9:30',
    toastLabel: 'evening routine',
  },
  {
    target: 'saved',
    Icon: HeartStraight,
    iconTint: palette.clay,
    iconBg: palette.clayPaper,
    label: 'Saved for later',
    helper: 'Decide another time',
    toastLabel: 'saved',
  },
];

/**
 * AddToRoutineSheet — v9.8 premium bottom sheet.
 *
 * Was v7.6: three sand-colored full-width tiles, InstrumentSerif-Regular
 * headline, no affordance. Now:
 *   • Headline typography tightened (SemiBold, -0.4 letter-spacing)
 *   • Rows become paper tiles with 1pt hairline borders (matches the
 *     Home concern-card language). Each row carries its own tint-keyed
 *     icon cell (amber / clay-deep / clay) so destinations read as
 *     distinct, not fungible.
 *   • Caret chevron on the right for affordance.
 *   • Helper line carries a concrete time hint instead of vague "tomorrow
 *     morning's steps" language.
 *
 * The add-to-routine flow is still stubbed (logs + haptic + onAdded
 * callback); routine store wiring is a separate PR.
 */
export function AddToRoutineSheet({
  visible,
  productId,
  productName,
  onDismiss,
  onAdded,
}: AddToRoutineSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);
  const hasPromptedNotifications = useAppStore(
    (s) => s.hasPromptedNotifications
  );
  const setHasPromptedNotifications = useAppStore(
    (s) => s.setHasPromptedNotifications
  );

  useEffect(() => {
    y.value = visible
      ? withSpring(0, { damping: 22, stiffness: 140, mass: 1 })
      : withSpring(1, { damping: 22, stiffness: 140, mass: 1 });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const pick = (row: RowDef) => {
    // eslint-disable-next-line no-console
    console.log(`[STUB] Added ${productId} to ${row.target}`);
    hapt.success();

    // v10.11 — contextual notification permission. The first time a
    // user actually schedules a morning or evening routine step is
    // when reminders become meaningful; that's the right moment to
    // request the OS permission, not during onboarding. "Saved"
    // skips the prompt because it's a bookmark, not a scheduled
    // action. `hasPromptedNotifications` persists across sessions
    // so iOS's one-shot system sheet isn't re-attempted if the user
    // already made a choice.
    const needsSchedule = row.target === 'morning' || row.target === 'evening';
    if (needsSchedule && !hasPromptedNotifications) {
      setHasPromptedNotifications(true);
      // Fire-and-forget. The OS handles denial + "ask again later"
      // gracefully; we don't block the add-to-routine flow on the
      // result.
      Notifications.requestPermissionsAsync().catch(() => {
        // Swallow — permission denied or unavailable is non-fatal.
      });
    }

    // Let the exit animation play before firing the toast.
    setTimeout(() => {
      onAdded?.(row.target, productId);
    }, 220);
    onDismiss();
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
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber} />
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
              ADD TO ROUTINE
            </Text>
            <Text
              style={styles.headline}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.15}
            >
              {productName}
            </Text>
            <View style={styles.rows}>
              {ROWS.map((r) => {
                const Icon = r.Icon;
                return (
                  <Pressable
                    key={r.target}
                    onPress={() => pick(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add to ${r.label}`}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { opacity: 0.96, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View
                      style={[styles.iconWrap, { backgroundColor: r.iconBg }]}
                    >
                      <Icon size={18} color={r.iconTint} weight="duotone" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={styles.rowLabel}
                        maxFontSizeMultiplier={1.15}
                      >
                        {r.label}
                      </Text>
                      <Text
                        style={styles.rowHelper}
                        maxFontSizeMultiplier={1.2}
                      >
                        {r.helper}
                      </Text>
                    </View>
                    <CaretRight
                      size={13}
                      color={palette.inkTertiary}
                      weight="bold"
                    />
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Convenience for parent to format the toast message. */
export function routineTargetLabel(target: AddToRoutineTarget): string {
  return (
    ROWS.find((r) => r.target === target)?.toastLabel ?? 'your routine'
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.45)',
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
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.inkTertiary,
    marginBottom: 10,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 22,
  },
  rows: {
    gap: 10,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  rowHelper: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 15,
    color: palette.inkTertiary,
    marginTop: 2,
  },
});
