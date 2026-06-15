/**
 * SectionLabel — the slim AM/PM eyebrow over an overview group (ACT 1).
 *
 * Introduces a group of steps ("MORNING" / "EVENING") in the locked eyebrow
 * ramp (flowType.eyebrow, UPPERCASE), with an optional muted time-line beneath
 * it ("About 2 minutes") so the eye knows the group is short before reading it.
 * It is a typeset section heading, not a control — no chevrons, no toggles.
 *
 * The active vs. upcoming emphasis lives on the PARENT (it sets group opacity);
 * this component renders one consistent, legible label so a receded group is
 * never disabled-grey, only quietly dimmed. Colors from `overviewTone`, type
 * from `flowType`.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { overviewTone } from '@/theme/routineFlow';
import { flowType } from '../type';
import type { SectionLabelProps } from '../contracts';

export function SectionLabel({ label, timeLine }: SectionLabelProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4} accessibilityRole="header">
        {label}
      </Text>
      {timeLine ? (
        <Text style={styles.timeLine} maxFontSizeMultiplier={1.5}>
          {timeLine}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...flowType.eyebrow,
    color: overviewTone.faint,
  },
  timeLine: {
    ...flowType.context,
    color: overviewTone.muted,
    marginLeft: 12,
  },
});
