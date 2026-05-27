/**
 * RoutineEmptyState — pre-scan state.
 *
 * A premium empty page. No fake steps, no AM/PM toggle, no progress.
 * One clear call to action: scan the user's skin.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import { Body, EditorialHeading, Eyebrow, PuraButton, QuietTextButton } from './primitives';
import { BuildOrb } from './BuildOrb';

interface RoutineEmptyStateProps {
  onStartScan: () => void;
  onBrowseProducts: () => void;
}

export function RoutineEmptyState({
  onStartScan,
  onBrowseProducts,
}: RoutineEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.orbWrap}>
        <BuildOrb size={132} animating={false} muted />
        <View style={styles.ghostSteps}>
          <GhostStep />
          <GhostStep />
          <GhostStep />
        </View>
      </View>

      <View style={styles.copy}>
        <Eyebrow tone="muted">SCAN REQUIRED</Eyebrow>
        <EditorialHeading size="hero" style={{ marginTop: 8, textAlign: 'center' }}>
          Start with a scan.
        </EditorialHeading>
        <Body size="large" style={{ marginTop: 12, textAlign: 'center' }}>
          Pura builds your routine after identifying visible focus areas in
          your skin.
        </Body>
      </View>

      <PuraButton
        label="Scan my skin"
        variant="coral"
        onPress={onStartScan}
        style={{ marginTop: SP.section, alignSelf: 'stretch' }}
      />
      <QuietTextButton
        label="Browse products instead"
        tone="muted"
        onPress={onBrowseProducts}
        style={{ marginTop: 10 }}
      />
    </View>
  );
}

function GhostStep() {
  return <View style={styles.ghostBar} />;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 18,
    alignItems: 'center',
  },
  orbWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostSteps: {
    marginTop: 14,
    gap: 8,
    alignItems: 'center',
  },
  ghostBar: {
    width: 140,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.line,
    opacity: 0.7,
  },
  copy: {
    marginTop: SP.lg,
    alignItems: 'center',
  },
});
