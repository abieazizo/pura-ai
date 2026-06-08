/**
 * FirstFindingDevHarness — preview/verification ONLY. Wraps the screen in an
 * OrbProvider (the persistent companion orb, birth off) and drives it with the
 * canonical FIXTURES, with on-screen chips to switch scenario / theme / photo /
 * reduced-motion. The real path (readSkinFromPhoto) stays untouched.
 *
 * Mount it from a flag-guarded dev entry (see App wiring) to verify:
 *   analyzing · opening-line + synced glow (normal + DARK-SKIN test face) ·
 *   shared-element resize · low-confidence · bad-photo · dark/light · reduced
 *   motion · reduce transparency.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OrbProvider } from '@/screens/onboarding/orb/OrbHost';
import { SKIN_READ_FIXTURES } from '@/api/skinRead';
import type { SkinReadOutcome } from '@/types/skinRead';
import { FirstFindingScreen } from './FirstFindingScreen';
import type { ScreenTheme } from './metricTint';

// Real portrait URLs (need internet). The DARK-SKIN face proves the additive,
// region-clipped glow never washes the whole face on deep skin tones.
const PHOTOS: Record<string, string> = {
  light: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&q=80',
  deep: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=640&q=80',
};

type ScenarioKey = 'normal' | 'lowConfidence' | 'positive' | 'badPhoto' | 'error';

function outcomeFor(scenario: ScenarioKey): SkinReadOutcome {
  switch (scenario) {
    case 'normal':
      return { status: 'ready', read: SKIN_READ_FIXTURES.normal };
    case 'lowConfidence':
      return { status: 'ready', read: SKIN_READ_FIXTURES.lowConfidence };
    case 'positive':
      return { status: 'ready', read: SKIN_READ_FIXTURES.positive };
    case 'badPhoto':
      return { status: 'bad_photo', read: SKIN_READ_FIXTURES.badPhoto };
    case 'error':
      return { status: 'service_error', message: 'I couldn’t quite finish that read — let’s try once more.' };
  }
}

export function FirstFindingDevHarness() {
  const [scenario, setScenario] = useState<ScenarioKey>('normal');
  const [theme, setTheme] = useState<ScreenTheme>('dark');
  const [photoKey, setPhotoKey] = useState<keyof typeof PHOTOS>('light');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [live, setLive] = useState(true); // start pending → flip to scenario
  const [nonce, setNonce] = useState(0); // remount key to replay

  const [outcome, setOutcome] = useState<SkinReadOutcome>({ status: 'pending' });

  useEffect(() => {
    if (!live) {
      setOutcome(outcomeFor(scenario));
      return;
    }
    setOutcome({ status: 'pending' });
    const t = setTimeout(() => setOutcome(outcomeFor(scenario)), 3800);
    return () => clearTimeout(t);
  }, [scenario, live, nonce]);

  const photoUri = PHOTOS[photoKey];

  // Force the screen + orb to fully remount on replay / reduce-motion change.
  const key = `${theme}-${reduceMotion ? 'rm' : 'fm'}-${nonce}`;

  return (
    <SafeAreaProvider>
    <View style={[styles.root, { backgroundColor: theme === 'dark' ? '#0A0B12' : '#FCFDFF' }]}>
      <OrbProvider key={key} reduceMotion={reduceMotion} birth={false} dark={theme === 'dark'}>
        <FirstFindingScreen
          key={`${key}-${photoKey}`}
          photoUri={photoUri}
          outcome={outcome}
          theme={theme}
          mirrored
          onSeeEverything={() => setScenario((s) => s)}
          onTryBetterLight={() => setNonce((n) => n + 1)}
          onTryAgain={() => setNonce((n) => n + 1)}
        />

        {/* Controls — fall through the orb overlay (box-none). */}
        <View style={styles.bar} pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barRow}
          >
            <Group label="scene">
              {(['normal', 'lowConfidence', 'positive', 'badPhoto', 'error'] as ScenarioKey[]).map((s) => (
                <Chip key={s} on={scenario === s} label={s} onPress={() => setScenario(s)} />
              ))}
            </Group>
            <Group label="photo">
              <Chip on={photoKey === 'light'} label="light" onPress={() => setPhotoKey('light')} />
              <Chip on={photoKey === 'deep'} label="deep skin" onPress={() => setPhotoKey('deep')} />
            </Group>
            <Group label="opts">
              <Chip on={theme === 'dark'} label="dark" onPress={() => setTheme('dark')} />
              <Chip on={theme === 'light'} label="light" onPress={() => setTheme('light')} />
              <Chip on={reduceMotion} label="reduce motion" onPress={() => setReduceMotion((v) => !v)} />
              <Chip on={live} label="live transition" onPress={() => setLive((v) => !v)} />
              <Chip on={false} label="↻ replay" onPress={() => setNonce((n) => n + 1)} />
            </Group>
          </ScrollView>
        </View>
      </OrbProvider>
    </View>
    </SafeAreaProvider>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Platform.OS === 'web' ? 8 : 28,
    paddingTop: 8,
    backgroundColor: 'rgba(10,11,18,0.82)',
  },
  barRow: { paddingHorizontal: 10, gap: 14, alignItems: 'flex-end' },
  group: { gap: 4 },
  groupLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chipOn: { backgroundColor: '#147CFF', borderColor: '#147CFF' },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  chipTextOn: { color: '#FFFFFF', fontWeight: '600' },
});
