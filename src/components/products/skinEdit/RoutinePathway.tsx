/**
 * RoutinePathway — small horizontal sequence of routine steps with one
 * step actively highlighted. Used inside the hero recommendation card
 * and the "Where it belongs" section.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { palette } from '@/theme';

interface RoutinePathwayProps {
  steps: string[];
  activeIndex: number;
  variant?: 'subtle' | 'card';
}

export function RoutinePathway({ steps, activeIndex, variant = 'subtle' }: RoutinePathwayProps) {
  return (
    <View style={[styles.wrap, variant === 'card' ? styles.wrapCard : styles.wrapSubtle]}>
      {steps.map((step, idx) => {
        const isActive = idx === activeIndex;
        return (
          <View key={`${step}-${idx}`} style={styles.stepWrap}>
            <View
              style={[
                styles.step,
                isActive ? styles.stepActive : styles.stepIdle,
              ]}
            >
              <Text
                style={[
                  styles.stepLabel,
                  isActive ? styles.stepLabelActive : styles.stepLabelIdle,
                ]}
                maxFontSizeMultiplier={1.1}
                numberOfLines={1}
              >
                {step}
              </Text>
            </View>
            {idx < steps.length - 1 ? (
              <CaretRight size={12} color={palette.inkTertiary} weight="bold" style={styles.caret} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  wrapSubtle: {
    gap: 0,
  },
  wrapCard: {
    backgroundColor: palette.sandPaper,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  stepWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  step: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stepIdle: {
    backgroundColor: 'transparent',
  },
  stepActive: {
    backgroundColor: palette.clay,
  },
  stepLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  stepLabelIdle: {
    color: palette.inkSecondary,
  },
  stepLabelActive: {
    color: palette.inkInverse,
  },
  caret: {
    marginHorizontal: 2,
  },
});
