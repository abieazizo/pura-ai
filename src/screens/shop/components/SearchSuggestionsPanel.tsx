/**
 * SearchSuggestionsPanel — surfaces when the search input is focused
 * AND empty. Renders two short rows of tappable terms:
 *
 *   • RECENT — the user's last few searches this session.
 *   • POPULAR — curated shortcut terms drawn from POPULAR_SEARCHES.
 *
 * Designed to disappear cleanly the moment the user starts typing.
 * Renders inline (not a dropdown) so it composes with the rest of
 * the scrollable page; collapses to zero height when there's
 * nothing to show.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Clock, Sparkle } from 'phosphor-react-native';
import {
  puraShop,
  puraShopLayout,
  puraShopRadius,
} from '@/theme';

export interface SearchSuggestionsPanelProps {
  recent: readonly string[];
  popular: readonly string[];
  onSelect: (term: string) => void;
}

export function SearchSuggestionsPanel({
  recent,
  popular,
  onSelect,
}: SearchSuggestionsPanelProps) {
  if (recent.length === 0 && popular.length === 0) return null;
  return (
    <View style={styles.outer}>
      {recent.length > 0 ? (
        <Row
          kicker="RECENT"
          icon="clock"
          items={recent}
          onSelect={onSelect}
        />
      ) : null}
      {popular.length > 0 ? (
        <Row
          kicker="POPULAR"
          icon="sparkle"
          items={popular}
          onSelect={onSelect}
        />
      ) : null}
    </View>
  );
}

function Row({
  kicker,
  icon,
  items,
  onSelect,
}: {
  kicker: string;
  icon: 'clock' | 'sparkle';
  items: readonly string[];
  onSelect: (s: string) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.kickerRow}>
        {icon === 'clock' ? (
          <Clock size={11} color={puraShop.inkMuted} weight="bold" />
        ) : (
          <Sparkle size={11} color={puraShop.coral} weight="fill" />
        )}
        <Text style={styles.kicker} maxFontSizeMultiplier={1.15}>
          {kicker}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {items.map((t) => (
          <Pressable
            key={t}
            onPress={() => onSelect(t)}
            accessibilityRole="button"
            accessibilityLabel={`${kicker} search: ${t}`}
            style={({ pressed }) => [
              styles.chip,
              pressed && { opacity: 0.86, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.chipLabel} maxFontSizeMultiplier={1.15} numberOfLines={1}>
              {t}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingBottom: 12,
  },
  row: {
    marginTop: 4,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: puraShopLayout.horizontalPadding,
    marginBottom: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.0,
    color: puraShop.inkMuted,
    textTransform: 'uppercase',
  },
  chipsRow: {
    paddingHorizontal: puraShopLayout.horizontalPadding,
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: puraShopRadius.chip,
    backgroundColor: puraShop.surface,
    borderWidth: 1,
    borderColor: puraShop.borderWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: puraShop.ink,
    letterSpacing: -0.1,
  },
});
