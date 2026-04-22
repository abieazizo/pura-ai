import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { CaretLeft } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

export interface OnboardingBackButtonProps {
  onPress: () => void;
  visible: boolean;
}

export function OnboardingBackButton({ onPress, visible }: OnboardingBackButtonProps) {
  if (!visible) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => {
        hapt.select();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
    >
      <CaretLeft size={18} color={palette.ink} weight="duotone" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.6)', // sand @ 60%
    alignItems: 'center',
    justifyContent: 'center',
  },
});
