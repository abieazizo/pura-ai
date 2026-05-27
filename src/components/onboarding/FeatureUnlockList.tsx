import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface FeatureUnlockItem {
  Icon: React.FC<PhosphorIconProps>;
  title: string;
  body: string;
}

export interface FeatureUnlockListProps {
  items: FeatureUnlockItem[];
}

/**
 * v20.0 — paywall "what you unlock" stack. A vertical list of icon ·
 * title · body rows. The icon sits in a soft tinted tile so the row
 * reads cleanly even on narrow phones; the body wraps and never
 * truncates because skim-readers stop at the title.
 */
export function FeatureUnlockList({ items }: FeatureUnlockListProps) {
  return (
    <View style={styles.wrap}>
      {items.map((item, i) => (
        <View
          key={item.title}
          style={[styles.row, i === items.length - 1 && styles.rowLast]}
          accessible
          accessibilityLabel={`${item.title}. ${item.body}`}
        >
          <View style={styles.iconTile}>
            <item.Icon size={20} color={palette.clay} weight="duotone" />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              {item.title}
            </Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.25}>
              {item.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginTop: 4,
  },
});
