/**
 * Barcode analyzing screen — v10.32.
 *
 * Receives a freshly-detected barcode from `ScanCaptureScreen` (via
 * the `BarcodeAnalyzing` route), kicks off `resolveBarcode()` through
 * the AI gateway, and replaces itself with `BarcodeResult` once the
 * lookup completes.
 *
 * Why a dedicated screen and not just a spinner inside the result
 * screen: the lookup takes 1–3s on average (network round-trip to
 * Open Beauty Facts plus an AI normalization pass). Holding the user
 * on a transitional screen with the actual scanned code visible
 * makes the work feel earned — they can see the system reading their
 * barcode rather than staring at a blank loading dot.
 *
 * Visuals
 *   • Dark cool-ink ground so it reads as a system surface, not the
 *     paper canvas the rest of the app uses.
 *   • The scanned barcode value rendered in monospace, large, with
 *     a synthesized barcode-pattern strip above it (deterministic from
 *     the digits, so the same barcode always shows the same stripe
 *     pattern — gives the screen a stable visual identity).
 *   • Italic serif caption beneath: "Looking up across the global
 *     product database…"
 *   • Pulsing "RESOLVING" kicker (Inter SemiBold caps).
 *   • A "Cancel" link in the top-left so a user who scanned the wrong
 *     thing isn't trapped.
 *
 * Hard floor of 1.4s on the loading time so the transition never
 * flashes — even if the AI returns in 200ms, we wait. Below 1s feels
 * "did anything happen?" and above 4s feels broken; 1.4s is the
 * sweet spot for "system did real work".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { resolveBarcode } from '@/api/products';
import type { BarcodeResolution } from '@/ai/ai-contracts';

const MIN_LOADING_MS = 1400;

export interface BarcodeAnalyzingScreenProps {
  barcodeValue: string;
  onComplete: (resolution: BarcodeResolution | null) => void;
  onCancel: () => void;
}

export function BarcodeAnalyzingScreen({
  barcodeValue,
  onComplete,
  onCancel,
}: BarcodeAnalyzingScreenProps) {
  const startedAt = useRef(Date.now());
  const fired = useRef(false);
  const [_status, setStatus] = useState<'looking-up' | 'normalizing'>(
    'looking-up'
  );

  // Kick off the AI gateway barcode lookup. The lookup goes:
  //   client → /ai/barcode-lookup proxy → OBF API → Claude
  //   normalization → BarcodeResolution.
  //
  // Whatever shape comes back (or null, on total failure), pass it
  // through to BarcodeResult. The result screen branches on
  // resolution.found.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Keep the user on the analyzing screen briefly even if the
      // AI returns instantly (cached / dev fallback). 1.4s is the
      // floor — keeps it from feeling too snappy-fake.
      const [resolution] = await Promise.all([
        resolveBarcode({ barcodeValue }).catch(() => null),
        new Promise((r) => setTimeout(r, MIN_LOADING_MS)),
      ]);
      if (cancelled || fired.current) return;
      fired.current = true;
      hapt.medium();
      onComplete(resolution);
    })();
    return () => {
      cancelled = true;
    };
  }, [barcodeValue, onComplete]);

  // After 700ms swap the status copy from "Looking up" to
  // "Normalizing" so the user sees the system progressing through
  // real stages, not just spinning on one label.
  useEffect(() => {
    const t = setTimeout(() => setStatus('normalizing'), 700);
    return () => clearTimeout(t);
  }, []);

  const handleCancel = useCallback(() => {
    fired.current = true; // suppress the late onComplete fire
    hapt.select();
    onCancel();
  }, [onCancel]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel barcode lookup"
            onPress={handleCancel}
            hitSlop={10}
            style={({ pressed }) => [
              styles.cancelChip,
              pressed && { opacity: 0.85 },
            ]}
          >
            <ArrowLeft size={16} color={palette.bg} weight="bold" />
            <Text style={styles.cancelLabel} maxFontSizeMultiplier={1.1}>
              Cancel
            </Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <BarcodeStripe value={barcodeValue} />
          <Text style={styles.barcodeText} maxFontSizeMultiplier={1.1}>
            {barcodeValue}
          </Text>

          <View style={styles.kickerRow}>
            <PulsingDot />
            <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
              {_status === 'looking-up' ? 'LOOKING UP' : 'NORMALIZING'}
            </Text>
          </View>

          <Text style={styles.caption} maxFontSizeMultiplier={1.2}>
            {_status === 'looking-up'
              ? 'Looking up across the global product database…'
              : 'Normalizing brand and category from the lookup…'}
          </Text>
        </View>

        <Text style={styles.footnote} maxFontSizeMultiplier={1.1}>
          Powered by the open product database
        </Text>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// BarcodeStripe — renders a deterministic barcode-style strip from the digits.
// ---------------------------------------------------------------------------
//
// Not a real barcode encoding — just a visual cue that gives the screen
// a stable identity per scan. The widths are seeded by the digits so the
// same barcode always shows the same stripes.

function BarcodeStripe({ value }: { value: string }) {
  const stripes = useMemo(() => buildStripes(value), [value]);
  return (
    <View style={stripeStyles.wrap}>
      {stripes.map((w, i) => (
        <View
          key={i}
          style={{
            width: w,
            height: 60,
            marginRight: 2,
            backgroundColor:
              i % 7 === 0
                ? 'rgba(248,250,252,0.78)'
                : 'rgba(248,250,252,0.94)',
          }}
        />
      ))}
    </View>
  );
}

function buildStripes(value: string): number[] {
  // 30 bars max, each 1–4pt wide, derived from the digits.
  const out: number[] = [];
  const digits = value.replace(/\D/g, '');
  for (let i = 0; i < 30; i++) {
    const ch = digits.charCodeAt(i % digits.length);
    out.push(1 + ((ch * 7 + i * 3) % 4));
  }
  return out;
}

// ---------------------------------------------------------------------------
// PulsingDot — small status indicator next to the kicker.
// ---------------------------------------------------------------------------

function PulsingDot() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.5 * pulse.value,
    transform: [{ scale: 0.9 + 0.2 * pulse.value }],
  }));
  return <Animated.View style={[dotStyles.dot, dotStyle]} />;
}

const dotStyles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.clay,
  },
});

const stripeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    marginBottom: 14,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgInk },
  safe: { flex: 1 },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cancelChip: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    color: palette.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  barcodeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 1.6,
    color: 'rgba(248,250,252,0.95)',
    fontVariant: ['tabular-nums'],
    marginBottom: 28,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.8,
    color: palette.clay,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 22,
    color: 'rgba(248,250,252,0.82)',
    textAlign: 'center',
    maxWidth: 320,
  },
  footnote: {
    paddingBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(248,250,252,0.45)',
  },
});
