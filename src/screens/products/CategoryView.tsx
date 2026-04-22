import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CaretLeft } from 'phosphor-react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';

type RowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

type CategoryRoute = RouteProp<{ CategoryView: { kind: RowKind } }, 'CategoryView'>;

const LABEL: Record<RowKind, string> = {
  'best-for-you': 'Best for you',
  'best-overall': 'Best overall',
  natural: 'Natural',
  new: 'New',
  essentials: 'Essentials',
};

/**
 * Stub — placeholder screen behind each `See all →` link (§2.11). Full
 * catalog grid ships in a later PR. This just proves the nav handoff
 * works and gives the user a graceful back path.
 */
export function CategoryView() {
  const nav = useNavigation();
  const route = useRoute<CategoryRoute>();
  const label = LABEL[route.params?.kind] ?? 'Catalog';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            hapt.select();
            nav.goBack();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <CaretLeft size={18} color={palette.ink} weight="duotone" />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
          {label.toUpperCase()}
        </Text>
        <Text style={styles.headline} maxFontSizeMultiplier={1.15}>
          Full catalog coming soon.
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.2}>
          For now, browse this section's highlights on the Products screen.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(26,22,20,0.6)',
    marginBottom: 16,
  },
  headline: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 36,
    lineHeight: 40,
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    lineHeight: 24,
    color: 'rgba(26,22,20,0.7)',
    textAlign: 'center',
  },
});
