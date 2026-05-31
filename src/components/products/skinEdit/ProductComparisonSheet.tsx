/**
 * ProductComparisonSheet — side-by-side comparison ending with
 * "Pura's pick tonight" + the reason.
 */

import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { seedProducts } from '@/data/seed';
import type { ComparisonResult } from '@/state/skinEdit';
import { ProductStage } from './ProductStage';

interface ProductComparisonSheetProps {
  visible: boolean;
  comparison: ComparisonResult | null;
  onAddPick: () => void;
  onSavePicked: () => void;
  onDismiss: () => void;
}

export function ProductComparisonSheet({
  visible,
  comparison,
  onAddPick,
  onSavePicked,
  onDismiss,
}: ProductComparisonSheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(1);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    y.value = visible
      ? withSpring(0, { damping: 22, stiffness: 140, mass: 1 })
      : withSpring(1, { damping: 22, stiffness: 140, mass: 1 });
    backdrop.value = withTiming(visible ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, y, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${y.value * 100}%` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!comparison) {
    return null;
  }

  const products = comparison.productIds
    .map((id) => seedProducts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const pickProduct = seedProducts.find((p) => p.id === comparison.pickProductId);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
          <View style={styles.tint} pointerEvents="none" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            sheetStyle,
          ]}
        >
          <View style={styles.grabber} />
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              Which one earns a place tonight?
            </Text>

            <ScrollView
              style={{ maxHeight: 520 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View style={styles.headerRow}>
                {products.map((p) => (
                  <View key={p.id} style={styles.headerCol}>
                    <View style={styles.thumb}>
                      <ProductStage product={p} imageUrl={p.imageUrl} size="tile" />
                    </View>
                    <Text style={styles.headerBrand} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                      {p.brand.toUpperCase()}
                    </Text>
                    <Text style={styles.headerName} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                      {p.name}
                    </Text>
                  </View>
                ))}
              </View>

              {comparison.rows.map((row, idx) => (
                <View key={row.label} style={[styles.row, idx === 0 ? styles.rowFirst : null]}>
                  <Text style={styles.rowLabel} maxFontSizeMultiplier={1.1}>
                    {row.label.toUpperCase()}
                  </Text>
                  <View style={styles.rowValues}>
                    {row.values.map((v, i) => (
                      <Text
                        key={`${row.label}-${i}`}
                        style={[
                          styles.rowValue,
                          products[i] && products[i].id === comparison.pickProductId
                            ? styles.rowValuePick
                            : null,
                        ]}
                        maxFontSizeMultiplier={1.2}
                      >
                        {v}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.conclusion}>
                <Text style={styles.conclusionLabel} maxFontSizeMultiplier={1.1}>
                  PURA’S PICK TONIGHT
                </Text>
                <Text style={styles.conclusionTitle} maxFontSizeMultiplier={1.2}>
                  {pickProduct ? `${pickProduct.brand} · ${pickProduct.name}` : 'Pura’s pick'}
                </Text>
                <Text style={styles.conclusionBody} maxFontSizeMultiplier={1.3}>
                  {comparison.pickReason}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add Pura’s pick to routine"
                onPress={() => {
                  hapt.select();
                  onAddPick();
                }}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                  Add Pura’s pick to routine
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save the other for later"
                onPress={() => {
                  hapt.select();
                  onSavePicked();
                }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              >
                <Text style={styles.secondaryLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                  Save the other for later
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.hairline,
    marginTop: 8,
    marginBottom: 8,
  },
  inner: {
    paddingTop: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  headerCol: {
    flex: 1,
    alignItems: 'center',
  },
  thumb: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  headerBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.1,
    color: palette.inkSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  headerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    lineHeight: 15,
    color: palette.ink,
    textAlign: 'center',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    paddingTop: 12,
    paddingBottom: 14,
  },
  rowFirst: {
    borderTopWidth: 0,
    paddingTop: 4,
  },
  rowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    marginBottom: 6,
  },
  rowValues: {
    flexDirection: 'row',
    gap: 10,
  },
  rowValue: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 17,
    color: palette.ink,
  },
  rowValuePick: {
    fontFamily: 'Inter-SemiBold',
    color: palette.clayDeep,
  },
  conclusion: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: '#CFE3FF',
  },
  conclusionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    marginBottom: 6,
  },
  conclusionTitle: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 18,
    lineHeight: 22,
    color: palette.ink,
    marginBottom: 6,
  },
  conclusionBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: '#0A0C12',
  },
  primaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: palette.inkInverse,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    backgroundColor: palette.bgDeep,
  },
  secondaryLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
});
