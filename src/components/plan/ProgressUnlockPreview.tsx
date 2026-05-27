import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ChartLine,
  Drop,
  CircleHalf,
  Waves,
  ListChecks,
  ImageSquare,
  Lock,
} from 'phosphor-react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { plan } from './tokens';

interface UnlockItem {
  Icon: React.ComponentType<PhosphorIconProps>;
  title: string;
  body: string;
}

const ITEMS: UnlockItem[] = [
  {
    Icon: ChartLine,
    title: 'Skin Score trend',
    body: 'Track your baseline and daily changes.',
  },
  {
    Icon: Drop,
    title: 'Hydration',
    body: 'See whether your barrier support is working.',
  },
  {
    Icon: CircleHalf,
    title: 'Breakout activity',
    body: 'Follow active areas and calming patterns.',
  },
  {
    Icon: Waves,
    title: 'Texture',
    body: 'Monitor visible smoothness over time.',
  },
  {
    Icon: ListChecks,
    title: 'Routine consistency',
    body: 'See how completed steps affect progress.',
  },
  {
    Icon: ImageSquare,
    title: 'Before / after timeline',
    body: 'Compare changes without guessing.',
  },
];

/**
 * "What unlocks after scanning" grid.
 *
 * Rendered below the Progress empty state. Two-column on wider phones,
 * single column on narrow. Cards read as previews — small lock glyph
 * in the corner, calm muted styling — so they hint at value without
 * pretending data exists.
 */
export function ProgressUnlockPreview() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.15}>
        What unlocks after scanning
      </Text>
      <Text style={styles.sectionSub} maxFontSizeMultiplier={1.2}>
        Pura keeps these locked until your first scan creates a real baseline.
      </Text>
      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <View
            key={item.title}
            style={styles.cardSlot}
            accessible
            accessibilityLabel={`${item.title}, locked. ${item.body}`}
          >
            <View style={styles.card}>
              <View style={styles.iconRow}>
                <View style={styles.iconTile}>
                  <item.Icon
                    size={16}
                    color={plan.inkSecondary}
                    weight="duotone"
                  />
                </View>
                <Lock size={11} color={plan.inkMuted} weight="duotone" />
              </View>
              <Text
                style={styles.title}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
              >
                {item.title}
              </Text>
              <Text
                style={styles.body}
                numberOfLines={3}
                maxFontSizeMultiplier={1.2}
              >
                {item.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: plan.ink,
  },
  sectionSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: plan.inkSecondary,
    marginTop: 4,
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cardSlot: {
    width: '50%',
    padding: 6,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
    minHeight: 116,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: plan.ink,
    marginTop: 12,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: plan.inkSecondary,
    marginTop: 4,
  },
});
