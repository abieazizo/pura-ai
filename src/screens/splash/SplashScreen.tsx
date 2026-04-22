import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PuraMark, type MarkVariant } from '@/components/PuraMark';
import { GrainOverlay } from '@/components/GrainOverlay';
import { palette } from '@/theme';

export interface SplashScreenProps {
  onReady: () => void;
}

/**
 * Pura's first frame. A clayPaper background, the Mark at hero size, and a
 * choreographed sequence through its variants (idle → scanning → complete).
 *
 * The sequence reads like a silent product demo: we can see, we can
 * transform. Then the app mounts.
 */
export function SplashScreen({ onReady }: SplashScreenProps) {
  const [stage, setStage] = useState<MarkVariant>('idle');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 0–1400ms: idle breathing
    timers.push(
      setTimeout(() => setStage('scanning'), 1400)
    );
    // 1400–2600ms: scanning ripples
    timers.push(
      setTimeout(() => setStage('complete'), 2600)
    );
    // 2600–3400ms: complete split+reform
    timers.push(
      setTimeout(() => onReady(), 3400)
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onReady]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <GrainOverlay opacity={0.04} />
      <View style={styles.center}>
        <PuraMark variant={stage} size="hero" glow />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.clayPaper,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
