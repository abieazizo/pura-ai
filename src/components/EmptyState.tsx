import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, space, type as typography } from '@/theme';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: StyleProp<ViewStyle>;
  align?: 'center' | 'left';
}

export function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onCta,
  style,
  align = 'center',
}: EmptyStateProps) {
  const centered = align === 'center';
  return (
    <View style={[styles.root, centered && styles.centered, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, centered && styles.textCentered]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, centered && styles.textCentered]}>{body}</Text>
      ) : null}
      {ctaLabel && onCta ? (
        <View style={styles.cta}>
          <PrimaryButton label={ctaLabel} onPress={onCta} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: space.xl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: space.md,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  textCentered: {
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: space.sm,
  },
  cta: {
    marginTop: space.lg,
    width: '100%',
  },
});
