import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Sparkle,
  Drop,
  Leaf,
  ShieldCheck,
  Moon,
  Lightning,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getConcerns } from '@/utils/concerns';
import type { Concern } from '@/types';

export interface SearchSuggestionsProps {
  /** Called when the user taps a chip — parent fills the search field. */
  onPick: (query: string) => void;
}

interface Suggestion {
  key: string;
  label: string;
  query: string;
  Icon: React.FC<PhosphorIconProps>;
}

/**
 * v10.3 — intelligent search suggestions. Renders a horizontal row of
 * smart chips ABOVE the search results, only when the query is empty.
 *
 * Chips are derived from the user's actual state:
 *   1. If they have a scan, the top concern becomes a scan-aware chip
 *      (e.g. "For breakouts on your chin").
 *   2. If sensitivity is very/somewhat, a "Fragrance-free" chip surfaces.
 *   3. Always-on discovery chips round out the row:
 *        "Best for your skin" · "Natural" · "Evening essentials"
 *
 * Chip order is deterministic for a given user state so the search
 * experience feels consistent rather than randomized. Each tap fires a
 * selection haptic and fills the search field with the chip's query so
 * the user can refine from there.
 */
export function SearchSuggestions({ onPick }: SearchSuggestionsProps) {
  const { scans, sensitivity } = useAppStore(
    useShallow((s) => ({
      scans: s.scans,
      sensitivity: s.sensitivity,
    }))
  );

  const suggestions = useMemo<Suggestion[]>(
    () => buildSuggestions(scans, sensitivity),
    [scans, sensitivity]
  );

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        TRY
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {suggestions.map((s) => {
          const Icon = s.Icon;
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                hapt.select();
                onPick(s.query);
              }}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              style={({ pressed }) => [
                styles.chip,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Icon
                size={13}
                color={palette.clay}
                weight="duotone"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.chipLabel} maxFontSizeMultiplier={1.1}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Suggestion builder
// ---------------------------------------------------------------------------

function buildSuggestions(
  scans: ReturnType<typeof useAppStore.getState>['scans'],
  sensitivity: ReturnType<typeof useAppStore.getState>['sensitivity']
): Suggestion[] {
  const out: Suggestion[] = [];

  // 1 — scan-aware. Latest non-calm concern becomes the lead chip.
  const latest = scans[scans.length - 1];
  const previous = scans.length >= 2 ? scans[scans.length - 2] : undefined;
  if (latest) {
    const concerns = getConcerns(latest, previous);
    const top = concerns.find((c) => c.severity !== 'calm') ?? concerns[0];
    if (top) {
      out.push(scanAwareChip(top));
    }
  }

  // 2 — sensitivity-aware.
  if (sensitivity === 'very' || sensitivity === 'somewhat') {
    out.push({
      key: 'fragrance-free',
      label: 'Fragrance-free',
      query: 'fragrance-free',
      Icon: ShieldCheck as React.FC<PhosphorIconProps>,
    });
  }

  // 3 — always-on discovery. Dedupe by key so scan-aware + always-on
  //     don't collide.
  const alwaysOn: Suggestion[] = [
    {
      key: 'best-for-you',
      label: 'Best for your skin',
      query: 'best for your skin',
      Icon: Sparkle as React.FC<PhosphorIconProps>,
    },
    {
      key: 'natural',
      label: 'Natural',
      query: 'natural',
      Icon: Leaf as React.FC<PhosphorIconProps>,
    },
    {
      key: 'evening',
      label: 'Evening essentials',
      query: 'evening',
      Icon: Moon as React.FC<PhosphorIconProps>,
    },
    {
      key: 'actives',
      label: 'Gentle actives',
      query: 'gentle actives',
      Icon: Lightning as React.FC<PhosphorIconProps>,
    },
  ];
  for (const chip of alwaysOn) {
    if (!out.find((s) => s.key === chip.key)) out.push(chip);
  }

  return out.slice(0, 5);
}

function scanAwareChip(concern: Concern): Suggestion {
  const region = concern.region;
  switch (concern.category) {
    case 'breakouts':
      return {
        key: `scan-${concern.category}`,
        label: `For ${region} breakouts`,
        query: `breakouts on ${region}`,
        Icon: Sparkle as React.FC<PhosphorIconProps>,
      };
    case 'hydration':
      return {
        key: `scan-${concern.category}`,
        label: `Hydration for ${region}`,
        query: `hydration for ${region}`,
        Icon: Drop as React.FC<PhosphorIconProps>,
      };
    case 'texture':
      return {
        key: `scan-${concern.category}`,
        label: `Smooth ${region} texture`,
        query: `texture on ${region}`,
        Icon: Sparkle as React.FC<PhosphorIconProps>,
      };
    case 'tone':
      return {
        key: `scan-${concern.category}`,
        label: `Dark marks on ${region}`,
        query: `dark marks on ${region}`,
        Icon: Moon as React.FC<PhosphorIconProps>,
      };
  }
  // Exhaustive above; no default branch needed.
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    marginBottom: 6,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: palette.inkTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginHorizontal: 20,
  },
  row: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.bg,
  },
  chipLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: -0.05,
    color: palette.ink,
  },
});
