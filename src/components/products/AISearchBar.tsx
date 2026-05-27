/**
 * v22.11 — AISearchBar rebuilt as a calm static premium search field.
 *
 * The previous implementation rendered a rotating LinearGradient
 * rainbow border. That treatment read as decorative/glitchy on the
 * Products tab and conflicted with the white/blue/gray product-
 * discovery direction. v22.11 replaces it with a stable rounded
 * field with three discrete visual states:
 *   • idle      — soft gray hairline border, white fill
 *   • focused   — soft blue border + faint blue tint
 *   • submitted — identical to idle (no animation while results render)
 *
 * No animations. No gradient. No LinearGradient import. No reanimated.
 * Native iOS-feel via plain View borders.
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface AISearchBarProps
  extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (v: string) => void;
  onClear: () => void;
}

// v22.11 — soft-blue focus accents. These are local to AISearchBar
// so we don't depend on palette tokens that may not exist; they're
// derived from the existing ink palette and chosen to read as a
// calm iOS-style focus state.
const FOCUS_BORDER = '#A7C4E0'; // soft blue hairline
const FOCUS_TINT = '#F4F8FC'; // barely-blue background
const BAR_HEIGHT = 50;

export function AISearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search products or skin goals',
  ...rest
}: AISearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.outerWrap}>
      <View
        style={[
          styles.field,
          isFocused ? styles.fieldFocused : styles.fieldIdle,
        ]}
      >
        <MagnifyingGlass
          size={18}
          color={isFocused ? palette.ink : palette.inkTertiary}
          weight="duotone"
        />
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.inkTertiary}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxFontSizeMultiplier={1.2}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {/* v22.11 — clear button slot. Always reserved (transparent
            when empty) so the input width never shifts on type. */}
        <Pressable
          onPress={value.length > 0 ? onClear : undefined}
          disabled={value.length === 0}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          accessibilityState={{ disabled: value.length === 0 }}
          style={({ pressed }) => [
            styles.clearBtn,
            { opacity: value.length === 0 ? 0 : pressed ? 0.6 : 1 },
          ]}
        >
          <X size={16} color={palette.inkTertiary} weight="duotone" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    height: BAR_HEIGHT,
    marginHorizontal: 20,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
  },
  fieldIdle: {
    backgroundColor: palette.bg,
    borderColor: palette.hairline,
  },
  fieldFocused: {
    backgroundColor: FOCUS_TINT,
    borderColor: FOCUS_BORDER,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: palette.ink,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
