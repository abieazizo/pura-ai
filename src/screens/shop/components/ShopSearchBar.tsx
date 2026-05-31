/**
 * ShopSearchBar — luminous white pill. Sparkle lead-in, live query,
 * optional inline clear-text affordance. No trailing submit disc:
 * search is live/debounced and the keyboard's search key submits, so a
 * filled circular CTA was dead weight (and read as a dark void).
 *
 * • Real focus state — border subtly intensifies when the field is
 *   focused (no glossy oversized sphere; restrained per the brief).
 * • Clear button appears only when there's text; tapping clears the
 *   query and re-focuses the input.
 * • Sparkle leading icon hints "AI search" without overclaiming.
 */

import React, { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Sparkle, X } from 'phosphor-react-native';
import {
  puraShop,
  puraShopLayout,
  puraShopRadius,
  puraShopShadow,
} from '@/theme';

export interface ShopSearchBarProps {
  value: string;
  onChangeText: (s: string) => void;
  onSubmit?: () => void;
  /** Rendered as a quiet inline clear-button when defined. */
  onClear?: () => void;
  /** Called when the field gains / loses focus. Used by the parent to
   *  render the suggestions panel (recent + popular). */
  onFocusChange?: (focused: boolean) => void;
}

const SEARCH_HEIGHT = 54;

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
      <View
        style={[
          styles.bar,
          {
            borderColor: focused
              ? puraShop.searchBorderFocus
              : puraShop.searchBorder,
          },
        ]}
      >
        <Sparkle
          size={20}
          color={puraShop.searchSparkle}
          weight="fill"
          style={styles.leadingIcon}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search products, ingredients, brands…"
          placeholderTextColor={puraShop.searchPlaceholder}
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
            <X size={14} color={puraShop.inkSecondary} weight="bold" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 18,
  },
  bar: {
    height: SEARCH_HEIGHT,
    borderRadius: puraShopRadius.search,
    backgroundColor: puraShop.searchBg,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...puraShopShadow.search,
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15.5,
    color: puraShop.ink,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: puraShop.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
});
