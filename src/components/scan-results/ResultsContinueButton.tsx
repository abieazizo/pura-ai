/**
 * Circular coral continue arrow — used in the bottom-right corner of
 * each result slide. Implements the press tint + soft glow per the
 * approved Pura visual language.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { scanColors, scanRadius, scanShadows } from '@/theme/scanResultsTokens';
import { hapt } from '@/utils/haptics';

export interface ResultsContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function ResultsContinueButton({
  onPress,
  disabled = false,
  accessibilityLabel = 'Continue',
}: ResultsContinueButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    hapt.tap();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.btn,
        scanShadows.glow,
        pressed && !disabled && { transform: [{ scale: 0.94 }] },
        disabled && { opacity: 0.45 },
      ]}
      hitSlop={12}
    >
      <View style={styles.inner}>
        <ArrowRight size={20} weight="bold" color={scanColors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: scanRadius.circleButton,
    backgroundColor: scanColors.coralStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
