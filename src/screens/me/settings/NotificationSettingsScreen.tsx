/**
 * NotificationSettingsScreen — the single nightly scan reminder.
 *
 * Pura keeps notifications to one gentle nudge. The toggle is honest:
 * it only flips on when the OS actually accepts the scheduled
 * reminder (see `scheduleScanReminder`), and surfaces the calm denied
 * / unavailable copy otherwise rather than pretending it worked.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { puraShop, puraShopType, puraShopRadius, puraShopLayout } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { hapt } from '@/utils/haptics';
import { meSettings } from '@/copy/strings';
import {
  scheduleScanReminder,
  cancelScanReminder,
  formatReminderTime,
  type ReminderTime,
} from '@/lib/routineReminder';

import { SettingsScaffold } from './SettingsScaffold';

const C = meSettings.notifications;

const TIME_PRESETS: readonly ReminderTime[] = [
  { hour: 20, minute: 0 },
  { hour: 20, minute: 30 },
  { hour: 21, minute: 0 },
  { hour: 21, minute: 30 },
  { hour: 22, minute: 0 },
];

export function NotificationSettingsScreen() {
  const { enabled, time, setEnabled, setTime } = useAppStore(
    useShallow((s) => ({
      enabled: s.routineRemindersEnabled,
      time: s.routineReminderTime,
      setEnabled: s.setRoutineRemindersEnabled,
      setTime: s.setRoutineReminderTime,
    })),
  );

  const isWeb = Platform.OS === 'web';
  const [busy, setBusy] = useState(false);

  const onToggle = useCallback(
    async (next: boolean) => {
      hapt.select();
      if (next) {
        setBusy(true);
        const ok = await scheduleScanReminder(time);
        setBusy(false);
        if (ok) {
          setEnabled(true);
        } else {
          Alert.alert(C.deniedTitle, C.deniedBody);
        }
      } else {
        await cancelScanReminder();
        setEnabled(false);
      }
    },
    [time, setEnabled],
  );

  const pickTime = useCallback(
    async (t: ReminderTime) => {
      hapt.select();
      setTime(t);
      if (enabled) {
        await scheduleScanReminder(t);
      }
    },
    [enabled, setTime],
  );

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        {isWeb ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteText} maxFontSizeMultiplier={1.3}>
              {C.unavailable}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel} maxFontSizeMultiplier={1.2}>
                    {C.reminderLabel}
                  </Text>
                  <Text style={styles.rowMeta} maxFontSizeMultiplier={1.25}>
                    {enabled
                      ? C.reminderMeta(formatReminderTime(time))
                      : C.reminderMetaOff}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={onToggle}
                  disabled={busy}
                  trackColor={{ false: puraShop.inkFaint, true: puraShop.coral }}
                  thumbColor={puraShop.white}
                  ios_backgroundColor={puraShop.inkFaint}
                />
              </View>
            </View>

            {enabled ? (
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel} maxFontSizeMultiplier={1.2}>
                  {C.timeLabel}
                </Text>
                <View style={styles.chipWrap}>
                  {TIME_PRESETS.map((t) => {
                    const active =
                      t.hour === time.hour && t.minute === time.minute;
                    return (
                      <Pressable
                        key={`${t.hour}:${t.minute}`}
                        onPress={() => pickTime(t)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={({ pressed }) => [
                          styles.chip,
                          active && styles.chipActive,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                          maxFontSizeMultiplier={1.2}
                        >
                          {formatReminderTime(t)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  card: {
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: puraShop.ink,
    letterSpacing: -0.15,
  },
  rowMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: puraShop.inkMuted,
    marginTop: 3,
  },
  timeBlock: {
    marginTop: 24,
  },
  timeLabel: {
    ...puraShopType.supportingProductSerif,
    color: puraShop.ink,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
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
  noteCard: {
    backgroundColor: puraShop.surfaceWarm,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    padding: 18,
  },
  noteText: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
  },
});
