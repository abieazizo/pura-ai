/**
 * RecoveryNightFallback — the experience when the user taps
 * "Skip scan — choose a recovery night" on the home portal.
 *
 * Pura must still feel valuable even when the user does not scan. No
 * guilt, no missing-data warnings, no disabled content. The screen
 * delivers one message: a quiet night is still care.
 *
 * Reads only from `pura26` tokens.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hapt } from '@/utils/haptics';
import { pura26 } from '@/screens/home/homeTokens';
import {
  MinimalRoutineSequence,
  type SequenceStep,
} from './MinimalRoutineSequence';
import { TonightsEdit } from './TonightsEdit';
import { PrimaryCTA } from './PrimaryCTA';

export interface RecoveryNightFallbackProps {
  /** Returns the user to the mirror portal. */
  onTakeLook: () => void;
  /** Sends the user into the existing routine destination to act. */
  onBegin: () => void;
}

const RECOVERY_STEPS: readonly SequenceStep[] = [
  {
    title: 'Cleanse gently',
    hint: 'Gently remove buildup. No scrubbing.',
  },
  {
    title: 'Moisturize',
    hint: 'Support your barrier and stop there.',
  },
];

export function RecoveryNightFallback({
  onTakeLook,
  onBegin,
}: RecoveryNightFallbackProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.headline} maxFontSizeMultiplier={1.2}>
          A quiet night{'\n'}is still care.
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.2}>
          Without a new scan, keep tonight simple and leave active
          treatments for another evening.
        </Text>
      </View>

      <TonightsEdit headline="Two steps tonight.">
        <MinimalRoutineSequence
          steps={RECOVERY_STEPS}
          closing="Stop there."
        />
      </TonightsEdit>

      <View style={styles.actions}>
        <PrimaryCTA label="Begin recovery night" onPress={onBegin} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take tonight's look instead"
          onPress={() => {
            hapt.select();
            onTakeLook();
          }}
          hitSlop={10}
          style={({ pressed }) => [
            styles.secondary,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.secondaryText} maxFontSizeMultiplier={1.1}>
            Take tonight’s look instead
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 36,
    paddingBottom: 160,
  },
  hero: {
    paddingHorizontal: 32,
    paddingBottom: 44,
    gap: 22,
  },
  headline: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 46,
    lineHeight: 52,
    letterSpacing: -1.0,
    color: pura26.ink,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16.5,
    lineHeight: 25,
    color: pura26.inkSecondary,
  },
  actions: {
    paddingHorizontal: 32,
    paddingTop: 36,
    gap: 20,
  },
  secondary: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    color: pura26.inkSecondary,
    letterSpacing: 0.1,
  },
});
