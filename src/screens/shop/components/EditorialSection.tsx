/**
 * EditorialSection — pass 1.
 *
 * Editorial section frame: italic-serif kicker + serif title on its
 * own line + a single line of editor's note. No "View all" pill — the
 * action is a quiet serif word with a hairline arrow.
 *
 * Pairs with EditorialIndexRow below to render a typographic listing
 * of supporting products. Replaces SectionHeader + ProductCarousel as
 * the secondary surface of the shop landing.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { puraShop, puraShopLayout } from '@/theme';
import type { ShopCatalogProduct } from '../shopCatalog';
import { EditorialIndexMark } from './EditorialIndexMark';

const PAD = puraShopLayout.horizontalPadding;

export interface EditorialSectionProps {
  kicker: string; // italic serif — "Pairs with tonight"
  title: string; // serif — "Complete the routine."
  note?: string; // optional single editor's note
  onMore?: () => void;
  moreLabel?: string;
  children: React.ReactNode;
}

export function EditorialSection({
  kicker,
  title,
  note,
  onMore,
  moreLabel = 'See all',
  children,
}: EditorialSectionProps) {
  return (
    <View style={sectionStyles.outer}>
      <View style={sectionStyles.head}>
        <Text style={sectionStyles.kicker} maxFontSizeMultiplier={1.15}>
          {kicker}
        </Text>
        <Text
          style={sectionStyles.title}
          maxFontSizeMultiplier={1.1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {note ? (
          <Text style={sectionStyles.note} maxFontSizeMultiplier={1.2}>
            {note}
          </Text>
        ) : null}
        {onMore ? (
          <Pressable
            onPress={onMore}
            accessibilityRole="button"
            accessibilityLabel={moreLabel}
            hitSlop={6}
            style={({ pressed }) => [
              sectionStyles.moreRow,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={sectionStyles.moreLabel}>{moreLabel}</Text>
            <ArrowRight size={12} weight="bold" color={puraShop.ink} />
          </Pressable>
        ) : null}
      </View>

      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  outer: {
    marginTop: 36,
  },
  head: {
    paddingHorizontal: PAD,
    paddingBottom: 16,
  },
  kicker: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    color: puraShop.coralDeep,
    letterSpacing: 0.1,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: puraShop.ink,
    marginTop: 4,
  },
  note: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: puraShop.inkMuted,
    marginTop: 8,
    maxWidth: 320,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  moreLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    color: puraShop.ink,
    textTransform: 'uppercase',
  },
  body: {
    paddingHorizontal: PAD,
  },
});

// ---------------------------------------------------------------------------
// EditorialIndexRow — single row in the typographic listing.
// ---------------------------------------------------------------------------

export interface EditorialIndexRowProps {
  index: number;
  product: ShopCatalogProduct;
  /** Editorial reason this product earned its spot. */
  reason: string;
  isInRoutine: boolean;
  isLast?: boolean;
  onPress: () => void;
  onAdd: () => void;
}

export function EditorialIndexRow({
  index,
  product,
  reason,
  isInRoutine,
  isLast,
  onPress,
  onAdd,
}: EditorialIndexRowProps) {
  const initial = (product.brand?.[0] ?? '·').toUpperCase();
  const [imgFailed, setImgFailed] = React.useState(false);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.brand} ${product.name}, $${product.price}`}
      style={({ pressed }) => [
        rowStyles.row,
        !isLast && rowStyles.rowDivider,
        pressed && rowStyles.rowPressed,
      ]}
    >
      <Text style={rowStyles.numeral} maxFontSizeMultiplier={1.05}>
        {String(index).padStart(2, '0')}
      </Text>

      <View style={rowStyles.plate}>
        {imgFailed || !product.catalogPackshot ? (
          <Text style={rowStyles.plateInitial} maxFontSizeMultiplier={1.05}>
            {initial}
          </Text>
        ) : (
          <Image
            source={product.catalogPackshot}
            style={rowStyles.image}
            resizeMode="contain"
            fadeDuration={120}
            onError={() => setImgFailed(true)}
          />
        )}
      </View>

      <View style={rowStyles.col}>
        <Text style={rowStyles.brand} maxFontSizeMultiplier={1.1}>
          {product.brand.toUpperCase()}
        </Text>
        <Text style={rowStyles.name} maxFontSizeMultiplier={1.1} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={rowStyles.reason} maxFontSizeMultiplier={1.2} numberOfLines={2}>
          {reason}
        </Text>
        <View style={rowStyles.metaRow}>
          <Text style={rowStyles.price} maxFontSizeMultiplier={1.1}>
            ${formatPrice(product.price)}
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isInRoutine
                ? `${product.brand} ${product.name} is in your routine`
                : `Add ${product.brand} ${product.name} to tonight`
            }
            hitSlop={10}
            style={({ pressed }) => [
              rowStyles.markBtn,
              pressed && { opacity: 0.65 },
            ]}
          >
            <EditorialIndexMark size={22} saved={isInRoutine} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

void ArrowRight;

function formatPrice(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 22,
    paddingHorizontal: 4,
    marginHorizontal: -4,
    borderRadius: 4,
  },
  rowPressed: {
    backgroundColor: puraShop.surfaceWarm,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: puraShop.borderWarm,
  },
  numeral: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 19,
    color: puraShop.coralDeep,
    width: 30,
    paddingTop: 6,
    letterSpacing: 0.4,
  },
  // Image plate — warm paper stage so packshots have a stage instead
  // of floating in negative space. Subtle inner shadow on the long
  // edges via two faint hairlines (top + bottom).
  plate: {
    width: 76,
    height: 100,
    backgroundColor: puraShop.surfaceWarm,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: puraShop.borderWarm,
  },
  image: {
    width: 64,
    height: 88,
  },
  plateInitial: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 36,
    color: puraShop.inkMuted,
  },
  col: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  brand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: puraShop.inkMuted,
  },
  name: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: -0.4,
    color: puraShop.ink,
    marginTop: 6,
  },
  reason: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 14,
    lineHeight: 19,
    color: puraShop.inkSecondary,
    marginTop: 8,
    letterSpacing: -0.05,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
  markBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
