/**
 * DurationChip — a small, calm duration pill for an overview step (ACT 1).
 *
 * The whisper of "how long" beside a step: a soft chip (overviewTone.chip fill +
 * a hairline edge) carrying the step's pre-computed time text ("30s" / "+60s to
 * settle" / "N min to settle"). It is information, never a timer or a countdown —
 * it sits quietly so the plan reads short and doable. Text is supplied by the
 * caller via the contract (stepDurationText), so the chip is never empty.
 *
 * The affordance is deliberately just legible: the chip's ~5% ink fill alone is
 * near-invisible against the white card and reads as plain text next to the muted
 * product line, so we add the overview's NAMED hairline as a quiet edge and set
 * the value in `contextMed` (the ramp's "a duration value" weight) — enough that
 * it reads as a distinct pill, restrained enough that it never shouts. No new
 * colour: fill + edge + text are all existing overviewTone / flowType tokens.
 *
 * Pure presentation: colors come only from `overviewTone`, type from `flowType`.
 * No motion of its own — the row's set-down carries it.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { overviewTone } from '@/theme/routineFlow';
import { flowType } from '../type';
import type { DurationChipProps } from '../contracts';

export function DurationChip({ text }: DurationChipProps) {
  return (
    <View style={styles.chip}>
      {/* No numberOfLines cap: at AX sizes a longer value ("2 min to settle")
          wraps inside the pill rather than ellipsizing — the value is never
          clipped. The chip is alignSelf flex-start, so it grows to its text. */}
      <Text
        style={styles.text}
        maxFontSizeMultiplier={1.4}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: overviewTone.chip,
    // A quiet edge so the faint fill reads as a pill, not loose body text.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewTone.hairline,
  },
  text: {
    // The ramp's "a duration value" weight — a value, not a sentence.
    ...flowType.contextMed,
    color: overviewTone.muted,
  },
});
