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
import { palette, space, type as typography } from '@/theme';
import type { Scan } from '@/types';

export interface PhotoTimelineStripProps {
  scans: Scan[];
  selectedId: string | null;
  onSelect: (s: Scan) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * v5 timeline strip. 72×96 frames with alternating rotation (-2° / +2°)
 * for editorial feel. Selected frame gets a clay hairline ring.
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
      renderItem={({ item, index }) => {
        const selected = item.id === selectedId;
        const rotation = index % 2 === 0 ? -2 : 2;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Day ${item.dayNumber}`}
            style={({ pressed }) => [
              styles.item,
              { transform: [{ rotate: `${rotation}deg` }] },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.frame, selected && styles.frameSelected]}>
              <Image
                source={item.photoUri}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              DAY {item.dayNumber}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  item: { alignItems: 'center' },
  frame: {
    width: 72,
    height: 96,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bgDeep,
  },
  frameSelected: {
    borderColor: palette.clay,
    borderWidth: 2,
  },
  label: {
    ...typography.micro,
    color: palette.inkTertiary,
    marginTop: 8,
  },
  labelSelected: {
    color: palette.clay,
  },
});
