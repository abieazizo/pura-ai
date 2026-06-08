/**
 * YourSkinDevGallery — dev-only harness for scan-results screen 2 ("Your Skin").
 *
 * Renders the REAL YourSkinScreen full-bleed with a tiny floating toolbar to
 * switch the fixture (incl. a deep-skin multi-finding face), the theme
 * (dark/light), and the accessibility modes (Reduce Motion / Reduce
 * Transparency), plus replay — so the serene default and every
 * invisible-until-invited power feature can be reviewed and captured in
 * isolation. Reachable only via the dev nav ref (window.__pura_nav__); never
 * linked from a user surface.
 *
 * Under the static-preview flag it defaults to Reduce Motion so a clean still
 * frame settles (the orb + reveals + consolidation otherwise loop/animate).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YourSkinScreen } from '../YourSkinScreen';
import { YOUR_SKIN_FIXTURES, FIXTURE_BY_KEY } from '../fixtures';
import type { ScreenTheme } from '../../firstFinding/metricTint';
import { palette } from '@/theme';

function staticPreview(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const w = window as unknown as { __puraStaticPreview__?: boolean };
    return !!w.__puraStaticPreview__ || window.localStorage?.getItem('__pura_static_preview__') === '1';
  } catch {
    return false;
  }
}

export function YourSkinDevGallery() {
  const insets = useSafeAreaInsets();
  const isStatic = staticPreview();

  const [fixtureKey, setFixtureKey] = useState<string>('redness');
  const [theme, setTheme] = useState<ScreenTheme>('dark');
  const [reduceMotion, setReduceMotion] = useState<boolean>(isStatic);
  const [reduceTransparency, setReduceTransparency] = useState<boolean>(false);
  const [runId, setRunId] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const fixture = FIXTURE_BY_KEY[fixtureKey] ?? YOUR_SKIN_FIXTURES[0];

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const replay = () => setRunId((n) => n + 1);

  return (
    <View style={styles.root}>
      <YourSkinScreen
        key={`${fixtureKey}-${theme}-${reduceMotion}-${reduceTransparency}-${runId}`}
        read={fixture.read}
        toneBackdrop={fixture.toneBackdrop}
        mirrored={fixture.mirrored}
        theme={theme}
        goal={fixture.goal}
        dateLabel="Jun 8"
        forceReduceMotion={reduceMotion}
        forceReduceTransparency={reduceTransparency}
        onBuildRoutine={() => flash('→ Build my routine (routine builder)')}
        onDoLater={() => flash('→ I’ll do this later')}
        onRescan={() => flash('→ Rescan in better light')}
        onShareDayOne={() => flash('→ Shared Day 1 card')}
        onDownweightFinding={(id, dw) => flash(`${dw ? 'Eased off' : 'Restored'}: ${id}`)}
      />

      {toast && (
        <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 70 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {chrome && (
        <View style={[styles.bar, { top: insets.top + 4 }]} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barRow}>
            {YOUR_SKIN_FIXTURES.map((f) => (
              <Chip key={f.key} label={f.label} on={fixtureKey === f.key} onPress={() => { setFixtureKey(f.key); replay(); }} />
            ))}
            <Divider />
            <Chip label={theme} on onPress={() => { setTheme((t) => (t === 'dark' ? 'light' : 'dark')); }} />
            <Chip label={reduceMotion ? 'motion off' : 'motion on'} on={reduceMotion} onPress={() => { setReduceMotion((v) => !v); replay(); }} />
            <Chip label={reduceTransparency ? 'solid' : 'glass'} on={reduceTransparency} onPress={() => { setReduceTransparency((v) => !v); replay(); }} />
            <Chip label="replay" on={false} onPress={replay} />
            <Chip label="hide" on={false} onPress={() => setChrome(false)} />
          </ScrollView>
        </View>
      )}
      {!chrome && (
        <Pressable style={[styles.showChrome, { top: insets.top + 4 }]} onPress={() => setChrome(true)}>
          <Text style={styles.chipText}>tools</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.vdiv} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { position: 'absolute', left: 6, right: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.sandPaper,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  chipOn: { backgroundColor: palette.ink, borderColor: palette.ink },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 12, color: palette.inkSecondary },
  chipTextOn: { color: palette.inkInverse },
  vdiv: { width: 1, height: 20, backgroundColor: palette.hairline, marginHorizontal: 2 },
  showChrome: {
    position: 'absolute',
    left: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.sandPaper,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(8,10,15,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  toastText: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 13 },
});

export default YourSkinDevGallery;
