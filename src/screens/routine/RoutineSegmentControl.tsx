/**
 * RoutineSegmentControl — Morning / Evening / Saved switcher.
 *
 * Stateless; controlled by the parent. Renders the active slot's count
 * chip when > 0. Haptic feedback on change is handled by the parent.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookmarkSimple, Moon, Sun } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import type { InnerSegment } from '@/screens/routine/lib';

interface Props {
  active: InnerSegment;
  onChange: (s: InnerSegment) => void;
  morningCount: number;
  eveningCount: number;
  savedCount: number;
}

export function RoutineSegmentControl({
  active,
  onChange,
  morningCount,
  eveningCount,
  savedCount,
}: Props) {
  const SEGS: Array<{
    id: InnerSegment;
    label: string;
    Icon: React.FC<{ size: number; color: string; weight: 'regular' | 'duotone' }>;
    count: number;
  }> = [
    { id: 'morning', label: 'Morning', Icon: Sun, count: morningCount },
    { id: 'evening', label: 'Evening', Icon: Moon, count: eveningCount },
    { id: 'saved', label: 'Saved', Icon: BookmarkSimple, count: savedCount },
  ];
  return (
    <View style={styles.inner}>
      {SEGS.map((seg) => {
        const selected = seg.id === active;
        const Icon = seg.Icon;
        return (
          <Pressable
            key={seg.id}
            onPress={() => {
              if (seg.id === active) return;
              hapt.select();
              onChange(seg.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.seg,
              selected && styles.segSelected,
              pressed && !selected && { opacity: 0.85 },
            ]}
          >
            <Icon
              size={14}
              color={selected ? palette.inkInverse : palette.inkSecondary}
              weight={selected ? 'duotone' : 'regular'}
            />
            <Text
              style={[
                styles.label,
                { color: selected ? palette.inkInverse : palette.inkSecondary },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {seg.label}
            </Text>
            {seg.count > 0 ? (
              <View
                style={[
                  styles.count,
                  selected
                    ? { backgroundColor: 'rgba(248,250,252,0.22)' }
                    : { backgroundColor: palette.bgDeep },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: selected ? palette.inkInverse : palette.inkSecondary,
                    },
                  ]}
                  maxFontSizeMultiplier={1.1}
                >
                  {seg.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    backgroundColor: palette.bgDeep,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  seg: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segSelected: {
    backgroundColor: palette.ink,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  count: {
    marginLeft: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
});
