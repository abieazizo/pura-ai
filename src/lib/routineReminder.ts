/**
 * v26 — Minimal scan-reminder scheduler.
 *
 * Wraps expo-notifications with a single helper. If permission is
 * blocked or the platform is web, the helper resolves false so the
 * caller can fall back to a UI-only confirmation state.
 *
 * Callers should NOT assume a confirmed scheduled notification — show
 * UI confirmation only when this returns true.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SCAN_REMINDER_ID = 'pura-scan-reminder';

export interface ReminderTime {
  hour: number;
  minute: number;
}

/**
 * Schedule a daily local reminder for tomorrow's scan at the given
 * hour/minute (24h). Returns true when the OS accepted the schedule.
 */
export async function scheduleScanReminder(
  time: ReminderTime,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return false;

    await Notifications.cancelScheduledNotificationAsync(
      SCAN_REMINDER_ID,
    ).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: SCAN_REMINDER_ID,
      content: {
        title: 'Tonight’s scan check-in',
        body: 'Repeat similar lighting for a trustworthy comparison.',
      },
      trigger: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'daily' as any,
        hour: time.hour,
        minute: time.minute,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelScanReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(SCAN_REMINDER_ID);
  } catch {
    /* swallow — best-effort */
  }
}

export function formatReminderTime(time: ReminderTime): string {
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  const meridiem = time.hour < 12 ? 'AM' : 'PM';
  const minute = String(time.minute).padStart(2, '0');
  return `${hour12}:${minute} ${meridiem}`;
}
