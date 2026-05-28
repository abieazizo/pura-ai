/**
 * RoutineEmptyState — pre-scan state.
 *
 * Confident editorial empty page. The BuildOrb sits centered as the
 * signature, framed by a Roman-numeral promise so the page reads as a
 * statement, not a loading skeleton. One CTA.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  puraRoutineColors as C,
  puraRoutineSpace as SP,
} from '@/theme';
import { Body, EditorialHeading, PuraButton, QuietTextButton } from './primitives';
import { BuildOrb } from './BuildOrb';

interface RoutineEmptyStateProps {
  onStartScan: () => void;
  onBrowseProducts: () => void;
}

const STEPS = [
  { numeral: 'I',   label: 'Scan' },
  { numeral: 'II',  label: 'Focus' },
  { numeral: 'III', label: 'Routine' },
];

export function RoutineEmptyState({
  onStartScan,
  onBrowseProducts,
}: RoutineEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.orbWrap}>
        <BuildOrb size={148} animating={false} muted />
      </View>

      <View style={styles.flowRow}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.numeral}>
            <View style={styles.flowItem}>
              <Text style={styles.flowNumeral}>{s.numeral}</Text>
              <Text style={styles.flowLabel}>{s.label}</Text>
            </View>
            {i < STEPS.length - 1 ? <View style={styles.flowDash} /> : null}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.copy}>
        <EditorialHeading size="hero" style={styles.headline}>
          Built only from{'\n'}what your skin shows.
        </EditorialHeading>
        <Body size="large" style={styles.lead}>
          One private scan and Pura draws the smallest routine your skin
          actually needs tonight.
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

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SP.gutter,
    paddingTop: 22,
    alignItems: 'center',
  },
  orbWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  flowRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  flowNumeral: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 15,
    color: C.coralStrong,
    letterSpacing: 0.2,
  },
  flowLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: C.ink,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  flowDash: {
    width: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.lineStrong,
  },
  copy: {
    marginTop: SP.section,
    alignItems: 'center',
  },
  headline: {
    textAlign: 'center',
  },
  lead: {
    marginTop: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
});
