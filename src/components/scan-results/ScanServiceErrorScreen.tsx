/**
 * ScanServiceErrorScreen — analysis service failure state.
 *
 * Used when the AI service did not return a structured analysis at all:
 * network failure, server failure, parse failure, timeout, unauthorized.
 * This is NOT the same thing as a successful scan with no findings —
 * the scan was attempted but the SYSTEM failed.
 *
 * This screen never shows fake findings, never shows a skin map, never
 * routes the user into the Routine builder.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowClockwise, Camera } from 'phosphor-react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  scanColors,
  scanLayout,
  scanRadius,
  scanShadows,
  scanType,
} from '@/theme/scanResultsTokens';
import type { ScanAnalysisErrorCode } from '@/types/scanResults';

export interface ScanServiceErrorScreenProps {
  photoUri?: string | null;
  errorCode?: ScanAnalysisErrorCode;
  userMessage?: string;
  onTryAgain(): void;
  onRetakePhoto(): void;
}

const DEFAULT_MESSAGE_BY_CODE: Record<ScanAnalysisErrorCode, string> = {
  network_error:
    'We could not reach the analysis service. Check your connection and try again.',
  server_error:
    'The analysis service hit an unexpected issue. Try again in a moment.',
  invalid_response:
    'The analysis service returned an unexpected result. Try the same photo again.',
  timeout:
    'The analysis took longer than expected. Try the same photo again, or retake.',
  unauthorized:
    'We could not authorize the analysis request. Try again in a moment.',
  unknown:
    'Something went wrong while analyzing your scan. Try again or retake the photo.',
};

export function ScanServiceErrorScreen({
  photoUri,
  errorCode = 'unknown',
  userMessage,
  onTryAgain,
  onRetakePhoto,
}: ScanServiceErrorScreenProps) {
  const detail = userMessage ?? DEFAULT_MESSAGE_BY_CODE[errorCode];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={styles.center}>
          {photoUri ? (
            <View style={styles.thumbWrap}>
              <ExpoImage
                source={{ uri: photoUri }}
                style={styles.thumb}
                contentFit="cover"
                cachePolicy="memory"
              />
              <View style={styles.thumbDim} />
            </View>
          ) : (
            <View style={styles.errorEmblem}>
              <View style={styles.errorCore} />
            </View>
          )}

          <Text
            style={[scanType.eyebrow, styles.eyebrow]}
            maxFontSizeMultiplier={1.15}
          >
            Analysis incomplete
          </Text>

          <View>
            <Text style={styles.title} maxFontSizeMultiplier={1.1}>
              We couldn't analyze
            </Text>
            <Text
              style={[styles.title, styles.titleItalic]}
              maxFontSizeMultiplier={1.1}
            >
              this scan.
            </Text>
          </View>

          <Text style={styles.body} maxFontSizeMultiplier={1.2}>
            Your photo was captured, but Pura could not complete the
            analysis.
          </Text>

          <Text style={styles.bodySoft} maxFontSizeMultiplier={1.2}>
            {detail}
          </Text>
        </View>

        <View style={styles.ctaBlock}>
          <Pressable
            onPress={onTryAgain}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [
              styles.cta,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.1}>
              Try again
            </Text>
            <View style={styles.ctaArrow}>
              <ArrowClockwise size={16} weight="bold" color={scanColors.white} />
            </View>
          </Pressable>

          <Pressable
            onPress={onRetakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
            style={({ pressed }) => [
              styles.secondaryCta,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Camera size={16} weight="regular" color={scanColors.coralDark} />
            <Text style={scanType.secondaryAction} maxFontSizeMultiplier={1.2}>
              Retake photo
            </Text>
          </Pressable>

          <Text style={styles.footnote} maxFontSizeMultiplier={1.2}>
            No routine was created from this scan.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: scanLayout.pageHorizontalPadding,
    paddingTop: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  thumbWrap: {
    width: 132,
    height: 176,
    borderRadius: scanRadius.imageFrame,
    overflow: 'hidden',
    backgroundColor: scanColors.cardSoft,
    ...scanShadows.softLift,
    marginBottom: 22,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 242, 0.55)',
  },
  errorEmblem: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: scanColors.coralWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  errorCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: scanColors.coralStrong,
  },
  eyebrow: {
    marginBottom: 14,
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 37,
    lineHeight: 41,
    letterSpacing: -0.35,
    color: scanColors.ink,
    textAlign: 'center',
  },
  titleItalic: {
    fontFamily: 'InstrumentSerif-Italic',
    color: scanColors.coralDark,
  },
  body: {
    ...scanType.body,
    color: scanColors.inkSoft,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 22,
    maxWidth: 320,
  },
  bodySoft: {
    ...scanType.body,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  ctaBlock: {
    paddingBottom: 14,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: scanColors.coralStrong,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: scanRadius.button,
    ...scanShadows.glow,
  },
  ctaLabel: {
    ...scanType.buttonLabel,
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: scanColors.coralDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  footnote: {
    ...scanType.caption,
    marginTop: 14,
    textAlign: 'center',
  },
});
