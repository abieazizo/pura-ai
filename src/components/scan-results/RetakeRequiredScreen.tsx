/**
 * RetakeRequiredScreen — full-screen recovery state.
 *
 * Used when scan quality is too low to support honest result content.
 * Shows the captured photo dimmed, an elegant heading, a short
 * checklist of what to fix, and a single coral CTA: "Retake scan".
 * A secondary "Use limited result" link is shown only when the caller
 * has confirmed at least one high-confidence finding survived.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Check } from 'phosphor-react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  scanColors,
  scanLayout,
  scanRadius,
  scanShadows,
  scanType,
} from '@/theme/scanResultsTokens';

export interface RetakeRequiredScreenProps {
  photoUri: string | null;
  /** Optional override message from the AI / quality service. */
  detail?: string;
  onRetake(): void;
  /** When provided, renders the "Use limited result" secondary action. */
  onUseLimited?: () => void;
}

const CHECKLIST: ReadonlyArray<string> = [
  'Face centered',
  'Even lighting',
  'No hat or shadow over focus areas',
  'Camera at eye level',
];

export function RetakeRequiredScreen({
  photoUri,
  detail,
  onRetake,
  onUseLimited,
}: RetakeRequiredScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
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
        ) : null}

        <View style={styles.titleBlock}>
          <Text style={scanType.editorialHeading} maxFontSizeMultiplier={1.1}>
            Let’s try
          </Text>
          <Text
            style={[
              scanType.editorialHeading,
              { color: scanColors.coralDark, fontFamily: 'InstrumentSerif-Italic' },
            ]}
            maxFontSizeMultiplier={1.1}
          >
            another photo.
          </Text>
          <Text style={[scanType.body, styles.subtext]} maxFontSizeMultiplier={1.2}>
            {detail ??
              'A clearer view helps Pura map your skin accurately. A front-facing photo in even light is all it takes.'}
          </Text>
        </View>

        <View style={styles.checklist}>
          {CHECKLIST.map((line) => (
            <View key={line} style={styles.checkRow}>
              <View style={styles.checkIcon}>
                <Check size={14} weight="bold" color={scanColors.coralDark} />
              </View>
              <Text style={styles.checkText} maxFontSizeMultiplier={1.2}>
                {line}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaBlock}>
          <Pressable
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel="Retake scan"
            style={({ pressed }) => [
              styles.cta,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.1}>
              Retake scan
            </Text>
            <View style={styles.ctaArrow}>
              <ArrowRight size={16} weight="bold" color={scanColors.white} />
            </View>
          </Pressable>
          {onUseLimited ? (
            <Pressable
              onPress={onUseLimited}
              accessibilityRole="link"
              accessibilityLabel="Use limited result"
              hitSlop={10}
              style={({ pressed }) => [
                styles.secondary,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={scanType.secondaryAction} maxFontSizeMultiplier={1.2}>
                Use limited result
              </Text>
            </Pressable>
          ) : null}
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
    paddingTop: 22,
    alignItems: 'center',
  },
  thumbWrap: {
    width: 158,
    height: 210,
    borderRadius: scanRadius.imageFrame,
    overflow: 'hidden',
    backgroundColor: scanColors.cardSoft,
    ...scanShadows.softLift,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 242, 0.55)',
  },
  titleBlock: {
    marginTop: 26,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  subtext: {
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 320,
  },
  checklist: {
    marginTop: 26,
    backgroundColor: scanColors.cardSoft,
    borderRadius: scanRadius.largeCard,
    paddingVertical: 16,
    paddingHorizontal: 18,
    width: '100%',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: scanColors.coralWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    ...scanType.body,
    color: scanColors.inkSoft,
    fontFamily: 'Inter-Medium',
  },
  ctaBlock: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 18,
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
  secondary: {
    marginTop: 14,
    paddingVertical: 8,
  },
});
