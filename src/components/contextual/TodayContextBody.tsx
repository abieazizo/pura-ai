import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { hapt } from '@/utils/haptics';
import { OnboardingPrimaryButton } from '@/components/onboarding/PrimaryButton';
import { palette } from '@/theme';

export interface TodayContextBodyProps {
  onSubmit: (note: string | null) => void;
}

const CHIPS = ['Stress', 'Poor sleep', 'Period', 'Travel', 'New product', 'Sick'];

/**
 * Contextual sheet body for Trigger 1 — "Anything going on today?" (§3.2).
 * Wrap-to-fit multi-select chip row + a free-text field + primary button.
 * Submission joins selected chips + trimmed free-text into a single
 * `contextualTodayNote` string (or null if both empty).
 */
export function TodayContextBody({ onSubmit }: TodayContextBodyProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const toggle = (value: string) => {
    hapt.select();
    setSelected((cur) =>
      cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]
    );
  };

  const submit = () => {
    const parts: string[] = [...selected];
    const trimmed = note.trim();
    if (trimmed.length > 0) parts.push(trimmed);
    const joined = parts.length > 0 ? parts.join(', ') : null;
    onSubmit(joined);
  };

  return (
    <View>
      <View style={styles.chips}>
        {CHIPS.map((c) => {
          const active = selected.includes(c);
          return (
            <Pressable
              key={c}
              onPress={() => toggle(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipIdle,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  active ? styles.chipTextActive : styles.chipTextIdle,
                ]}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inputWrap}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything else?"
          placeholderTextColor="rgba(26,22,20,0.25)"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <View style={styles.underline} />
      </View>

      <OnboardingPrimaryButton
        label="Continue"
        onPress={submit}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: { backgroundColor: 'rgba(212,165,116,0.5)' }, // sand @ 50%
  chipActive: { backgroundColor: palette.clay },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  chipTextIdle: { color: palette.ink },
  chipTextActive: { color: palette.bg },

  inputWrap: {
    marginTop: 16,
  },
  input: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    color: palette.ink,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  underline: {
    height: 1,
    backgroundColor: 'rgba(26,22,20,0.15)',
  },

  cta: {
    marginTop: 16,
    marginHorizontal: 0,
  },
});
