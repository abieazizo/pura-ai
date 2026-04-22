import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PuraMark, type MarkVariant } from './PuraMark';
import { AvatarButton } from './AvatarButton';
import { AIChip } from './AIChip';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useProfileSheet } from '@/hooks/useProfileSheet';
import { layout, palette, space } from '@/theme';
import { hapt } from '@/utils/haptics';

export type ScreenChromeChip = 'ai' | 'user' | 'none';

export interface ScreenChromeProps {
  /** Mark state — see PuraMark. Defaults to 'idle'. */
  markVariant?: MarkVariant;
  /** Override the mark color (e.g. inverse on dark screens). */
  markColor?: string;
  /**
   * Top-right chip. `'ai'` is the default for every main surface per v5
   * patch §2.7; `'user'` is reserved for ProfileSheet's own header; `'none'`
   * hides the chip entirely (onboarding, scan capture).
   *
   * Legacy `showAvatar={false}` alias maps to `chip="none"`.
   */
  chip?: ScreenChromeChip;
  /** Legacy. Prefer `chip`. Retained so v4 callers continue compiling. */
  showAvatar?: boolean;
  /** Inverse avatar tint (scan capture uses this). */
  inverse?: boolean;
  /** Optional handler that fires when the Mark itself is tapped. */
  onMarkPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The consistent chrome that lives above screen content: Mark top-left at
 * safe-area + inset, Avatar top-right. Every main screen mounts this.
 *
 * Place as the first child of a screen body so it can absolutely-position
 * the Mark and Avatar without shifting layout.
 */
export function ScreenChrome({
  markVariant = 'idle',
  markColor,
  chip,
  showAvatar,
  inverse = false,
  onMarkPress,
  style,
}: ScreenChromeProps) {
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const { open: openProfile } = useProfileSheet();

  // Resolve chip slot. If `chip` is passed, use it. Otherwise map the legacy
  // `showAvatar` boolean: undefined/true → 'ai' (new default), false → 'none'.
  const resolvedChip: ScreenChromeChip =
    chip ?? (showAvatar === false ? 'none' : 'ai');

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          top: insets.top + space.sm,
          left: layout.markInset,
          right: layout.markInset,
        },
        style,
      ]}
    >
      <Pressable
        onPress={() => {
          hapt.markTap();
          onMarkPress?.();
        }}
        accessibilityRole="button"
        accessibilityLabel="Pura"
        hitSlop={12}
        style={styles.markPress}
      >
        <PuraMark
          variant={markVariant}
          size="sm"
          color={markColor ?? (inverse ? palette.clayLight : palette.clay)}
          glow={false}
        />
      </Pressable>

      {resolvedChip === 'ai' ? (
        <AIChip
          size={layout.avatarSize}
          onPress={openProfile}
          // Inverse surfaces (scan capture) get a translucent fill so the
          // chip reads against the dark background.
          fill={inverse ? 'rgba(250,247,244,0.12)' : undefined}
          textColor={inverse ? palette.clayLight : undefined}
        />
      ) : resolvedChip === 'user' && user ? (
        <AvatarButton
          user={user}
          size={layout.avatarSize}
          onPress={openProfile}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  markPress: {
    padding: 2,
  },
});
