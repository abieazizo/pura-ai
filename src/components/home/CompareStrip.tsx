import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowRight } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface CompareStripProps {
  day1Uri: string;
  todayUri: string;
  onPress?: () => void;
}

/**
 * Compare strip (§4.8). Kicker + two 80x80 thumbnails with a terracotta
 * arrow between + an italic serif label. No card chrome. If there's no today
 * photo, the parent should refuse to render this component entirely.
 */
export function CompareStrip({ day1Uri, todayUri, onPress }: CompareStripProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Compare Day 1 with today"
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        COMPARE
      </Text>
      <View style={styles.row}>
        <Image source={day1Uri} style={styles.thumb} contentFit="cover" />
        <ArrowRight size={20} color={palette.clay} weight="regular" />
        <Image source={todayUri} style={styles.thumb} contentFit="cover" />
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          Day 1 → Today
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: palette.bgDeep,
  },
  label: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: 'rgba(26,22,20,0.7)',
    marginLeft: 4,
  },
});
