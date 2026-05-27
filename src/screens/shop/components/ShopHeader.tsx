/**
 * ShopHeader — editorial wordmark + wishlist / bag actions.
 * Generous spacing, refined icons, coral quantity badge only when
 * the user has something in their routine. The bag badge intentionally
 * uses the user's current routine count (morning ∪ evening, deduped)
 * since that is the closest existing concept to a "bag" in the app
 * state and the brief said real wiring matters.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkle, Heart, ShoppingBagOpen } from 'phosphor-react-native';
import { puraShop, puraShopLayout, puraShopType } from '@/theme';

export interface ShopHeaderProps {
  savedCount: number;
  bagCount: number;
  onPressSaved: () => void;
  onPressBag: () => void;
}

export function ShopHeader({
  savedCount,
  bagCount,
  onPressSaved,
  onPressBag,
}: ShopHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.05}
          style={styles.title}
        >
          Pura Shop
        </Text>
        <Sparkle
          size={14}
          color={puraShop.coral}
          weight="fill"
          style={styles.sparkle}
        />
      </View>

      <View style={styles.actions}>
        <IconCircle
          ariaLabel={savedCount > 0 ? `Saved (${savedCount})` : 'Saved items'}
          onPress={onPressSaved}
        >
          <Heart
            size={20}
            weight={savedCount > 0 ? 'fill' : 'regular'}
            color={savedCount > 0 ? puraShop.coral : puraShop.ink}
          />
        </IconCircle>
        <View style={{ width: 12 }} />
        <IconCircle
          ariaLabel={
            bagCount > 0
              ? `Your routine, ${bagCount} item${bagCount === 1 ? '' : 's'}`
              : 'Your routine'
          }
          onPress={onPressBag}
        >
          <ShoppingBagOpen size={20} weight="regular" color={puraShop.ink} />
          {bagCount > 0 ? (
            <View style={styles.badge}>
              <Text
                style={styles.badgeText}
                maxFontSizeMultiplier={1.0}
                allowFontScaling={false}
              >
                {bagCount > 9 ? '9+' : String(bagCount)}
              </Text>
            </View>
          ) : null}
        </IconCircle>
      </View>
    </View>
  );
}

function IconCircle({
  onPress,
  ariaLabel,
  children,
}: {
  onPress: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.iconBtnPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    ...puraShopType.headerSerif,
    color: puraShop.ink,
  },
  sparkle: {
    marginLeft: 4,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnPressed: {
    backgroundColor: puraShop.coralSoft,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: puraShop.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: puraShop.canvas,
    shadowColor: puraShop.coralDeep,
    shadowOpacity: 0.32,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badgeText: {
    color: puraShop.badgeText,
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    lineHeight: 12,
  },
});
