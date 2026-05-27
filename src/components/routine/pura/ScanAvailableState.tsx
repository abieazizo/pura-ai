/**
 * ScanAvailableState — scan complete, routine not yet built.
 *
 * Shows the count of usable focus areas (from real findings) and
 * offers the build CTA. Never shows a routine preview.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
  puraRoutineSpace as SP,
  puraRoutineType as T,
} from '@/theme';
import {
  Body,
  EditorialHeading,
  Eyebrow,
  PuraButton,
  PuraCard,
  QuietTextButton,
} from './primitives';
import { BuildOrb } from './BuildOrb';

interface ScanAvailableStateProps {
  focusAreaCount: number;
  onBuild: () => void;
  onViewResults: () => void;
}

export function ScanAvailableState({
  focusAreaCount,
  onBuild,
  onViewResults,
}: ScanAvailableStateProps) {
  return (
    <View style={styles.wrap}>
      <PuraCard tone="soft" elevation="hero" style={styles.card}>
        <View style={styles.orbColumn}>
          <BuildOrb size={96} animating={false} />
        </View>
        <View style={styles.content}>
          <Eyebrow>SCAN READY</Eyebrow>
          <EditorialHeading size="page" style={{ marginTop: 8 }}>
            Build a routine{'\n'}from your scan.
          </EditorialHeading>
          <Body style={{ marginTop: 12 }}>
            Pura found visible focus areas and can turn them into practical
            steps.
          </Body>
          <View style={styles.statRow}>
            <View style={styles.statDot} />
            <Body size="soft" style={{ color: C.body }}>
              {focusAreaCount} focus area{focusAreaCount === 1 ? '' : 's'}{' '}
              identified
            </Body>
          </View>
        </View>
      </PuraCard>

      <PuraButton
        label="Build custom routine"
        variant="coral"
        onPress={onBuild}
        style={{ marginTop: SP.lg, alignSelf: 'stretch' }}
      />
      <QuietTextButton
        label="View scan results"
        tone="muted"
        onPress={onViewResults}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 18,
  },
  card: {
    flexDirection: 'row',
    gap: SP.lg,
    padding: SP.xl,
    alignItems: 'flex-start',
  },
  orbColumn: {
    alignItems: 'center',
    paddingTop: 4,
  },
  content: {
    flex: 1,
  },
  statRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.coral,
  },
});
