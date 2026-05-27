/**
 * RoutineList — the actual ordered product rows for an active slot.
 *
 * Each row is sequenced for morning/evening (`STEP N · CATEGORY`) and
 * unsequenced for saved (`CATEGORY` only — Saved is "decide later",
 * not a sequence). Remove button on each row writes through the
 * canonical store action.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BookmarkSimple, Moon, Sun, X } from 'phosphor-react-native';
import { ProductPlaceholderImage } from '@/components/products/ProductPlaceholderImage';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme';
import { hapt } from '@/utils/haptics';
import { productCategoryLabel, type InnerSegment } from '@/screens/routine/lib';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  segment: InnerSegment;
}

export function RoutineList({ products, segment }: Props) {
  const nav = useNavigation<any>();
  const removeUserRoutineProduct = useAppStore(
    (s) => s.removeUserRoutineProduct
  );
  const toggleWishlist = useAppStore((s) => s.toggleWishlist);

  const removeProduct = (productId: string) => {
    hapt.select();
    if (segment === 'morning' || segment === 'evening') {
      removeUserRoutineProduct(segment, productId);
    } else {
      toggleWishlist(productId);
    }
  };

  const sequenced = segment === 'morning' || segment === 'evening';

  return (
    <View>
      <SectionHeader segment={segment} count={products.length} />
      <View style={styles.list}>
        {products.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => {
              hapt.select();
              nav.navigate('ProductDetail', {
                productId: p.id,
                tint: p.tint,
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={
              sequenced
                ? `Step ${i + 1}, ${productCategoryLabel(p.category)}: ${
                    p.brand
                  } ${p.name}`
                : `${productCategoryLabel(p.category)}: ${p.brand} ${p.name}`
            }
            style={({ pressed }) => [
              styles.row,
              pressed && { opacity: 0.94, transform: [{ scale: 0.992 }] },
            ]}
          >
            <View style={styles.image}>
              <ProductPlaceholderImage
                product={p}
                silhouetteSize={28}
                showBrandWord={false}
                showMockupBadge={false}
              />
            </View>
            <View style={styles.text}>
              <Text
                style={styles.role}
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
              >
                {sequenced
                  ? `STEP ${i + 1} · ${productCategoryLabel(p.category)}`
                  : productCategoryLabel(p.category)}
              </Text>
              <Text
                style={styles.name}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
              >
                {p.name}
              </Text>
              <Text
                style={styles.brand}
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
              >
                {p.brand}
              </Text>
            </View>
            <Pressable
              onPress={() => removeProduct(p.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                segment === 'saved'
                  ? `Remove ${p.name} from saved`
                  : `Remove ${p.name} from ${segment}`
              }
              style={styles.removeBtn}
            >
              <X size={13} color={palette.inkTertiary} weight="bold" />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const SECTION_META: Record<
  InnerSegment,
  {
    title: string;
    body: string;
    Icon: React.FC<{ size: number; color: string; weight: 'duotone' }>;
  }
> = {
  morning: {
    title: 'Morning.',
    body: 'How you start the day. SPF is the closer.',
    Icon: Sun,
  },
  evening: {
    title: 'Evening.',
    body: 'Repair window. Where active ingredients earn their keep.',
    Icon: Moon,
  },
  saved: {
    title: 'Saved.',
    body: 'Decide later. Move into morning or evening when you’re ready.',
    Icon: BookmarkSimple,
  },
};

function SectionHeader({
  segment,
  count,
}: {
  segment: InnerSegment;
  count: number;
}) {
  const meta = SECTION_META[segment];
  const Icon = meta.Icon;
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.iconWrap}>
        <Icon size={18} color={palette.clay} weight="duotone" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={sectionStyles.titleRow}>
          <Text style={sectionStyles.title} maxFontSizeMultiplier={1.15}>
            {meta.title}
          </Text>
          <Text style={sectionStyles.count} maxFontSizeMultiplier={1.1}>
            {count === 1 ? '1 item' : `${count} items`}
          </Text>
        </View>
        <Text
          style={sectionStyles.body}
          maxFontSizeMultiplier={1.2}
          numberOfLines={2}
        >
          {meta.body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    shadowColor: palette.clay,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  image: {
    width: 56,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    paddingVertical: 1,
  },
  role: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.clay,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 2,
  },
  brand: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 0.1,
    color: palette.inkTertiary,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const sectionStyles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.clayPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: palette.ink,
  },
  count: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: palette.inkTertiary,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSecondary,
    maxWidth: '94%',
  },
});
