/**
 * ScanEvidenceMarkers — the row of three credibility markers
 * under the editorial headline (ACTIVE AREAS · MARKS · BARRIER).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme';
import type { SkinSnapshot } from '@/state/skinEdit';

interface ScanEvidenceMarkersProps {
  snapshot: SkinSnapshot;
}

export function ScanEvidenceMarkers({ snapshot }: ScanEvidenceMarkersProps) {
  return (
    <View style={styles.row}>
      {snapshot.markers.map((m, idx) => (
        <View
          key={`${m.label}-${idx}`}
          style={[
            styles.marker,
            m.emphasised ? styles.markerEmphasised : null,
            idx < snapshot.markers.length - 1 ? styles.markerWithDivider : null,
          ]}
        >
          <Text style={styles.label} maxFontSizeMultiplier={1.1}>
            {m.label}
          </Text>
          <Text
            style={[styles.value, m.emphasised ? styles.valueEmphasised : null]}
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
          >
            {m.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: '#FCFAF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  marker: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  markerEmphasised: {},
  markerWithDivider: {
    borderRightWidth: 1,
    borderRightColor: palette.hairline,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  value: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: palette.ink,
    textTransform: 'uppercase',
  },
  valueEmphasised: {
    color: palette.clayDeep,
  },
});
