import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Body,
  Eyebrow,
  PrimaryAction,
  SecondaryAction,
  SectionHeading,
  Surface,
} from './primitives';
import { V26_SPACE } from './tokens';

interface MorningSPFProps {
  onAddOwned: () => void;
  onFindMatch?: () => void;
  onSetReminder?: () => void;
}

/**
 * v26 — Tomorrow Morning module.
 *
 * Appears only after routine completion. Quiet preparation for
 * tomorrow, not an advertisement. The owned-product CTA appears first;
 * discovery is a small secondary link.
 */
export function MorningSPF({
  onAddOwned,
  onFindMatch,
  onSetReminder,
}: MorningSPFProps) {
  return (
    <Surface tone="surface" style={s.card}>
      <Eyebrow>TOMORROW MORNING</Eyebrow>
      <SectionHeading style={s.headline}>
        Protect against lingering marks.
      </SectionHeading>
      <Body style={s.body}>
        SPF can help reduce dark marks after active breakouts.
      </Body>
      <PrimaryAction
        label="Add an SPF I already use"
        variant="ink"
        onPress={onAddOwned}
        style={s.cta}
      />
      <View style={s.row}>
        {onFindMatch ? (
          <SecondaryAction
            label="Find one that fits my skin"
            tone="muted"
            onPress={onFindMatch}
          />
        ) : null}
        {onSetReminder ? (
          <SecondaryAction
            label="Set morning reminder"
            tone="muted"
            onPress={onSetReminder}
          />
        ) : null}
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 0,
  },
  headline: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 25,
  },
  body: {
    marginTop: 10,
  },
  cta: {
    marginTop: V26_SPACE.section,
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
});
