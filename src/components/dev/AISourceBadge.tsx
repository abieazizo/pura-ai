/**
 * Floating pill that shows whether the screen is currently driven by
 * real AI or by deterministic fallback.
 *
 * v10.27 — visibility gated on an EXPLICIT env opt-in
 * (`EXPO_PUBLIC_PURA_AI_DEV_BADGE === '1'`) rather than on `__DEV__`.
 * `__DEV__` is true in every Expo Go session and every Expo web
 * preview, which meant the "FALLBACK" pill was leaking into the
 * normal-usage experience. The badge is a developer tool — it should
 * never be visible by default. To turn it on:
 *
 *   EXPO_PUBLIC_PURA_AI_DEV_BADGE=1 npm start
 *
 * In all other configurations the component returns `null` and adds
 * zero footprint to the screen.
 *
 * When enabled, a small clay/rust/sand pill anchors to the top-right
 * of the screen showing one of:
 *     AI       — the feature's last call resolved through the proxy
 *     FALLBACK — fallback path ran (no proxy / failed / validation)
 *     PENDING  — in-flight call
 *     IDLE     — feature hasn't run yet on this screen
 *
 * Tapping the pill opens the diagnostics drawer (`AIDiagnosticsScreen`).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAITelemetry,
  type AIFeatureKey,
  type AIFeatureSource,
} from '@/ai/aiTelemetry';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

export interface AISourceBadgeProps {
  feature: AIFeatureKey;
  /** Optional position override; defaults to top-right with safe-area inset. */
  anchor?: 'top-right' | 'top-left';
}

const DEV_BADGE_ENABLED =
  (process.env.EXPO_PUBLIC_PURA_AI_DEV_BADGE ?? '').trim() === '1';

export function AISourceBadge({
  feature,
  anchor = 'top-right',
}: AISourceBadgeProps) {
  // v10.27 — never render unless the developer explicitly opts in.
  // `__DEV__` is true in Expo Go and web preview, so it can't be a
  // gate. Only enabled when EXPO_PUBLIC_PURA_AI_DEV_BADGE === '1'.
  if (!DEV_BADGE_ENABLED) return null;

  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const featureSnap = useAITelemetry((s) => s.features[feature]);
  const isProxyConfigured = useAITelemetry(
    (s) =>
      s.methods.analyzeFaceScan.counts.ok +
        s.methods.analyzeFaceScan.counts.fail +
        s.methods.matchProductsForUser.counts.ok +
        s.methods.matchProductsForUser.counts.fail >
      0
  );
  void isProxyConfigured; // reserved for future "no calls yet" indicator

  const { label, color, bg, ring } = decoForSource(featureSnap.source);

  const openDiagnostics = () => {
    hapt.select();
    try {
      nav.navigate('AIDiagnostics' as never);
    } catch {
      // Navigator not yet ready — silent.
    }
  };

  const positionStyle =
    anchor === 'top-right'
      ? { top: insets.top + 6, right: 14 }
      : { top: insets.top + 6, left: 14 };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, positionStyle]}>
      <Pressable
        onPress={openDiagnostics}
        accessibilityRole="button"
        accessibilityLabel={`AI source: ${label}. Tap for diagnostics.`}
        hitSlop={8}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: bg, borderColor: ring },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text
          style={[styles.label, { color }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

function decoForSource(source: AIFeatureSource): {
  label: string;
  color: string;
  bg: string;
  ring: string;
} {
  switch (source) {
    case 'ai':
      return {
        label: 'AI',
        color: palette.mossDeep,
        bg: palette.mossLight,
        ring: palette.moss,
      };
    case 'fallback':
      return {
        label: 'FALLBACK',
        color: palette.rust,
        bg: palette.rustLight,
        ring: palette.rust,
      };
    case 'pending':
      return {
        label: 'AI…',
        color: palette.clay,
        bg: palette.clayPaper,
        ring: palette.clay,
      };
    case 'idle':
    default:
      return {
        label: 'IDLE',
        color: palette.inkTertiary,
        bg: palette.bgDeep,
        ring: palette.hairline,
      };
  }
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.0,
  },
});
