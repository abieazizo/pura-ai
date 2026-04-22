import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X, Check, Warning } from 'phosphor-react-native';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MatchRing } from '@/components/MatchRing';
import { EditorialRule } from '@/components/EditorialRule';
import { ScreenChrome } from '@/components/ScreenChrome';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { colors, palette, space, type as typography } from '@/theme';
import { common, scan } from '@/copy/strings';
import type { Product } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

export interface ScanResultsProductScreenProps {
  product: Product;
  matchPercent: number;
}

export function ScanResultsProductScreen({
  product,
  matchPercent,
}: ScanResultsProductScreenProps) {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const wishlist = useAppStore((s) => s.wishlist);
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);
  const inWishlist = wishlist.includes(product.id);

  const reasons = [
    'Ingredients align with your barrier-repair goal.',
    'Non-comedogenic given your chin area.',
    'Fragrance-free — lowers risk of redness flare.',
  ];
  const flags = ['Contains alcohol denat.'];

  const close = () => rootNav.goBack();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenChrome showAvatar={false} />

      <View style={styles.topBar}>
        <Pressable
          onPress={close}
          hitSlop={10}
          accessibilityLabel={common.close}
          style={styles.closeBtn}
        >
          <X size={20} color={palette.ink} weight="regular" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          {scan.resultsProductTitle}
        </Text>

        <View style={styles.productRow}>
          <Image
            source={product.imageUri}
            style={styles.productImage}
            contentFit="cover"
          />
          <View style={styles.productText}>
            <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
            <Text style={styles.name} maxFontSizeMultiplier={1.15}>
              {product.name}
            </Text>
          </View>
        </View>

        <View style={styles.ringWrap}>
          <MatchRing value={matchPercent} size={160} thickness={10} />
        </View>

        <View style={styles.block}>
          <EditorialRule label="WHY THIS WORKS" />
          <View style={styles.listBlock}>
            {reasons.map((r) => (
              <View key={r} style={styles.listRow}>
                <Check
                  size={18}
                  color={palette.moss}
                  weight="duotone"
                  style={styles.checkIcon}
                />
                <Text style={styles.listText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>

        {flags.length > 0 ? (
          <View style={styles.block}>
            <EditorialRule label="HEADS UP" ruleColor={palette.amber} />
            <View style={styles.listBlock}>
              {flags.map((f) => (
                <View key={f} style={styles.listRow}>
                  <Warning
                    size={18}
                    color={palette.amber}
                    weight="duotone"
                    style={styles.checkIcon}
                  />
                  <Text style={styles.listText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={inWishlist ? 'In wishlist' : scan.addWishlist}
            variant="outlined"
            onPress={() => toggleWishlist(product.id)}
          />
          <PrimaryButton label={scan.findSimilar} onPress={close} arrow />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    position: 'absolute',
    top: 44,
    right: space.lg,
    zIndex: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingTop: 80,
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  headline: {
    ...typography.heroSerif,
    color: palette.ink,
    marginBottom: space.xl,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 2,
    backgroundColor: palette.bgDeep,
    transform: [{ rotate: '-1deg' }],
  },
  productText: {
    flex: 1,
    marginLeft: space.lg,
  },
  brand: { ...typography.micro, color: palette.inkTertiary },
  name: {
    ...typography.titleSerif,
    color: palette.ink,
    marginTop: 4,
  },
  ringWrap: {
    alignItems: 'center',
    marginVertical: space.xl,
  },
  block: {
    marginBottom: space.xl,
  },
  listBlock: { gap: space.sm, marginTop: space.sm },
  listRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkIcon: { marginRight: space.sm, marginTop: 2 },
  listText: { ...typography.body, color: palette.inkSecondary, flex: 1 },
  actions: {
    gap: space.sm,
    marginTop: space.md,
  },
});
