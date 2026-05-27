import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Drop, Shield, Sun, ShoppingBag } from 'phosphor-react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import type { ProductCategory } from '@/types';
import type { ShelfSlot } from '@/state/planState';
import { plan } from './tokens';

export interface MissingEssentialsCardProps {
  slots: ShelfSlot[];
  onFind: (category: ProductCategory) => void;
}

const META: Record<
  ProductCategory,
  {
    priorityLabel: string;
    priorityColor: string;
    priorityBg: string;
    body: string;
    cta: string;
    Icon: React.ComponentType<PhosphorIconProps>;
  }
> = {
  spf: {
    priorityLabel: 'Highest priority',
    priorityColor: plan.warning,
    priorityBg: plan.warningSoft,
    body: 'Protects your progress every morning.',
    cta: 'Find SPF',
    Icon: Sun,
  },
  moisturizer: {
    priorityLabel: 'High priority',
    priorityColor: plan.success,
    priorityBg: plan.successSoft,
    body: 'Locks hydration in and supports your barrier.',
    cta: 'Find moisturizer',
    Icon: Shield,
  },
  serum: {
    priorityLabel: 'Medium priority',
    priorityColor: plan.brand,
    priorityBg: plan.softBlue,
    body: 'Helpful if your skin feels tight or tired.',
    cta: 'Find hydration',
    Icon: Drop,
  },
  cleanser: {
    priorityLabel: 'Optional today',
    priorityColor: plan.inkMuted,
    priorityBg: '#F1F5F9',
    body: 'A gentle cleanser helps, but a water rinse can work today.',
    cta: 'Add if owned',
    Icon: ShoppingBag,
  },
  // Treatment / toner / mask aren't tracked as essentials but the union
  // requires every key, so we provide a calm catch-all that matches.
  toner: {
    priorityLabel: 'Optional',
    priorityColor: plan.inkMuted,
    priorityBg: '#F1F5F9',
    body: 'Optional helper — not required for the starter plan.',
    cta: 'Find match',
    Icon: Drop,
  },
  treatment: {
    priorityLabel: 'Skip for now',
    priorityColor: plan.inkMuted,
    priorityBg: '#F1F5F9',
    body: 'Pura will suggest a treatment after enough scan history.',
    cta: 'Learn more',
    Icon: Drop,
  },
  mask: {
    priorityLabel: 'Skip for now',
    priorityColor: plan.inkMuted,
    priorityBg: '#F1F5F9',
    body: 'Masks come later — we don’t introduce extras early.',
    cta: 'Learn more',
    Icon: Drop,
  },
};

const PRIORITY_ORDER: ProductCategory[] = [
  'spf',
  'moisturizer',
  'serum',
  'cleanser',
];

/**
 * "Missing essentials" — compact list of unfilled shelf slots.
 *
 * Lives on both Today (post-scan) and Shelf. Skips any category the
 * user already owns. The priority ladder (SPF → moisturizer →
 * hydration → cleanser) is fixed; that's the safe order Pura
 * recommends building a shelf in.
 */
export function MissingEssentialsCard({
  slots,
  onFind,
}: MissingEssentialsCardProps) {
  const slotByCat = new Map(slots.map((s) => [s.category, s]));
  const missing = PRIORITY_ORDER.filter((c) => {
    const slot = slotByCat.get(c);
    return !!slot && !slot.filled;
  });

  if (missing.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        MISSING ESSENTIALS
      </Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={1.25}>
        Pura uses what you own first, then recommends only what fills a real
        gap.
      </Text>

      <View style={styles.rows}>
        {missing.map((cat, i) => {
          const m = META[cat];
          const slot = slotByCat.get(cat)!;
          return (
            <View
              key={cat}
              style={[
                styles.row,
                i === missing.length - 1 && styles.rowLast,
              ]}
            >
              <View
                style={[styles.iconTile, { backgroundColor: m.priorityBg }]}
              >
                <m.Icon
                  size={18}
                  color={m.priorityColor}
                  weight="duotone"
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text
                    style={styles.label}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}
                  >
                    {slot.label}
                  </Text>
                  <Text
                    style={[styles.priority, { color: m.priorityColor }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                  >
                    {m.priorityLabel}
                  </Text>
                </View>
                <Text
                  style={styles.body}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                >
                  {m.body}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  hapt.select();
                  onFind(cat);
                }}
                accessibilityRole="button"
                accessibilityLabel={m.cta}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.ctaBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={styles.ctaLabel}
                  maxFontSizeMultiplier={1.1}
                >
                  {m.cta}
                </Text>
                <ArrowRight size={12} color={plan.brand} weight="bold" />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: plan.inkMuted,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: plan.inkSecondary,
    marginTop: 6,
  },
  rows: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: plan.border,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: plan.ink,
    letterSpacing: -0.1,
  },
  priority: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 'auto',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: plan.inkSecondary,
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: plan.softBlue,
    alignSelf: 'center',
  },
  ctaLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: plan.brand,
  },
});
