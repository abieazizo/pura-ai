import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { CaretLeft } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface OnboardingBackButtonProps {
  onPress: () => void;
  visible: boolean;
}

/**
 * v20.0 — onboarding back control. The previous warm beige tile (sand
 * @ 60% — a leftover from the v5 palette) is gone; the button is now a
 * neutral 44x44 hit target with a faint hairline border so it reads as a
 * proper accessible control on the cool-palette page.
 */
export function OnboardingBackButton({ onPress, visible }: OnboardingBackButtonProps) {
  if (!visible) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={() => {
        hapt.select();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
    >
      <CaretLeft size={20} color={palette.ink} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
