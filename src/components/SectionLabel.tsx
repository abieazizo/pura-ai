import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, space, type as typography } from '@/theme';

export interface SectionLabelProps {
  text: string;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionLabel({ text, trailing, style }: SectionLabelProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{text}</Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  label: {
    ...typography.micro,
    color: colors.textTertiary,
  },
  trailing: {
    marginLeft: space.sm,
  },
});
