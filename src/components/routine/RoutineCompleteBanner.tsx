/**
 * RoutineCompleteBanner — v23.3 all-steps-done state.
 *
 * Renders only when every step in the active slot is checked. Calm,
 * non-gamified celebration: tells the user what they actually
 * accomplished today and what the next move is, without streak
 * pressure or sticker-book points.
 *
 * Spec copy:
 *   "Morning routine complete"
 *   "Hydration support locked in. Scan again in 2–3 days to track the trend."
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Camera } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

interface Props {
  segment: 'morning' | 'evening';
  /** "hydration", "barrier", etc — drives the subtle "Hydration support locked in." copy. */
  focusLabel: string;
  /** Tap → camera screen. */
  onScanAgain: () => void;
}

export function RoutineCompleteBanner({
  segment,
  focusLabel,
  onScanAgain,
}: Props) {
  const headline =
    segment === 'morning' ? 'Morning routine complete' : 'Evening routine complete';
  const body = `${focusLabel} locked in. Scan again in 2–3 days to track the trend.`;
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <CheckCircle size={22} color={palette.mossDeep} weight="fill" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          {headline}
        </Text>
        <Text
          style={styles.body}
          maxFontSizeMultiplier={1.2}
          numberOfLines={3}
        >
          {body}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          hapt.tap();
          onScanAgain();
        }}
        accessibilityRole="button"
        accessibilityLabel="Scan again to track your trend"
        style={({ pressed }) => [
          styles.cta,
          pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Camera size={13} color={palette.inkInverse} weight="duotone" />
        <Text style={styles.ctaText} maxFontSizeMultiplier={1.15}>
          Scan
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: palette.mossLight,
    borderWidth: 1,
    borderColor: palette.moss,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: palette.mossDeep,
    marginBottom: 2,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: palette.mossDeep,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: palette.ink,
  },
  ctaText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.2,
    color: palette.inkInverse,
  },
});
