/**
 * Dev-only setup banner.
 *
 * v10.28 — when the developer is debugging the AI integration, this
 * banner makes it impossible to miss the live-vs-fallback state. It
 * renders one of three states:
 *
 *   • PROXY UNREACHABLE — the proxy URL is set but `/healthz` failed
 *     or never returned (4-second timeout). Banner is amber, with a
 *     RETRY action that re-pings.
 *
 *   • PROXY NOT CONFIGURED — `EXPO_PUBLIC_PURA_AI_PROXY_URL` is empty.
 *     Banner is rust, with copy linking the developer to the setup
 *     docs ("Run `npm run dev` to boot the proxy").
 *
 *   • PROXY HEALTHY — banner returns null; nothing displayed.
 *
 * Like the AISourceBadge, this banner is hard-gated on
 * `EXPO_PUBLIC_PURA_AI_DEV_BADGE === '1'`. End users never see it.
 *
 * Tapping the banner opens the diagnostics drawer, which has the
 * full per-method status + smoke test runner.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowsClockwise, Warning, WarningOctagon } from 'phosphor-react-native';
import { useAITelemetry } from '@/ai/aiTelemetry';
import { aiGateway } from '@/ai/aiGateway';
import { rePingProxyHealthz } from '@/ai/aiHealthProbe';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

const DEV_BADGE_ENABLED =
  (process.env.EXPO_PUBLIC_PURA_AI_DEV_BADGE ?? '').trim() === '1';

export function AIStatusBanner() {
  if (!DEV_BADGE_ENABLED) return null;

  const nav = useNavigation();
  const healthz = useAITelemetry((s) => s.healthz);
  const isAvailable = aiGateway.isAvailable();

  // Healthy → render nothing.
  if (isAvailable && healthz.ok === true) return null;
  // Probe hasn't returned yet → render nothing rather than flash.
  if (isAvailable && healthz.pingedAt === null) return null;

  const notConfigured = !isAvailable;
  const Icon = notConfigured ? WarningOctagon : Warning;
  const tint = notConfigured ? palette.rust : palette.amber;
  const bg = notConfigured ? palette.rustLight : palette.amber + '20';
  const title = notConfigured ? 'AI proxy not configured' : 'AI proxy unreachable';
  const detail = notConfigured
    ? 'Set EXPO_PUBLIC_PURA_AI_PROXY_URL and run `npm run dev`.'
    : healthz.detail ?? 'Tap to retry.';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          hapt.select();
          try {
            // @ts-expect-error nav typing intentionally loose for dev surface
            nav.navigate('AIDiagnostics');
          } catch {
            /* swallow */
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${detail}. Tap to open diagnostics.`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: bg, borderColor: tint },
          pressed && { opacity: 0.92 },
        ]}
      >
        <Icon size={16} color={tint} weight="duotone" />
        <View style={styles.text}>
          <Text style={[styles.title, { color: tint }]} maxFontSizeMultiplier={1.1}>
            {title}
          </Text>
          <Text
            style={styles.detail}
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
          >
            {detail}
          </Text>
        </View>
        {!notConfigured ? (
          <Pressable
            onPress={() => {
              hapt.select();
              void rePingProxyHealthz();
            }}
            accessibilityRole="button"
            accessibilityLabel="Re-ping proxy"
            hitSlop={8}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <ArrowsClockwise size={11} color={palette.ink} weight="bold" />
            <Text style={styles.retryLabel} maxFontSizeMultiplier={1.1}>
              RETRY
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detail: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 14,
    color: palette.inkSecondary,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.bg,
  },
  retryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.6,
    color: palette.ink,
  },
});
