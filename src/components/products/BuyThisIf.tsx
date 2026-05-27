/**
 * BuyThisIf — paired "Buy this if / Skip this if" decision lists on
 * product detail. The single most useful module for closing the
 * buy-vs-skip decision a user makes on a product page.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, XCircle } from 'phosphor-react-native';
import { palette } from '@/theme';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export function BuyThisIf({ product }: Props) {
  const { buyIf, skipIf } = buildLists(product);

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        SHOULD YOU BUY THIS?
      </Text>

      <View style={styles.column}>
        <View style={styles.colHead}>
          <CheckCircle size={14} color={palette.mossDeep} weight="duotone" />
          <Text style={[styles.colTitle, { color: palette.mossDeep }]}>
            Buy this if
          </Text>
        </View>
        {buyIf.map((line) => (
          <View key={line} style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: palette.mossDeep }]}
            />
            <Text
              style={styles.rowText}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {line}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.column, styles.columnAlt]}>
        <View style={styles.colHead}>
          <XCircle size={14} color={palette.rust} weight="duotone" />
          <Text style={[styles.colTitle, { color: palette.rust }]}>
            Skip this if
          </Text>
        </View>
        {skipIf.map((line) => (
          <View key={line} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: palette.rust }]} />
            <Text
              style={styles.rowText}
              maxFontSizeMultiplier={1.2}
              numberOfLines={2}
            >
              {line}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// List builder — deterministic from product metadata.
// ---------------------------------------------------------------------------

function buildLists(
  product: Product
): { buyIf: string[]; skipIf: string[] } {
  const tags = (product.tags ?? []).map((t) => t.toLowerCase());
  const category = product.category;

  const buyIf: string[] = [];
  const skipIf: string[] = [];

  if (tags.some((t) => /breakout|acne|salicylic|bha/.test(t))) {
    buyIf.push('You have visible breakouts you want to treat directly.');
    buyIf.push('You already use a gentle cleanser and moisturizer.');
    skipIf.push('Your skin is currently irritated or peeling.');
    skipIf.push('You are already using a stronger active like retinol.');
  } else if (tags.some((t) => /dark|mark|tone|brightening/.test(t))) {
    buyIf.push('You want help with post-breakout marks or uneven tone.');
    buyIf.push('You can commit to daily SPF for visible results.');
    skipIf.push('Your main goal is fast active-acne control.');
    skipIf.push('You already use multiple brightening serums.');
  } else if (tags.some((t) => /hydra|ceramide|hyaluronic/.test(t))) {
    buyIf.push('Your skin reads dry, tight, or dehydrated.');
    buyIf.push('You want a barrier-friendly addition to your routine.');
    skipIf.push('Your skin is already very oily and well-hydrated.');
    skipIf.push('You are introducing several other products this week.');
  } else if (category === 'spf') {
    buyIf.push('You spend any time outdoors during the day.');
    buyIf.push('You use actives that increase sun sensitivity.');
    skipIf.push('You already love your current SPF and use it daily.');
  } else if (category === 'cleanser') {
    buyIf.push('You need a gentler daily cleanse.');
    buyIf.push('Your current cleanser leaves your skin feeling tight.');
    skipIf.push('Your current cleanser is already non-stripping.');
  } else if (category === 'moisturizer') {
    buyIf.push('You want consistent daily moisture for your routine.');
    buyIf.push('You are layering serums or treatments.');
    skipIf.push('Your existing moisturizer feels great as-is.');
  } else {
    buyIf.push('It fills a clear gap in your current routine.');
    buyIf.push('You can patch test before going daily.');
    skipIf.push('You are mid-introducing another new product.');
    skipIf.push('Your barrier feels reactive this week.');
  }

  // Universal closers.
  if (buyIf.length < 3) {
    buyIf.push('You can patch test and introduce slowly.');
  }
  if (skipIf.length < 3) {
    skipIf.push('You are not yet using daily SPF.');
  }

  return {
    buyIf: buyIf.slice(0, 3),
    skipIf: skipIf.slice(0, 3),
  };
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  column: {
    marginBottom: 14,
  },
  columnAlt: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
  },
  colHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  colTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
  },
  rowText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },
});
