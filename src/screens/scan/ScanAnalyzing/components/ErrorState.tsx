/**
 * Warm-tone failure UI. Fires when AI takes longer than 12s or the
 * analysis call rejects. No alerts, no cold red — the error is framed as
 * "photo is safe, try again."
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudSlash, ArrowRight, X } from 'phosphor-react-native';
import { palette, scanTypography } from '@/theme';
import { hapt } from '@/utils/haptics';

export interface ErrorStateProps {
  onRetry: () => void;
  onAbort: () => void;
}

export function ErrorState({ onRetry, onAbort }: ErrorStateProps) {
  const handleRetry = () => {
    hapt.medium();
    onRetry();
  };
  const handleAbort = () => {
    hapt.select();
    onAbort();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleAbort}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <X size={18} weight="duotone" color={palette.ink} />
        </Pressable>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <CloudSlash
            size={48}
            weight="duotone"
            color="rgba(26,22,20,0.60)"
          />
        </View>

        <Text
          style={styles.headline}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header"
        >
          I couldn't finish this reading.
        </Text>

        <Text style={styles.bodyText} maxFontSizeMultiplier={1.2}>
          Sometimes the analysis doesn't come through. Your photo is safe —
          let's try again.
        </Text>

        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel="Try another scan"
        >
          <Text style={styles.primaryCtaLabel} maxFontSizeMultiplier={1.15}>
            Try another scan
          </Text>
          <ArrowRight size={18} weight="duotone" color={palette.bg} />
        </Pressable>

        <Pressable
          onPress={handleAbort}
          style={({ pressed }) => [styles.secondaryLink, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back to home"
          hitSlop={8}
        >
          <Text style={styles.secondaryLinkText} maxFontSizeMultiplier={1.15}>
            Go back to home
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerRow: {
    height: 68,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 32,
  },
  headline: {
    ...scanTypography.errorHeadline,
    color: palette.ink,
    marginBottom: 16,
  },
  bodyText: {
    ...scanTypography.errorBody,
    color: 'rgba(26,22,20,0.70)',
    marginBottom: 40,
  },
  primaryCta: {
    height: 56,
    width: '100%',
    borderRadius: 28,
    backgroundColor: palette.clay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: palette.clay,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryCtaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: palette.bg,
  },
  secondaryLink: {
    marginTop: 16,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: 'rgba(26,22,20,0.55)',
    textDecorationLine: 'underline',
  },
});
