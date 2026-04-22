import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  FlowerLotus,
  Leaf,
  Shield,
  Sparkle,
  Trophy,
  type IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { hapt } from '@/utils/haptics';
import { palette } from '@/theme';
import type { Product } from '@/types';
import type { AppState } from '@/store/useAppStore';

export interface FitTag {
  id: 'best-for-you' | 'natural' | 'sensitive-safe' | 'fragrance-free' | 'best-overall' | 'new';
  Icon: React.FC<PhosphorIconProps>;
  label: string;
  explanation: string;
}

/**
 * Why-this-fits engine (§3.7). Produces up to 6 reasons the product is a
 * fit for the signed-in user. If nothing qualifies, the parent hides the
 * whole row (including kicker).
 */
export function computeFitTags(
  product: Product,
  user: Pick<AppState, 'skinType' | 'concerns' | 'sensitivity'>
): FitTag[] {
  const tags: FitTag[] = [];

  if (product.matchScore >= 80) {
    const skinLabel = user.skinType ?? 'skin';
    const concernPart =
      user.concerns && user.concerns.length > 0
        ? ` and ${user.concerns[0].toLowerCase()} focus`
        : '';
    tags.push({
      id: 'best-for-you',
      Icon: Sparkle,
      label: 'Best for you',
      explanation: `Matches your ${skinLabel} skin${concernPart}.`,
    });
  }

  if (product.tags.includes('natural') || product.tags.includes('clean')) {
    tags.push({
      id: 'natural',
      Icon: Leaf,
      label: 'Natural',
      explanation: 'Plant-based formula, free of synthetic fragrance.',
    });
  }

  if (
    product.tags.includes('sensitive-safe') &&
    (user.sensitivity === 'very' || user.sensitivity === 'somewhat')
  ) {
    tags.push({
      id: 'sensitive-safe',
      Icon: Shield,
      label: 'Sensitive-safe',
      explanation: 'No common irritants for sensitive skin.',
    });
  }

  if (product.tags.includes('fragrance-free')) {
    tags.push({
      id: 'fragrance-free',
      Icon: FlowerLotus,
      label: 'Fragrance-free',
      explanation: 'No added fragrance — less irritation risk.',
    });
  }

  if (product.rating >= 4.7) {
    tags.push({
      id: 'best-overall',
      Icon: Trophy,
      label: 'Best overall',
      explanation: `Top-rated by ${product.reviewCount.toLocaleString()} users.`,
    });
  }

  const daysSinceAdded = Math.floor(
    (Date.now() - new Date(product.addedDate).getTime()) / 86400000
  );
  if (daysSinceAdded <= 30) {
    tags.push({
      id: 'new',
      Icon: Sparkle,
      label: 'New',
      explanation: 'Added to our catalog within the last month.',
    });
  }

  return tags.slice(0, 6);
}

export interface FitTagsRowProps {
  product: Product;
  user: Pick<AppState, 'skinType' | 'concerns' | 'sensitivity'>;
}

/**
 * The row itself. Kicker + horizontal list of sand-tinted pills + a single
 * explanation card below that expands when a pill is active.
 */
export function FitTagsRow({ product, user }: FitTagsRowProps) {
  const tags = useMemo(() => computeFitTags(product, user), [product, user]);
  const [activeId, setActiveId] = useState<FitTag['id'] | null>(null);
  const activeTag = tags.find((t) => t.id === activeId) ?? null;

  const cardProgress = useSharedValue(0);

  React.useEffect(() => {
    cardProgress.value = withTiming(activeTag ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeTag, cardProgress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    // `maxHeight: 0` on the collapsed state collapses the card without a
    // measured-height layout pass. 240 is a generous upper bound; the
    // actual content sits under a few lines.
    maxHeight: cardProgress.value * 240,
  }));

  if (tags.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.1}>
        WHY THIS FITS
      </Text>

      <FlatList
        data={tags}
        keyExtractor={(t) => t.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        renderItem={({ item }) => {
          const Icon = item.Icon;
          const active = item.id === activeId;
          return (
            <Pressable
              onPress={() => {
                hapt.select();
                setActiveId(active ? null : item.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.pill,
                active && styles.pillActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon
                size={14}
                color={active ? palette.bg : palette.ink}
                weight="duotone"
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.pillLabel,
                  active && { color: palette.bg },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <Animated.View style={[styles.card, cardStyle]} pointerEvents="none">
        <Text style={styles.cardText} maxFontSizeMultiplier={1.2}>
          {activeTag ? activeTag.explanation : ''}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
  },
  kicker: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(26,22,20,0.6)',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  pill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: palette.sand,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: palette.clay,
  },
  pillLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: palette.bg,
    borderRadius: 16,
    overflow: 'hidden',
    // Warm paper shadow
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardText: {
    fontFamily: 'InstrumentSerif-Italic',
    fontSize: 16,
    lineHeight: 16 * 1.4,
    color: 'rgba(26,22,20,0.85)',
    padding: 16,
  },
});
