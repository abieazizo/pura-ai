import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, space, type as typography } from '@/theme';

export interface EditorialRuleProps {
  /** The kicker text — will be rendered in `type.micro`. */
  label: string;
  /** Trailing micro text (e.g. "2 of 4"). */
  trailing?: string;
  /** Color of the short clay rule. Defaults to `colors.clay`. */
  ruleColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The section signature: a 24pt clay hairline sitting 8pt above a micro
 * all-caps label. Evokes a magazine kicker or a table-of-contents rule.
 * Used above every major section heading throughout the app.
 */
export function EditorialRule({
  label,
  trailing,
  ruleColor,
  style,
}: EditorialRuleProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.rule, { backgroundColor: ruleColor ?? colors.clay }]} />
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.sm,
  },
  rule: {
    width: 24,
    height: 1,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.micro,
    color: colors.clay,
  },
  trailing: {
    ...typography.micro,
    color: colors.inkTertiary,
  },
});
