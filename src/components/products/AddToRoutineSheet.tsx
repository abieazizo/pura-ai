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
import {
  HeartStraight,
  Moon,
  Sun,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
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
  label: string;
  helper: string;
  toastLabel: string;
}

const ROWS: RowDef[] = [
  {
    target: 'morning',
    Icon: Sun,
    label: 'Morning routine',
    helper: "Tomorrow morning's steps",
    toastLabel: 'morning routine',
  },
  {
    target: 'evening',
    Icon: Moon,
    label: 'Evening routine',
    helper: "Tonight's steps",
    toastLabel: 'evening routine',
  },
  {
    target: 'saved',
    Icon: HeartStraight,
    label: 'Saved',
    helper: 'Keep for later',
    toastLabel: 'saved',
  },
];

/**
 * STUB — §3.14. Real routine wiring lands in a later PR. For now the sheet
 * shell + rows are real; a tap logs intent, fires a success haptic,
 * dismisses, and pings `onAdded` so the parent can show a toast.
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
              ADD TO
            </Text>
            <Text
              style={styles.headline}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={1.15}
            >
              {productName}
            </Text>
            <View style={{ height: 16 }} />
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
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Icon
                      size={22}
                      color={palette.ink}
                      weight="duotone"
                      style={{ marginRight: 14 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={styles.rowLabel}
                        maxFontSizeMultiplier={1.2}
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
    backgroundColor: 'rgba(26,22,20,0.3)',
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
    backgroundColor: 'rgba(26,22,20,0.15)',
    marginTop: 12,
    marginBottom: 4,
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 22,
    lineHeight: 26,
    color: palette.ink,
  },
  rows: {
    gap: 12,
  },
  row: {
    height: 76,
    borderRadius: 16,
    backgroundColor: 'rgba(212,165,116,0.5)', // sand @ 50%
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  rowHelper: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(26,22,20,0.6)',
    marginTop: 2,
  },
});
