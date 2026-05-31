/**
 * ProductPlanTimeline — the 84-day phased plan.
 *
 * Three phases (Calm and control / Treat marks and texture / Maintain
 * and protect) shown vertically with compact product markers in each.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import { seedProducts } from '@/data/seed';
import type { PlanPhase } from '@/state/skinEdit';
import { ProductStage } from './ProductStage';

interface ProductPlanTimelineProps {
  timeline: PlanPhase[];
}

export function ProductPlanTimeline({ timeline }: ProductPlanTimelineProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
        Your product plan
      </Text>
      <Text style={styles.sub} maxFontSizeMultiplier={1.2}>
        Three calm phases. One step at a time.
      </Text>

      <View style={styles.column}>
        {timeline.map((phase, idx) => (
          <View key={phase.phase} style={styles.row}>
            <View style={styles.timelineCol}>
              <View style={[styles.dot, idx === 0 ? styles.dotActive : null]} />
              {idx < timeline.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.contentCol}>
              <Text style={styles.daysLabel} maxFontSizeMultiplier={1.1}>
                {phase.daysLabel.toUpperCase()}
              </Text>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {phase.title}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={1.3}>
                {phase.body}
              </Text>
              {phase.productIds.length > 0 ? (
                <View style={styles.products}>
                  {phase.productIds.map((id) => {
                    const product = seedProducts.find((p) => p.id === id);
                    if (!product) return null;
                    return (
                      <View key={id} style={styles.productRow}>
                        <View style={styles.thumb}>
                          <ProductStage
                            product={product}
                            imageUrl={product.imageUrl}
                            size="tile"
                          />
                        </View>
                        <View style={styles.productCopy}>
                          <Text
                            style={styles.productBrand}
                            maxFontSizeMultiplier={1.1}
                            numberOfLines={1}
                          >
                            {product.brand.toUpperCase()}
                          </Text>
                          <Text
                            style={styles.productName}
                            maxFontSizeMultiplier={1.2}
                            numberOfLines={2}
                          >
                            {product.name}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 34,
    paddingHorizontal: 20,
  },
  heading: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: palette.ink,
    marginBottom: 4,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 18,
  },
  column: {},
  row: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timelineCol: {
    width: 22,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: palette.hairline,
    marginTop: 4,
  },
  dotActive: {
    backgroundColor: palette.clay,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: palette.hairline,
    marginTop: 4,
  },
  contentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 8,
  },
  daysLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.clayDeep,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSecondary,
    marginBottom: 12,
  },
  products: {
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productCopy: {
    flex: 1,
  },
  productBrand: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.inkSecondary,
    marginBottom: 2,
  },
  productName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 17,
    color: palette.ink,
  },
});
