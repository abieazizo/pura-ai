import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { palette, space } from '@/theme';
import type { Scan } from '@/types';

export interface PhotoTimelineStripProps {
  scans: Scan[];
  selectedId: string | null;
  onSelect: (s: Scan) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * v10.2 — premium flat timeline. Previous version rotated frames ±2°
 * for "editorial feel" and only showed "DAY N" labels. The rotation read
 * as gimmicky against the rest of the cool flat system, and the timeline
 * carried no information beyond the photo.
 *
 * Rebuilt: flat frames, slightly larger (80×106), with the DAY kicker
 * above and the Skin Score below each photo. The selected frame rides a
 * 1.5pt clay border and the DAY kicker flips to clay. The timeline now
 * reads as an actual chart of scans, not a scattered polaroid stack.
 */
export function PhotoTimelineStrip({
  scans,
  selectedId,
  onSelect,
  style,
}: PhotoTimelineStripProps) {
  return (
    <FlatList
      data={scans}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      style={style}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Day ${item.dayNumber}, Skin Score ${item.overallScore}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.item,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text
              style={[styles.dayKicker, selected && styles.dayKickerSelected]}
              maxFontSizeMultiplier={1.1}
            >
              {`DAY ${item.dayNumber}`}
            </Text>
            <View style={[styles.frame, selected && styles.frameSelected]}>
              <Image
                source={item.photoUri}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            </View>
            <Text
              style={[styles.score, selected && styles.scoreSelected]}
              maxFontSizeMultiplier={1.1}
            >
              {item.overallScore}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  item: {
    alignItems: 'center',
    gap: 8,
  },
  dayKicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
  },
  dayKickerSelected: {
    color: palette.clay,
  },
  frame: {
    width: 80,
    height: 106,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bgDeep,
  },
  frameSelected: {
    borderColor: palette.clay,
    borderWidth: 1.5,
  },
  score: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    letterSpacing: -0.4,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  scoreSelected: {
    color: palette.ink,
  },
});
