import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LockOpen, BellRinging, CreditCard } from 'phosphor-react-native';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import { palette } from '@/theme';

export interface TrialTimelineItem {
  Icon: React.FC<PhosphorIconProps>;
  title: string;
  body: string;
}

export interface TrialTimelineProps {
  /** Override the default 3-row timeline. */
  items?: TrialTimelineItem[];
}

const DEFAULT_ITEMS: TrialTimelineItem[] = [
  {
    Icon: LockOpen,
    title: 'Today',
    body: 'Unlock your full 84-day plan — scans, routines, product matches, and progress tracking.',
  },
  {
    Icon: BellRinging,
    title: 'In 5 days',
    body: 'We’ll remind you before your trial ends so you can decide.',
  },
  {
    Icon: CreditCard,
    title: 'In 7 days',
    body: 'Billing starts only if you stay. Cancel anytime in the App Store.',
  },
];

/**
 * v20.0 — paywall trial timeline. Three rows with a continuous vertical
 * rail behind a soft-tile icon column and an explanation column. Reads
 * as a calm, factual schedule — not a high-pressure sales sequence.
 *
 * The body of the final row is platform-agnostic ("App Store"); if/when
 * the app ships on Android, swap to "your app store settings" via the
 * `items` prop.
 */
export function TrialTimeline({ items = DEFAULT_ITEMS }: TrialTimelineProps) {
  return (
    <View style={styles.wrap} accessible accessibilityLabel="How your free trial works">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <View key={item.title} style={styles.row}>
            <View style={styles.railCol}>
              <View style={styles.iconTile}>
                <item.Icon size={18} color={palette.bg} weight="duotone" />
              </View>
              {!isLast ? <View style={styles.rail} /> : null}
            </View>
            <View style={[styles.textCol, isLast && styles.textColLast]}>
              <Text style={styles.title} maxFontSizeMultiplier={1.2}>
                {item.title}
              </Text>
              <Text style={styles.body} maxFontSizeMultiplier={1.25}>
                {item.body}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railCol: {
    width: 44,
    alignItems: 'center',
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    width: 2,
    flex: 1,
    backgroundColor: palette.clayLight,
    marginTop: 2,
    marginBottom: 2,
    alignSelf: 'center',
  },
  textCol: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 22,
    paddingTop: 4,
  },
  textColLast: {
    paddingBottom: 4,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSecondary,
    marginTop: 4,
  },
});
