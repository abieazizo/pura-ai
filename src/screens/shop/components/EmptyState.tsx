/**
 * EmptyState — refined neutral surface shown when a filter narrows
 * the catalog to zero products. No "broken state" feeling — copy
 * the user toward an action.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import {
  puraShop,
  puraShopLayout,
  puraShopRadius,
  puraShopShadow,
  puraShopType,
} from '@/theme';

export interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <Sparkle size={20} color={puraShop.coral} weight="fill" />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {title}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.2}>
          {body}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [
              styles.action,
              pressed && { opacity: 0.86 },
            ]}
          >
            <Text style={styles.actionText} maxFontSizeMultiplier={1.15}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
  },
  panel: {
    backgroundColor: puraShop.surface,
    borderRadius: puraShopRadius.card,
    borderWidth: 1,
    borderColor: puraShop.cardBorder,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...puraShopShadow.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: puraShop.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    ...puraShopType.sectionSerif,
    color: puraShop.ink,
    textAlign: 'center',
  },
  body: {
    ...puraShopType.benefitLine,
    color: puraShop.inkSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  action: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: puraShopRadius.pricePill,
    backgroundColor: puraShop.ink,
  },
  actionText: {
    ...puraShopType.viewAll,
    color: puraShop.inkOnDark,
  },
});
