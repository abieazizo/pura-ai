/**
 * ColdOpenDevGallery — dev-only harness for the onboarding cold open (Screen 1).
 *
 * Renders the real ColdOpenScreen full-bleed with a tiny floating toolbar to
 * force each launch variant (first / repeat / reduce) and replay the awakening,
 * so the choreography can be reviewed and captured in isolation. Reachable only
 * via the dev nav ref (window.__pura_nav__) — never linked from a user surface.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColdOpenScreen, type ColdOpenVariant } from '@/screens/onboarding/ColdOpenScreen';
import { palette } from '@/theme';

const VARIANTS: ColdOpenVariant[] = ['first', 'repeat', 'reduce'];

export function ColdOpenDevGallery() {
  const insets = useSafeAreaInsets();
  // Under the design-audit static flag, default to the static 'reduce' variant
  // so a still frame can be captured without animation jitter (the page only
  // reaches an idle frame when nothing is looping).
  const [variant, setVariant] = useState<ColdOpenVariant>(() => {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __puraStaticPreview__?: boolean };
      try {
        if (w.__puraStaticPreview__ || window.localStorage?.getItem('__pura_static_preview__') === '1') {
          return 'reduce';
        }
      } catch {
        /* localStorage blocked */
      }
    }
    return 'first';
  });
  const [runId, setRunId] = useState(0);
  const [chrome, setChrome] = useState(true);

  return (
    <View style={styles.root}>
      <ColdOpenScreen
        key={`${variant}-${runId}`}
        forceVariant={variant}
        onContinue={() => setRunId((n) => n + 1)}
        onSignIn={() => setRunId((n) => n + 1)}
      />

      {chrome && (
        <View style={[styles.bar, { top: insets.top + 6 }]} pointerEvents="box-none">
          {VARIANTS.map((v) => (
            <Pressable
              key={v}
              onPress={() => {
                setVariant(v);
                setRunId((n) => n + 1);
              }}
              style={[styles.chip, variant === v && styles.chipOn]}
            >
              <Text style={[styles.chipText, variant === v && styles.chipTextOn]}>{v}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setRunId((n) => n + 1)} style={styles.chip}>
            <Text style={styles.chipText}>replay</Text>
          </Pressable>
          <Pressable onPress={() => setChrome(false)} style={styles.chip}>
            <Text style={styles.chipText}>hide</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.sandPaper,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  chipOn: { backgroundColor: palette.ink, borderColor: palette.ink },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 12, color: palette.inkSecondary },
  chipTextOn: { color: palette.inkInverse },
});

export default ColdOpenDevGallery;
