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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Bell } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';

export interface NotificationPrimerSheetProps {
  visible: boolean;
  /** Time hint for the primary line; e.g. "7:00 AM" or "9:30 PM". */
  reminderTime: string;
  onDismiss: () => void;
}

/**
 * NotificationPrimerSheet — v10.13.
 *
 * A premium pre-permission explanation that fires after a user has
 * scheduled their first morning or evening routine step. Replaces the
 * old v10.11 pattern of firing `requestPermissionsAsync()` silently on
 * the add-to-routine tap, which ambushed users with an OS sheet out
 * of context.
 *
 * Flow:
 *   1. Bottom sheet slides up with the Bell icon + headline.
 *   2. User taps "Turn on reminders" → OS permission sheet fires.
 *   3. User taps "Not now" → sheet dismisses, permission unchanged.
 *
 * Either path sets `hasPromptedNotifications: true` so the primer is
 * one-shot per user lifetime.
 */
export function NotificationPrimerSheet({
  visible,
  reminderTime,
  onDismiss,
}: NotificationPrimerSheetProps) {
  const insets = useSafeAreaInsets();
  const setHasPromptedNotifications = useAppStore(
    (s) => s.setHasPromptedNotifications
  );

  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);
  useEffect(() => {
    y.value = visible
      ? withSpring(0, { damping: 22, stiffness: 140, mass: 1 })
      : withSpring(1, { damping: 22, stiffness: 140, mass: 1 });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const handleAllow = async () => {
    hapt.tap();
    setHasPromptedNotifications(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Permission flow unavailable — fail silently.
    }
    onDismiss();
  };

  const handleDismiss = () => {
    hapt.select();
    setHasPromptedNotifications(true);
    onDismiss();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleDismiss} />
          <View style={styles.tint} pointerEvents="none" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 20 },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber} />

          <View style={styles.iconWrap}>
            <Bell size={22} color={palette.clay} weight="duotone" />
          </View>

          <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
            Get reminded when it{'\u2019'}s time for your routine.
          </Text>
          <Text style={styles.body} maxFontSizeMultiplier={1.2}>
            A single gentle nudge at {reminderTime}. No marketing, no noise — just the
            one thing you committed to.
          </Text>

          <Pressable
            onPress={handleAllow}
            accessibilityRole="button"
            accessibilityLabel="Turn on reminders"
            style={({ pressed }) => [
              styles.primary,
              pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
            ]}
          >
            <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.15}>
              Turn on reminders
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            style={({ pressed }) => [
              styles.secondary,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.15}>
              Not now
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairline,
    marginBottom: 16,
  },
  iconWrap: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    marginBottom: 20,
  },
  primary: {
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
    color: palette.inkInverse,
  },
  secondary: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
    color: palette.inkTertiary,
  },
});
