/**
 * RetakeRequiredScreen — full-screen recovery state.
 *
 * v35 Pass-1, State 8 — Direction A "The Returned".
 *
 * Previous treatment dimmed the captured photo to 55% opacity, ran a
 * two-line italic-accented title ("Let's try / another photo."), a
 * 4-item check-grid, and a coral CTA — clinical and apologetic, the
 * exact failure mode the design framework bans on retake.
 *
 * The Returned moves to:
 *   • The captured photo is shown at ~60% width on a tilted (~3°)
 *     paper "Polaroid" card with a soft drop shadow — feels HELD,
 *     not rejected. The tilt is the visual signature.
 *   • A single Instrument Serif italic coaching word above the
 *     photo derived from the AI's reason: "Closer." / "Steadier." /
 *     "Brighter." Default "Again." when reason is unknown.
 *   • A short single-sentence body line beneath the photo, only
 *     when a meaningful detail was passed (defaults to nothing —
 *     the coaching word does the work).
 *   • A single paper-card CTA: "One more time." with a small
 *     terracotta arrow.
 *   • Optional "Use limited result" secondary preserved.
 *
 * Brand position: warmth, not judgment. The Polaroid tilt + the
 * single italic word are the unmistakably-Pura signature at the
 * moment the user is most likely to feel rejected.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'phosphor-react-native';
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

/**
 * Derive the single coaching word from the AI's quality detail string.
 * The matcher is intentionally lenient — practitioner-tone, not
 * keyword-strict. When the reason doesn't match any known dimension we
 * fall back to "Again." so the screen never feels broken.
 */
function deriveCoachingWord(detail: string | undefined): string {
  if (!detail) return 'Again';
  const lower = detail.toLowerCase();
  if (
    lower.includes('blur') ||
    lower.includes('soft') ||
    lower.includes('steady') ||
    lower.includes('focus')
  )
    return 'Steadier';
  if (
    lower.includes('light') ||
    lower.includes('dark') ||
    lower.includes('shadow') ||
    lower.includes('exposure')
  )
    return 'Brighter';
  if (
    lower.includes('partial') ||
    lower.includes('frame') ||
    lower.includes('center') ||
    lower.includes('crop')
  )
    return 'Closer';
  if (lower.includes('cover') || lower.includes('hair') || lower.includes('occlud')) {
    return 'Clear';
  }
  return 'Again';
}

export function RetakeRequiredScreen({
  photoUri,
  detail,
  onRetake,
  onUseLimited,
}: RetakeRequiredScreenProps) {
  const coaching = deriveCoachingWord(detail);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        {/* Single italic coaching word — the brand signature at the
            moment the user is most likely to feel judged. */}
        <Text
          style={styles.coachingWord}
          maxFontSizeMultiplier={1.05}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${coaching}. Take another photo.`}
        >
          {coaching}.
        </Text>

        {/* Tilted Polaroid — feels held, not rejected. */}
        {photoUri ? (
          <View style={styles.polaroidWrap}>
            <View style={styles.polaroid}>
              <ExpoImage
                source={{ uri: photoUri }}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="memory"
              />
            </View>
          </View>
        ) : null}

        {/* Optional supporting line — only when a meaningful detail
            was passed. The coaching word usually does the work. */}
        {detail ? (
          <Text
            style={[scanType.body, styles.detail]}
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
          >
            {detail}
          </Text>
        ) : null}

        <View style={styles.ctaBlock}>
          <Pressable
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel="Take another photo"
            style={({ pressed }) => [
              styles.cta,
              pressed && { transform: [{ scale: 0.985 }] },
            ]}
          >
            <Text style={styles.ctaLabel} maxFontSizeMultiplier={1.1}>
              One more time
            </Text>
            <View style={styles.ctaArrow}>
              <ArrowRight size={14} weight="bold" color={scanColors.coralDark} />
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
    paddingTop: 38,
    alignItems: 'center',
  },
  // Instrument Serif italic — sized to read at iPhone-arms-length as
  // editorial, not loud. Tracking slightly tightened so the word
  // composes as a single object, not as letters.
  coachingWord: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.2,
    color: scanColors.coralDark,
    marginBottom: 28,
  },
  // Polaroid frame: white paper border around the photo, tilted ~3°,
  // soft drop shadow. The tilt is the visual signature of the state.
  polaroidWrap: {
    transform: [{ rotate: '-2.6deg' }],
    ...scanShadows.softLift,
  },
  polaroid: {
    backgroundColor: scanColors.white,
    padding: 10,
    paddingBottom: 36, // classic Polaroid bottom strip
    borderRadius: 6,
  },
  photo: {
    width: 200,
    height: 264,
    borderRadius: 3,
    backgroundColor: scanColors.cardSoft,
  },
  detail: {
    marginTop: 26,
    textAlign: 'center',
    maxWidth: 300,
    color: scanColors.inkSoft,
  },
  ctaBlock: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 22,
    alignItems: 'center',
    gap: 14,
  },
  // Paper-card CTA — restrained, not loud. The terracotta arrow inside
  // the chip is the only saturated mark on this screen.
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: scanColors.cardSoft,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: scanRadius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
  },
  ctaLabel: {
    ...scanType.buttonLabel,
    color: scanColors.inkSoft,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
  ctaArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: scanColors.coralWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    paddingVertical: 6,
  },
});
