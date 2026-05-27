/**
 * ConfidenceWarningCard — top-of-Progress low-confidence card.
 *
 * The existing StatusPill subline tells you confidence is low; this
 * elevates it to a real, actionable card near the top of Progress so
 * the user doesn't miss it. Calm tone, no scolding.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Info } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

interface Props {
  onRetake: () => void;
  /** Optional secondary: dismiss / keep results. */
  onKeepResults?: () => void;
}

export function ConfidenceWarningCard({ onRetake, onKeepResults }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.iconWrap}>
          <Info size={16} color={palette.amberDeep} weight="duotone" />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          Scan confidence is low
        </Text>
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={1.2} numberOfLines={4}>
        Lighting may have affected today’s read, so your results are
        approximate. Retake in bright, even light for a sharper routine
        and progress update.
      </Text>

      <View style={styles.tipsRow}>
        <Text style={styles.tipsKicker} maxFontSizeMultiplier={1.1}>
          QUICK TIPS
        </Text>
        <View style={styles.tipsList}>
          {[
            'Face a window or bright even light',
            'Keep your face centered',
            'Avoid harsh shadows',
            'Use the same angle each time',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text
                style={styles.tipText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={() => {
            hapt.tap();
            onRetake();
          }}
          accessibilityRole="button"
          accessibilityLabel="Retake scan"
          style={({ pressed }) => [
            styles.primaryCta,
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
        >
          <Camera size={14} color={palette.inkInverse} weight="duotone" />
          <Text style={styles.primaryCtaText} maxFontSizeMultiplier={1.15}>
            Retake scan
          </Text>
        </Pressable>
        {onKeepResults ? (
          <Pressable
            onPress={() => {
              hapt.select();
              onKeepResults();
            }}
            accessibilityRole="button"
            accessibilityLabel="Keep current results"
            style={({ pressed }) => [
              styles.secondaryCta,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.secondaryCtaText} maxFontSizeMultiplier={1.15}>
              Keep results
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: palette.amberLight,
    borderWidth: 1,
    borderColor: palette.amber,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.amberDeep,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.amberDeep,
    marginBottom: 12,
  },
  tipsRow: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: palette.bg,
    borderRadius: 12,
    marginBottom: 12,
  },
  tipsKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.amberDeep,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tipsList: {
    gap: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.amber,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.ink,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
  primaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
  secondaryCta: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.amber,
  },
  secondaryCtaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    color: palette.amberDeep,
  },
});
