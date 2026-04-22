import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { hapt } from '@/utils/haptics';

export interface OnboardingSkipButtonProps {
  visible: boolean;
  onPress: () => void;
}

export function OnboardingSkipButton({ visible, onPress }: OnboardingSkipButtonProps) {
  if (!visible) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Skip"
      onPress={() => {
        hapt.select();
        onPress();
      }}
      hitSlop={10}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.label}>Skip</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(26,22,20,0.6)', // ink @ 60%
  },
});
