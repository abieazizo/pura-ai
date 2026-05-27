/**
 * ShopSearchBar — luminous white pill with a refined coral disc and
 * optional clear-text affordance.
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
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { MagnifyingGlass, Sparkle, X } from 'phosphor-react-native';
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

const SEARCH_HEIGHT = 58;
const CTA_SIZE = 40;

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
        <Pressable
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Run search"
          style={({ pressed }) => [
            styles.cta,
            pressed && { opacity: 0.88, transform: [{ scale: 0.95 }] },
          ]}
          hitSlop={6}
        >
          <Svg
            width={CTA_SIZE}
            height={CTA_SIZE}
            viewBox="0 0 100 100"
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <RadialGradient id="ctaGlow" cx="42%" cy="34%" rx="58%" ry="58%">
                <Stop offset="0%" stopColor={puraShop.coral} stopOpacity={1} />
                <Stop offset="100%" stopColor={puraShop.coralDeep} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill="url(#ctaGlow)" />
          </Svg>
          <MagnifyingGlass size={17} color={puraShop.white} weight="bold" />
        </Pressable>
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
    paddingRight: 8,
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
  cta: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
