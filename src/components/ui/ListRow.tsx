/**
 * ListRow — the canonical settings / list row (Cycle 2). Leading icon,
 * label (+ optional sublabel), trailing value and/or accessory (defaults to a
 * chevron when pressable). Destructive variant tints the label red.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ds, danger, dsSpace, dsType } from '@/theme';
import { PressableScale } from './PressableScale';

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 3.5L10.5 8L6 12.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface ListRowProps {
  label: string;
  icon?: React.ReactNode;
  sublabel?: string;
  value?: string;
  accessory?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Hairline divider under the row. Default true; pass false on the last row. */
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  label,
  icon,
  sublabel,
  value,
  accessory,
  onPress,
  destructive,
  showDivider = true,
  style,
}: ListRowProps) {
  const labelColor = destructive ? danger[500] : ds.textPrimary;

  const inner = (
    <View style={styles.inner}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.textCol}>
        <Text numberOfLines={1} style={[dsType.bodyMed, { color: labelColor }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text numberOfLines={1} style={[dsType.caption, styles.sub]}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text numberOfLines={1} style={[dsType.bodySm, styles.value]}>
          {value}
        </Text>
      ) : null}
      {accessory !== undefined
        ? accessory
        : onPress
          ? <Chevron color={ds.textMuted} />
          : null}
    </View>
  );

  const rowStyle = [styles.row, showDivider && styles.divider, style];

  if (onPress) {
    return (
      <PressableScale
        scaleTo={0.99}
        haptic="select"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={value}
        style={rowStyle}
      >
        {inner}
      </PressableScale>
    );
  }

  return <View style={rowStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    justifyContent: 'center',
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ds.divider,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: dsSpace.md,
  },
  icon: { marginRight: dsSpace.md },
  textCol: { flex: 1 },
  sub: { color: ds.textTertiary, marginTop: 2 },
  value: { color: ds.textTertiary, marginRight: dsSpace.sm },
});
