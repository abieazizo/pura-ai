import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera } from 'expo-camera';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';

export interface CameraPermissionProps {
  onDone: () => void;
}

/**
 * Camera permission resolver (§2.7). No UI — fires the system prompt on
 * mount and auto-advances after 200ms once the user makes a choice.
 * Records `cameraDenied` in the store so we can surface it on the first
 * scan later (not handled in this commit).
 */
export function CameraPermission({ onDone }: CameraPermissionProps) {
  const setCameraDenied = useAppStore((s) => s.setCameraDenied);
  const advancedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await Camera.requestCameraPermissionsAsync();
        if (cancelled) return;
        setCameraDenied(!result.granted);
      } catch {
        // Surface as denied so we can retry later.
        setCameraDenied(true);
      } finally {
        setTimeout(() => {
          if (!advancedRef.current && !cancelled) {
            advancedRef.current = true;
            onDone();
          }
        }, 200);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onDone, setCameraDenied]);

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
