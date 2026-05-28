/**
 * ShopSearchBar — pass 2 rebuild.
 *
 * Museum-catalog inquiry field. Hairline-bordered, no fill, lowercase
 * MagnifyingGlass at refined weight, italic-serif placeholder. No
 * rainbow sparkle. No CTA disc — the keyboard's return key submits.
 *
 * The bar lives within an editorial container with a small kicker
 * label above ("LOOK FOR") so the search field reads as a step in the
 * publication, not a top-of-page utility.
 */

import React, { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { puraShop, puraShopLayout } from '@/theme';

export interface ShopSearchBarProps {
  value: string;
  onChangeText: (s: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  onFocusChange?: (focused: boolean) => void;
}

export function ShopSearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onFocusChange,
}: ShopSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  const handleFocus = () => {
    setFocused(true);
    onFocusChange?.(true);
  };
  const handleBlur = () => {
    setFocused(false);
    onFocusChange?.(false);
  };

  return (
    <View style={styles.outer}>
      <View style={styles.kickerRow}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.05}>
          ASK THE EDIT
        </Text>
        <View style={styles.rule} />
      </View>

      <View
        style={[
          styles.bar,
          focused && styles.barFocused,
        ]}
      >
        <MagnifyingGlass
          size={16}
          color={puraShop.inkSecondary}
          weight="regular"
          style={styles.leadingIcon}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="an ingredient, a brand, a concern"
          placeholderTextColor={puraShop.inkMuted}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Search products, ingredients, or brands"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {onClear ? (
          <Pressable
            onPress={() => {
              onClear();
              inputRef.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <X size={12} color={puraShop.inkMuted} weight="bold" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 22,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: puraShop.inkMuted,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: puraShop.borderWarm,
  },
  bar: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: puraShop.borderWarm,
    paddingLeft: 0,
    paddingRight: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barFocused: {
    borderBottomColor: puraShop.ink,
  },
  leadingIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 18,
    color: puraShop.ink,
    paddingVertical: 0,
    letterSpacing: -0.1,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
