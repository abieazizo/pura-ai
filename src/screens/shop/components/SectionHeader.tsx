/**
 * SectionHeader — section title + supporting subline + View all link.
 * Uses the editorial serif at section-level scale. The View all chip
 * is a subtle warm pill — restrained but discoverable.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { puraShop, puraShopLayout, puraShopRadius, puraShopType } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  subline?: string;
  onViewAll?: () => void;
}

export function SectionHeader({ title, subline, onViewAll }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text
          style={styles.title}
          maxFontSizeMultiplier={1.15}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subline ? (
          <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
            {subline}
          </Text>
        ) : null}
      </View>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          style={({ pressed }) => [
            styles.viewAll,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.viewAllText} maxFontSizeMultiplier={1.15}>
            View all
          </Text>
          <CaretRight size={13} color={puraShop.viewAll} weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...puraShopType.sectionSerif,
    color: puraShop.sectionTitle,
  },
  sub: {
    ...puraShopType.sectionSub,
    color: puraShop.sectionSub,
    marginTop: 4,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: puraShop.viewAllPillBg,
    borderRadius: puraShopRadius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: puraShop.borderWarm,
  },
  viewAllText: {
    ...puraShopType.viewAll,
    color: puraShop.viewAll,
  },
});
