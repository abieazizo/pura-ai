/**
 * ResultSecondaryActions — v19.0.
 *
 * Three quiet pill rows under the hero recommendation:
 *   • See full skin map      (→ ScanResultDetail)
 *   • What should I do tonight? (→ scrolls to TONIGHT or opens Plan)
 *   • See alternatives       (→ scrolls to ALSO MATCHED)
 *
 * Premium, calm, App-Store-ready. Each row reads as a confident
 * affordance, never a button-bar.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CaretRight,
  Eye as EyeIcon,
  MoonStars as MoonStarsIcon,
  Sparkle as SparkleIcon,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';

export interface ResultSecondaryActionsProps {
  onOpenSkinMap: () => void;
  onOpenTonight: () => void;
  onOpenAlternatives: () => void;
}

export function ResultSecondaryActions({
  onOpenSkinMap,
  onOpenTonight,
  onOpenAlternatives,
}: ResultSecondaryActionsProps) {
  return (
    <View style={styles.wrap}>
      <Row
        Icon={EyeIcon}
        label="See full skin map"
        onPress={onOpenSkinMap}
      />
      <View style={styles.divider} />
      <Row
        Icon={MoonStarsIcon}
        label="What should I do tonight?"
        onPress={onOpenTonight}
      />
      <View style={styles.divider} />
      <Row
        Icon={SparkleIcon}
        label="See alternatives"
        onPress={onOpenAlternatives}
      />
    </View>
  );
}

function Row({
  Icon,
  label,
  onPress,
}: {
  Icon: React.FC<PhosphorIconProps>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        hapt.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.94 },
      ]}
    >
      <Icon
        size={18}
        color={palette.ink}
        weight="duotone"
      />
      <Text style={styles.label} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      <CaretRight size={13} color={palette.inkTertiary} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginHorizontal: 16,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.1,
    color: palette.ink,
  },
});
