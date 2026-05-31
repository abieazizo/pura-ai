/**
 * SearchConsultation — full-screen overlay search experience.
 *
 * Replaces the generic marketplace search input. Opens with a clear
 * consultation prompt and intent-led suggested actions. Results render
 * as recommendation cards (state badge + reason), not anonymous tiles.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, MagnifyingGlass } from 'phosphor-react-native';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { seedProducts } from '@/data/seed';
import type { Product } from '@/types';
import {
  buildProductRecommendation,
  type Recommendation,
  type RoutineState,
  type SkinSnapshot,
} from '@/state/skinEdit';
import { EditorialProductTile } from './EditorialProductTile';

interface SearchConsultationProps {
  visible: boolean;
  snapshot: SkinSnapshot;
  routine: RoutineState;
  onDismiss: () => void;
  onSelect: (recommendation: Recommendation) => void;
}

const SUGGESTED_INTENTS = [
  'A product for active breakouts',
  'Something gentle for dark marks',
  'A moisturizer that will not feel heavy',
  'Check if an ingredient fits my routine',
  'Compare a product I already own',
];

export function SearchConsultation({
  visible,
  snapshot,
  routine,
  onDismiss,
  onSelect,
}: SearchConsultationProps) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return seedProducts
      .filter((p) => {
        const blob = `${p.brand} ${p.name} ${p.keyIngredients.join(' ')} ${p.category}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 8)
      .map((p: Product) => buildProductRecommendation(p, snapshot, routine));
  }, [query, snapshot, routine]);

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={() => {
              hapt.select();
              onDismiss();
            }}
            style={styles.iconBtn}
          >
            <ArrowLeft size={18} color={palette.ink} weight="bold" />
          </Pressable>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            What are you looking to solve?
          </Text>
        </View>

        <View style={styles.searchRow}>
          <MagnifyingGlass size={18} color={palette.inkTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a product, ingredient, or skin concern"
            placeholderTextColor={palette.inkTertiary}
            style={styles.input}
            autoFocus
            maxFontSizeMultiplier={1.2}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {matches.length === 0 ? (
            <View style={styles.suggestions}>
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
                START WITH AN INTENT
              </Text>
              {SUGGESTED_INTENTS.map((intent) => (
                <Pressable
                  key={intent}
                  accessibilityRole="button"
                  accessibilityLabel={intent}
                  onPress={() => setQuery(intent)}
                  style={({ pressed }) => [
                    styles.intentRow,
                    pressed && { opacity: 0.94 },
                  ]}
                >
                  <Text style={styles.intentText} maxFontSizeMultiplier={1.2}>
                    {intent}
                  </Text>
                </Pressable>
              ))}

              <View style={styles.scanRow}>
                <View style={styles.scanIcon}>
                  <Camera size={18} color={palette.clayDeep} weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scanTitle} maxFontSizeMultiplier={1.2}>
                    Scan a product label
                  </Text>
                  <Text style={styles.scanBody} maxFontSizeMultiplier={1.2}>
                    Use the camera tab to check whether a product fits your routine.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.results}>
              <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
                {matches.length} {matches.length === 1 ? 'RESULT' : 'RESULTS'} · TAILORED TO YOUR SCAN
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.matchScroll}
              >
                {matches.map((rec) => (
                  <EditorialProductTile
                    key={rec.productId}
                    recommendation={rec}
                    onPress={() => onSelect(rec)}
                  />
                ))}
              </ScrollView>

              <View style={styles.resultsList}>
                {matches.map((rec) => (
                  <Pressable
                    key={`row-${rec.productId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${rec.product.brand} ${rec.product.name}`}
                    onPress={() => onSelect(rec)}
                    style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.95 }]}
                  >
                    <Text style={styles.resultBrand} maxFontSizeMultiplier={1.1} numberOfLines={1}>
                      {rec.product.brand.toUpperCase()}
                    </Text>
                    <Text style={styles.resultName} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                      {rec.product.name}
                    </Text>
                    <Text style={styles.resultReason} maxFontSizeMultiplier={1.2}>
                      {rec.shortReason} {rec.relevanceLabel}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  title: {
    flex: 1,
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: palette.ink,
    padding: 0,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80,
  },
  suggestions: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  intentRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: '#FFFFFF',
    minHeight: 50,
    justifyContent: 'center',
  },
  intentText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 19,
    color: palette.ink,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: palette.clayPaper,
    borderWidth: 1,
    borderColor: '#CFE3FF',
    marginTop: 16,
  },
  scanIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.ink,
    marginBottom: 2,
  },
  scanBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSecondary,
  },
  results: {
    gap: 14,
  },
  matchScroll: {
    paddingRight: 4,
    gap: 10,
  },
  resultsList: {
    marginTop: 6,
    gap: 8,
  },
  resultRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
    marginBottom: 2,
  },
  resultName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: palette.ink,
    marginBottom: 4,
  },
  resultReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: palette.inkSecondary,
  },
});
