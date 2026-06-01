/**
 * NotificationSettingsScreen — the single nightly scan reminder.
 *
 * Pura keeps notifications to one gentle nudge. The toggle is honest:
 *   • native — it only flips on when the OS actually accepts the
 *              scheduled reminder; a denied permission surfaces the
 *              calm "blocked" state with a deep link to Settings.
 *   • web    — there's no OS scheduler, so we let the user set their
 *              preference but say plainly it won't ring in the preview.
 *
 * The status card always reflects the real state, an iOS-style preview
 * shows exactly what arrives, and the promise card sets the frequency
 * expectation up front.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Bell } from 'phosphor-react-native';

import { puraShop, puraShopType, puraShopRadius } from '@/theme';
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
import {
  ChipGroup,
  NoticeCard,
  SettingsCard,
  SettingsSection,
  ToggleRow,
  type ChipOption,
  type NoticeTone,
} from './SettingsKit';

const C = meSettings.notifications;

const TIME_PRESETS: readonly ReminderTime[] = [
  { hour: 20, minute: 0 },
  { hour: 20, minute: 30 },
  { hour: 21, minute: 0 },
  { hour: 21, minute: 30 },
  { hour: 22, minute: 0 },
];

const timeKey = (t: ReminderTime) => `${t.hour}:${t.minute}`;

const TIME_OPTIONS: readonly ChipOption[] = TIME_PRESETS.map((t) => ({
  value: timeKey(t),
  label: formatReminderTime(t),
}));

type Status = 'on' | 'off' | 'blocked' | 'unavailable';

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
  const [permDenied, setPermDenied] = useState(false);

  // Native: read whether the user has hard-denied notifications so we can
  // show the "blocked" recovery rather than a toggle that silently fails.
  useEffect(() => {
    if (isWeb) return;
    let active = true;
    Notifications.getPermissionsAsync()
      .then((s) => {
        if (active) setPermDenied(!s.granted && !s.canAskAgain);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isWeb]);

  const status: Status = isWeb
    ? 'unavailable'
    : permDenied
    ? 'blocked'
    : enabled
    ? 'on'
    : 'off';

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const onToggle = useCallback(
    async (next: boolean) => {
      // Web has no OS scheduler — persist the preference honestly without
      // pretending it was scheduled.
      if (isWeb) {
        setEnabled(next);
        return;
      }
      if (next) {
        setBusy(true);
        const ok = await scheduleScanReminder(time);
        setBusy(false);
        if (ok) {
          setPermDenied(false);
          setEnabled(true);
        } else {
          // Couldn't schedule — almost always a denied permission.
          setPermDenied(true);
        }
      } else {
        await cancelScanReminder();
        setEnabled(false);
      }
    },
    [isWeb, time, setEnabled],
  );

  const pickTime = useCallback(
    async (key: string) => {
      const preset = TIME_PRESETS.find((t) => timeKey(t) === key);
      if (!preset) return;
      hapt.select();
      setTime(preset);
      if (enabled && !isWeb) {
        await scheduleScanReminder(preset);
      }
    },
    [enabled, isWeb, setTime],
  );

  const statusTone: NoticeTone =
    status === 'on' ? 'success' : status === 'blocked' ? 'warning' : 'neutral';
  const statusCard =
    status === 'on'
      ? { title: C.status.onTitle, body: C.status.onBody }
      : status === 'blocked'
      ? {
          title: C.status.blockedTitle,
          body: C.status.blockedBody,
          cta: C.status.blockedCta,
          onPressCta: openSettings,
        }
      : status === 'unavailable'
      ? { title: C.status.unavailableTitle, body: C.status.unavailableBody }
      : { title: C.status.offTitle, body: C.status.offBody };

  return (
    <SettingsScaffold title={C.title} intro={C.intro}>
      <View style={styles.body}>
        <View style={styles.block}>
          <NoticeCard tone={statusTone} {...statusCard} />
        </View>

        <SettingsCard style={styles.block}>
          <ToggleRow
            label={C.reminderLabel}
            meta={
              enabled ? C.reminderMeta(formatReminderTime(time)) : C.reminderMetaOff
            }
            value={enabled}
            disabled={busy}
            onValueChange={onToggle}
          />
        </SettingsCard>

        {enabled ? (
          <SettingsSection title={C.timeLabel}>
            <ChipGroup
              mode="single"
              options={TIME_OPTIONS}
              value={timeKey(time)}
              onChange={pickTime}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title={C.preview.label}>
          <View style={styles.preview}>
            <View style={styles.previewIcon}>
              <Bell size={16} color={puraShop.white} weight="fill" />
            </View>
            <View style={styles.previewText}>
              <View style={styles.previewTopRow}>
                <Text style={styles.previewApp} maxFontSizeMultiplier={1.1}>
                  {C.preview.appName}
                </Text>
                <Text style={styles.previewNow} maxFontSizeMultiplier={1.1}>
                  {C.preview.now}
                </Text>
              </View>
              <Text style={styles.previewTitle} maxFontSizeMultiplier={1.2}>
                {C.preview.title}
              </Text>
              <Text style={styles.previewBody} maxFontSizeMultiplier={1.25}>
                {C.preview.body}
              </Text>
            </View>
          </View>
        </SettingsSection>

        <NoticeCard tone="info" title={C.promiseTitle} body={C.promiseBody} />
      </View>
    </SettingsScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },
  block: {
    marginBottom: 22,
  },
  preview: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: puraShop.surfaceWarm,
    borderRadius: puraShopRadius.cardSmall,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    padding: 14,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: puraShop.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    flex: 1,
    gap: 3,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewApp: {
    ...puraShopType.tagLabel,
    color: puraShop.inkMuted,
  },
  previewNow: {
    ...puraShopType.meta,
    color: puraShop.inkFaint,
  },
  previewTitle: {
    ...puraShopType.chipLabel,
    color: puraShop.ink,
    fontSize: 14.5,
  },
  previewBody: {
    ...puraShopType.meta,
    color: puraShop.inkSecondary,
    lineHeight: 17,
  },
});
