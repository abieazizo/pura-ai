/**
 * LimitedScanInterstitial — shown immediately after analysis when the
 * scan landed in the `limited_results` tier. The user explicitly
 * chooses to continue with limited findings or retake for a fuller
 * map.
 *
 * Critical contract: this screen is shown BEFORE the analyzing screen
 * advertises 100%. The interstitial is the gate. If the user picks
 * `Continue`, the analyzing screen will then complete its progress
 * bar and transition into the results pager. If they pick `Retake`,
 * we route back to the camera with no fake reveal.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

export interface LimitedScanInterstitialProps {
  photoUri: string;
  reasons: string[];
  findingCount: number;
  onContinue(): void;
  onRetake(): void;
}

export function LimitedScanInterstitial({
  photoUri,
  reasons,
  findingCount,
  onContinue,
  onRetake,
}: LimitedScanInterstitialProps) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.1}>
            Limited scan
          </Text>
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.1}>
          Some areas read clearly.
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
          We’ll map what’s visible now. A front-facing photo in even
          light unlocks the full skin map.
        </Text>

        <View style={styles.photoWrap}>
          <ExpoImage
            source={{ uri: photoUri }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory"
          />
          <View style={styles.photoVeil} />
          {findingCount > 0 ? (
            <View style={styles.countBadgeFloat}>
              <View style={styles.countDot} />
              <Text style={styles.countText} maxFontSizeMultiplier={1.1}>
                {findingCount === 1
                  ? '1 area is clear'
                  : `${findingCount} areas are clear`}
              </Text>
            </View>
          ) : null}
        </View>

        {reasons.length > 0 ? (
          <View style={styles.reasonsCard}>
            <Text style={styles.reasonsTitle} maxFontSizeMultiplier={1.1}>
              What made it limited
            </Text>
            <View style={styles.reasonTagRow}>
              {reasons.slice(0, 4).map((reason) => (
                <View key={reason} style={styles.reasonTag}>
                  <Text style={styles.reasonTagText} maxFontSizeMultiplier={1.15}>
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.ctaBlock}>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue with limited results"
          style={({ pressed }) => [
            styles.primary,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.1}>
            Continue with limited results
          </Text>
          <View style={styles.primaryArrow}>
            <ArrowRight size={16} weight="bold" color={scanColors.white} />
          </View>
        </Pressable>
        <Pressable
          onPress={onRetake}
          accessibilityRole="button"
          accessibilityLabel="Retake for a clearer map"
          hitSlop={10}
          style={({ pressed }) => [
            styles.secondary,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={scanType.secondaryAction} maxFontSizeMultiplier={1.2}>
            Retake for a clearer map
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: scanColors.background,
  },
  scroll: {
    paddingHorizontal: scanLayout.pageHorizontalPadding,
    paddingTop: 20,
    paddingBottom: 24,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: scanColors.amber,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 2.2,
    color: scanColors.amberDeep,
    textTransform: 'uppercase',
  },
  title: {
    ...scanType.editorialHeading,
    marginBottom: 8,
  },
  subtitle: {
    ...scanType.body,
    marginBottom: 22,
    maxWidth: 360,
  },
  photoWrap: {
    width: 212,
    height: 282,
    borderRadius: scanRadius.imageFrame,
    overflow: 'hidden',
    alignSelf: 'center',
    ...scanShadows.softLift,
    marginBottom: 22,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 242, 0.20)',
  },
  countBadgeFloat: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: scanRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...scanShadows.softLift,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: scanColors.sage,
  },
  countText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: scanColors.inkSoft,
  },
  reasonsCard: {
    backgroundColor: scanColors.cardSoft,
    borderRadius: scanRadius.largeCard,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: scanColors.line,
    gap: 10,
  },
  reasonsTitle: {
    ...scanType.bodyStrong,
    color: scanColors.ink,
    marginBottom: 4,
  },
  reasonTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: scanRadius.pill,
    backgroundColor: scanColors.amberWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 162, 93, 0.42)',
  },
  reasonTagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: scanColors.amberDeep,
    letterSpacing: 0.2,
  },
  ctaBlock: {
    paddingHorizontal: scanLayout.pageHorizontalPadding,
    paddingBottom: 18,
    alignItems: 'center',
  },
  primary: {
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
  primaryLabel: {
    ...scanType.buttonLabel,
  },
  primaryArrow: {
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
