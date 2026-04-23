import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/store/useAppStore';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { Product } from '@/types';
import { ProductCardHorizontal } from './ProductCardHorizontal';

export type ProductRowKind =
  | 'best-for-you'
  | 'best-overall'
  | 'natural'
  | 'new'
  | 'essentials';

export interface ProductRowProps {
  kind: ProductRowKind;
  data: Product[];
  isFirstRow?: boolean;
}

const TITLES: Record<ProductRowKind, { title: string; sub?: string }> = {
  'best-for-you': {
    title: 'Best for you.',
    sub: 'Matched to your skin.',
  },
  'best-overall': { title: 'Best overall.' },
  natural: { title: 'Natural.' },
  new: { title: 'New.' },
  essentials: { title: 'Essentials.' },
};

// v9.6 — card widened from 160 → 164 + 12 gap stays. Keep SNAP in sync
// so the FlatList snaps cleanly to card boundaries.
const CARD_W = 164;
const GAP = 12;
const SNAP = CARD_W + GAP;

/**
 * A horizontally snapping row of catalog cards (§2.7). Header on top with
 * a "See all →" link, then a FlatList that snaps to card intervals.
 *
 * The first row, on first mount only, performs a 20px nudge-and-back to
 * teach the user this row scrolls (§2.7 scroll hint). Guarded by the
 * `hasSeenProductsScrollHint` flag so returning users never see it.
 */
export function ProductRow({ kind, data, isFirstRow }: ProductRowProps) {
  const nav = useNavigation<any>();
  const listRef = useRef<FlatList<Product>>(null);
  const hasSeenHint = useAppStore((s) => s.hasSeenProductsScrollHint);
  const setHasSeenHint = useAppStore(
    (s) => s.setHasSeenProductsScrollHint
  );
  const didHintRef = useRef(false);
  const { title, sub } = TITLES[kind];
  const showMatch = kind === 'best-for-you';

  useEffect(() => {
    if (!isFirstRow) return;
    if (hasSeenHint) return;
    if (didHintRef.current) return;
    if (data.length === 0) return;
    didHintRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 20, animated: true });
        timers.push(
          setTimeout(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            setHasSeenHint(true);
          }, 600)
        );
      }, 800)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [isFirstRow, hasSeenHint, data.length, setHasSeenHint]);

  const onSeeAll = () => {
    hapt.select();
    nav.navigate('CategoryView', { kind });
  };

  if (data.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} maxFontSizeMultiplier={1.15}>
            {title}
          </Text>
          {sub ? (
            <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
              {sub}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={`See all ${title}`}
        >
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        snapToInterval={SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        renderItem={({ item }) => (
          <ProductCardHorizontal product={item} showMatch={showMatch} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 36,
  },
  header: {
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkTertiary,
    marginTop: 2,
  },
  seeAll: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: palette.clay,
  },
  listContent: {
    paddingHorizontal: 20,
  },
});
