import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dx, dRadius } from '../decisionTokens';

interface Tile {
  primary: string;
  label: string;
  trailing?: string;
}

interface Props {
  tiles: Tile[];
}

/**
 * Two-column evidence row. Each tile leads with a number/area
 * primary, then a small label, then a quieter trailing line for the
 * delta or comparison phrase. Designed to feel like a quiet data
 * surface, not a glanceable card.
 */
export function EvidenceTileRow({ tiles }: Props) {
  return (
    <View style={styles.row}>
      {tiles.map((tile, i) => (
        <View
          key={`${tile.primary}-${i}`}
          style={[styles.tile, { marginRight: i < tiles.length - 1 ? 10 : 0 }]}
        >
          <Text
            style={styles.primary}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {tile.primary}
          </Text>
          <Text
            style={styles.label}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {tile.label}
          </Text>
          {tile.trailing ? (
            <Text
              style={styles.trailing}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {tile.trailing}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tile: {
    flex: 1,
    minHeight: 72,
    backgroundColor: dx.surfaceSecondary,
    borderColor: dx.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    gap: 2,
  },
  primary: {
    fontFamily: 'InstrumentSerif-SemiBold',
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: dx.ink,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: dx.ink,
    letterSpacing: -0.05,
    marginTop: 1,
  },
  trailing: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: dx.inkMuted,
    lineHeight: 15,
  },
});
