import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, type TextProps } from 'react-native';
import { T, TYPE } from './tokens';

/**
 * v25 typography primitives. Editorial serif is reserved for emotional
 * statements; sans carries functional UI.
 */

interface BaseProps extends TextProps {
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function DisplayHero({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.15}
      style={[s.displayHero, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function ScreenTitle({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.2}
      style={[s.screenTitle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function CardHeadline({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={[s.cardHeadline, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function SkinScoreNumber({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.1}
      style={[s.skinScore, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function BodyPrimary({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.25}
      style={[s.bodyPrimary, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function BodyFunctional({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.25}
      style={[s.bodyFunctional, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function SectionLabel({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.15}
      style={[s.sectionLabel, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Metadata({ style, children, ...rest }: BaseProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={[s.metadata, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const s = StyleSheet.create({
  displayHero: {
    fontFamily: TYPE.serif,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.6,
    color: T.ink,
  },
  screenTitle: {
    fontFamily: TYPE.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: T.ink,
  },
  cardHeadline: {
    fontFamily: TYPE.serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: T.ink,
  },
  skinScore: {
    fontFamily: TYPE.serifSemi,
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -1.5,
    color: T.ink,
  },
  bodyPrimary: {
    fontFamily: TYPE.sans,
    fontSize: 16,
    lineHeight: 23,
    color: T.inkSecondary,
  },
  bodyFunctional: {
    fontFamily: TYPE.sansMed,
    fontSize: 14.5,
    lineHeight: 21,
    color: T.inkSecondary,
  },
  sectionLabel: {
    fontFamily: TYPE.sansSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    color: T.inkMuted,
    textTransform: 'uppercase',
  },
  metadata: {
    fontFamily: TYPE.sansMed,
    fontSize: 12,
    lineHeight: 17,
    color: T.inkMuted,
  },
});
