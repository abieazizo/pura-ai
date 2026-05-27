import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Prohibit } from 'phosphor-react-native';
import { plan } from './tokens';

export interface AvoidTodayCardProps {
  /** True before the first scan — we soften the title + body. */
  preScan?: boolean;
  /** Specific items to skip today. Overridden by `preScan`. */
  items?: string[];
}

const DEFAULT_PRE_SCAN_ITEMS = [
  'Strong exfoliating acids',
  'New retinoids',
  'Testing multiple new products at once',
  'Harsh physical scrubs',
];

/**
 * "Avoid today" — calm guardrail card.
 *
 * Critical because it makes the AI feel useful: before scanning, we
 * teach Pura's posture (low-noise, barrier-first); after scanning, the
 * same surface flips to scan-specific guidance.
 *
 * Never alarming, never judgmental — the prohibition icon is neutral
 * gray, copy is matter-of-fact.
 */
export function AvoidTodayCard({ preScan, items }: AvoidTodayCardProps) {
  const list = items && items.length > 0 ? items : DEFAULT_PRE_SCAN_ITEMS;
  const title = preScan ? 'Avoid for now' : 'Avoid today';
  const body = preScan
    ? 'Before your first scan, Pura keeps things conservative — these can flare skin without context.'
    : 'Pura recommends skipping these to keep your skin calm.';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.icon}>
          <Prohibit
            size={18}
            color={plan.inkSecondary}
            weight="duotone"
          />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.15}>
          {title}
        </Text>
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={1.25}>
        {body}
      </Text>
      <View style={styles.list}>
        {list.map((line) => (
          <View key={line} style={styles.item}>
            <View style={styles.bullet} />
            <Text style={styles.itemText} maxFontSizeMultiplier={1.25}>
              {line}
            </Text>
          </View>
        ))}
      </View>
      {preScan ? (
        <Text style={styles.footer} maxFontSizeMultiplier={1.2}>
          After your first scan, Pura will tell you what to avoid based on your
          skin today.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: plan.card,
    borderWidth: 1,
    borderColor: plan.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: plan.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: plan.inkSecondary,
    marginTop: 10,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: plan.inkMuted,
  },
  itemText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: plan.ink,
  },
  footer: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: plan.inkMuted,
    marginTop: 14,
    fontStyle: 'italic',
  },
});
