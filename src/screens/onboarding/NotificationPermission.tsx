import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { palette } from '@/theme';

export interface NotificationPermissionProps {
  onDone: () => void;
}

/**
 * Notifications permission resolver (§3.11). No UI — fires the system
 * prompt on mount, auto-advances after 200ms. Grant outcome isn't stored;
 * any follow-up can be read live from `Notifications.getPermissionsAsync`.
 */
export function NotificationPermission({ onDone }: NotificationPermissionProps) {
  const advanced = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
      } catch {
        // Non-fatal — we still advance so the user isn't stuck.
      } finally {
        setTimeout(() => {
          if (!advanced.current && !cancelled) {
            advanced.current = true;
            onDone();
          }
        }, 200);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onDone]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.flex} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
});
