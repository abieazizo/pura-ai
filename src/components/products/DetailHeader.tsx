import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CaretLeft, HeartStraight } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { hapt } from '@/utils/haptics';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';

export interface DetailHeaderProps {
  productId: string;
}

/**
 * Detail header (§3.3). Back + Save only — no centered title. Save is
 * stateful (terracotta fill when in the wishlist, ink-60 duotone otherwise).
 */
export function DetailHeader({ productId }: DetailHeaderProps) {
  const nav = useNavigation<any>();
  const isSaved = useAppStore((s) => s.wishlist.includes(productId));
  const toggle = useAppStore((s) => s.toggleWishlist);

  const onBack = () => {
    hapt.select();
    nav.goBack();
  };
  const onSave = () => {
    hapt.select();
    toggle(productId);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        <CaretLeft size={18} color={palette.ink} weight="duotone" />
      </Pressable>

      <Pressable
        onPress={onSave}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? 'Remove from saved' : 'Save product'}
        accessibilityState={{ selected: isSaved }}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        <HeartStraight
          size={18}
          weight={isSaved ? 'fill' : 'duotone'}
          color={isSaved ? palette.clay : 'rgba(26,22,20,0.6)'}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
