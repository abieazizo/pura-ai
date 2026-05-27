/**
 * MinimalRoutineSequence — quiet, editorial list of tonight's steps.
 *
 * Unlike a routine card, this component renders steps as a sequence
 * with breathing room — no chips, no progress bars, no row chrome.
 * One added step may be emphasised with a soft terracotta tint; a
 * paused step uses the same wash at reduced opacity. Everything else
 * is calm ink.
 *
 * Reads only from `pura26` tokens.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { pura26 } from '@/screens/home/homeTokens';

export type StepEmphasis = 'normal' | 'added' | 'paused';

export interface SequenceStep {
  /** Short title — "Cleanse gently", "Moisturize". */
  title: string;
  /** One sentence of guidance. Keep it intimate, not clinical. */
  hint?: string;
  emphasis?: StepEmphasis;
}

export interface MinimalRoutineSequenceProps {
  steps: readonly SequenceStep[];
  /** Optional closing line — "Done after two steps." */
  closing?: string;
}

export function MinimalRoutineSequence({
  steps,
  closing,
}: MinimalRoutineSequenceProps) {
  return (
    <View style={styles.wrap} accessibilityRole="list">
      {steps.map((step, idx) => (
        <View
          key={`${idx}-${step.title}`}
          accessibilityRole="text"
          style={styles.row}
        >
          <View style={styles.indexColumn}>
            <Text
              style={[
                styles.index,
                step.emphasis === 'added' && styles.indexAdded,
                step.emphasis === 'paused' && styles.indexPaused,
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {String(idx + 1).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.body}>
            <Text
              style={[
                styles.title,
                step.emphasis === 'paused' && styles.titlePaused,
                step.emphasis === 'added' && styles.titleAdded,
              ]}
              maxFontSizeMultiplier={1.15}
            >
              {step.title}
            </Text>
            {step.hint ? (
              <Text
                style={[
                  styles.hint,
                  step.emphasis === 'paused' && styles.hintPaused,
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {step.hint}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      {closing ? (
        <Text style={styles.closing} maxFontSizeMultiplier={1.15}>
          {closing}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  indexColumn: {
    width: 22,
    paddingTop: 4,
  },
  index: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 17,
    color: pura26.inkFaint,
    letterSpacing: 0,
  },
  indexAdded: {
    color: pura26.terracottaText,
  },
  indexPaused: {
    color: pura26.terracottaText,
    opacity: 0.5,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: pura26.ink,
    letterSpacing: -0.1,
  },
  titlePaused: {
    color: pura26.terracottaText,
    opacity: 0.6,
  },
  titleAdded: {
    color: pura26.terracottaText,
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 21,
    color: pura26.inkSecondary,
  },
  hintPaused: {
    color: pura26.inkMuted,
    fontStyle: 'italic',
  },
  closing: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 26,
    color: pura26.ink,
    letterSpacing: -0.3,
    marginTop: 8,
  },
});
