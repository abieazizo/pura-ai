import React from 'react';
import { StyleSheet, Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { PURA, PURA_FONT } from './tokensV2';

/**
 * v25 — typography primitives.
 *
 * The editorial serif is reserved for high-impact moments (Welcome, Baseline
 * Reveal, Plan Reveal, Save). Functional / decision screens use the sans
 * `FunctionalHeadline`. Body / eyebrow / supporting copy share a single
 * scale so screens compose consistently.
 */

interface BaseProps extends TextProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function EditorialHeadline({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.15}
      style={[styles.editorial, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function FunctionalHeadline({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.2}
      style={[styles.functional, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function BodyText({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[styles.body, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Eyebrow({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.1}
      style={[styles.eyebrow, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function HelperText({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.25}
      style={[styles.helper, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  editorial: {
    fontFamily: PURA_FONT.serif,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: PURA.ink,
  },
  functional: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: PURA.ink,
  },
  body: {
    fontFamily: PURA_FONT.sans,
    fontSize: 16,
    lineHeight: 23,
    color: PURA.body,
  },
  eyebrow: {
    fontFamily: PURA_FONT.sansSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    color: PURA.muted,
    textTransform: 'uppercase',
  },
  helper: {
    fontFamily: PURA_FONT.sans,
    fontSize: 13,
    lineHeight: 19,
    color: PURA.muted,
  },
});
